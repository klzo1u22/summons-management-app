import db from './db';
import { CASES_DATABASE_ID } from './notion';

const NOTION_API_KEY = process.env.NOTION_API_KEY || '';

export interface SyncResult {
    success: boolean;
    added: number;
    updated: number;
    errors: string[];
}

export async function syncCases(): Promise<SyncResult> {
    console.log("Starting Case Sync...");

    if (!CASES_DATABASE_ID || !NOTION_API_KEY) {
        console.error("Missing Notion configuration for cases sync");
        return { success: false, added: 0, updated: 0, errors: ["Missing configuration"] };
    }

    try {
        const response = await fetch(`https://api.notion.com/v1/databases/${CASES_DATABASE_ID}/query`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${NOTION_API_KEY}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
        });

        if (!response.ok) {
            throw new Error(`Notion API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const results = data.results;

        let addedCount = 0;
        let updatedCount = 0;
        const errors: string[] = [];

        // Check existing IDs in SQLite
        const rs = await db.execute('SELECT id, synced_at FROM cases');
        const existingCases = rs.rows as any[];
        const existingIds = new Map(existingCases.map(c => [c.id, c.synced_at]));
        const syncedIds = new Set<string>();

        const toInsert: any[] = [];
        const toUpdate: any[] = [];

        for (const page of results) {
            const id = page.id;
            syncedIds.add(id);
            const props = (page as any).properties;

            try {
                const getTitle = (key: string) => props[key]?.title?.[0]?.plain_text;
                const getText = (key: string) => props[key]?.rich_text?.[0]?.plain_text || '';
                const getDate = (key: string) => props[key]?.date?.start || null;
                const getSelect = (key: string) => props[key]?.select?.name || null;
                const getMultiSelectArray = (key: string) => props[key]?.multi_select?.map((o: any) => o.name) || [];
                const getCheckbox = (key: string) => props[key]?.checkbox ?? true; // Default Active to true if missing?

                const caseParams = {
                    id: id,
                    name: getTitle('Case Name') || getTitle('Name') || 'Unknown Case',
                    ecir_no: getText('ECIR No') || getText('ECIR Number'),
                    date_of_ecir: getDate('Date of ECIR'),
                    status: getSelect('Status'),
                    assigned_officer: JSON.stringify(getMultiSelectArray('Assigned Officer')),
                    activity: JSON.stringify(getMultiSelectArray('Activity')),
                    pao_amount: getText('PAO Amount'),
                    pao_date: getDate('PAO Date'),
                    active: getCheckbox('Active') ? 1 : 0,
                    whether_pc_filed: getCheckbox('Whether PC Filed') ? 1 : 0,
                    date_of_pc_filed: getDate('Date of PC Filed'),
                    court_cognizance_date: getDate('Court Cognizance Date'),
                    poc_in_cr: getText('POC in Cr'),
                    created_at: page.created_time,
                    last_edited: page.last_edited_time,
                    synced_at: new Date().toISOString()
                };

                if (existingIds.has(id)) {
                    // Strict subset for UPDATE (16 params)
                    const { created_at, ...updateParams } = caseParams;
                    toUpdate.push(updateParams);
                    updatedCount++;
                } else {
                    toInsert.push(caseParams);
                    addedCount++;
                }
            } catch (err: any) {
                console.error(`Error processing case ${id}:`, err);
                errors.push(`Failed to process case ${id}: ${err.message}`);
            }
        }

        const statements: any[] = [];

        toInsert.forEach(c => {
            statements.push({
                sql: `
                INSERT INTO cases (
                    id, name, ecir_no, date_of_ecir, status, assigned_officer, 
                    activity, pao_amount, pao_date, active, whether_pc_filed, 
                    date_of_pc_filed, court_cognizance_date, poc_in_cr, 
                    created_at, last_edited, synced_at
                ) VALUES (
                    :id, :name, :ecir_no, :date_of_ecir, :status, :assigned_officer, 
                    :activity, :pao_amount, :pao_date, :active, :whether_pc_filed, 
                    :date_of_pc_filed, :court_cognizance_date, :poc_in_cr, 
                    :created_at, :last_edited, :synced_at
                )
                `,
                args: c
            });
        });

        toUpdate.forEach(c => {
            statements.push({
                sql: `
                UPDATE cases SET 
                    name = :name, ecir_no = :ecir_no, date_of_ecir = :date_of_ecir, 
                    status = :status, assigned_officer = :assigned_officer, 
                    activity = :activity, pao_amount = :pao_amount, pao_date = :pao_date, 
                    active = :active, whether_pc_filed = :whether_pc_filed, 
                    date_of_pc_filed = :date_of_pc_filed, 
                    court_cognizance_date = :court_cognizance_date, 
                    poc_in_cr = :poc_in_cr, last_edited = :last_edited, 
                    synced_at = :synced_at
                WHERE id = :id
                `,
                args: c
            });
        });

        // Cleanup: remove local cases that were synced but are now missing from Notion
        const toDelete = Array.from(existingIds.keys()).filter(id => !syncedIds.has(id));
        if (toDelete.length > 0) {
            console.log(`Cleaning up ${toDelete.length} cases removed from Notion.`);
            toDelete.forEach(id => {
                statements.push({
                    sql: 'DELETE FROM cases WHERE id = ?',
                    args: [id]
                });
            });
        }

        if (statements.length > 0) {
            await db.batch(statements, "write");
        }

        console.log(`Successfully synced ${addedCount} new cases and updated ${updatedCount} cases.`);
        return { success: true, added: addedCount, updated: updatedCount, errors };

    } catch (error: any) {
        console.error("Case Sync Failed:", error.message);
        return { success: false, added: 0, updated: 0, errors: [error.message] };
    }
}
