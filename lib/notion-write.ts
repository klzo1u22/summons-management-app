import { Client } from '@notionhq/client';
import db from './db';

const notion = new Client({
    auth: process.env.NOTION_API_KEY,
});

const CASES_DATABASE_ID = process.env.NOTION_CASES_DATABASE_ID || '';
const SUMMONS_DATABASE_ID = process.env.NOTION_SUMMONS_DATABASE_ID || '';

export async function pushToNotion(type: 'case' | 'summons', id: string) {
    console.log(`Pushing ${type} ${id} to Notion...`);

    try {
        let result;
        if (type === 'case') {
            result = await pushCase(id);
        } else {
            result = await pushSummons(id);
        }

        const targetId = result && result.newId ? result.newId : id;
        const now = new Date().toISOString();

        if (type === 'case') {
            await db.execute({
                sql: 'UPDATE cases SET synced_at = ? WHERE id = ?',
                args: [now, targetId]
            });
        } else {
            await db.execute({
                sql: 'UPDATE summons SET synced_at = ? WHERE id = ?',
                args: [now, targetId]
            });
        }

        console.log(`Successfully pushed ${type} ${targetId} to Notion.`);
        return { success: true };
    } catch (error: any) {
        console.error(`Failed to push ${type} ${id}:`, error.body || error.message);
        return { success: false, error: error.message };
    }
}

export async function archiveInNotion(id: string) {
    console.log(`Archiving page ${id} in Notion...`);
    try {
        await notion.pages.update({
            page_id: id,
            archived: true,
        });
        console.log(`Successfully archived page ${id}.`);
        return { success: true };
    } catch (error: any) {
        console.error(`Failed to archive page ${id}:`, error.body || error.message);
        return { success: false, error: error.message };
    }
}

export async function pushCase(id: string): Promise<{ newId?: string } | void> {
    let row;
    for (let i = 0; i < 3; i++) {
        const rs = await db.execute({
            sql: 'SELECT * FROM cases WHERE id = ?',
            args: [id]
        });
        row = rs.rows[0] as any;
        if (row) break;
        await new Promise(r => setTimeout(r, 500 * (i + 1)));
    }

    if (!row) throw new Error(`Case ${id} not found locally after retries.`);

    const assignedOfficer = JSON.parse(row.assigned_officer || '[]');
    const activity = JSON.parse(row.activity || '[]');

    const properties: any = {
        'Name': { title: [{ text: { content: row.name } }] },
        'ECIR NO.': { rich_text: [{ text: { content: row.ecir_no || '' } }] },
        'Status': { select: { name: row.status } },
        'PAO Amount': { rich_text: [{ text: { content: row.pao_amount || '' } }] },
        'POC in Cr': { rich_text: [{ text: { content: row.poc_in_cr || '' } }] },
    };

    if (assignedOfficer.length > 0) {
        properties['Assigned officer'] = { multi_select: assignedOfficer.map((n: string) => ({ name: n })) };
    }
    if (activity.length > 0) {
        properties['Activity'] = { multi_select: activity.map((n: string) => ({ name: n })) };
    }

    if (row.date_of_ecir) properties['Date of ECIR'] = { date: { start: row.date_of_ecir } };
    if (row.pao_date) properties['PAO Date'] = { date: { start: row.pao_date } };
    if (row.date_of_pc_filed) properties['Date of PC Filed'] = { date: { start: row.date_of_pc_filed } };
    if (row.court_cognizance_date) properties['Court Cognizance Date'] = { date: { start: row.court_cognizance_date } };

    properties['Active'] = { checkbox: !!row.active };
    properties['Whether PC Filed'] = { checkbox: !!row.whether_pc_filed };

    const isUuid = id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

    try {
        if (!isUuid) throw { code: 'object_not_found', status: 404 };
        await notion.pages.update({ page_id: id, properties });
    } catch (e: any) {
        if (e.code === 'object_not_found' || e.status === 400 || e.status === 404) {
            const response = await notion.pages.create({
                parent: { database_id: CASES_DATABASE_ID },
                properties
            });

            const newId = response.id;
            console.log(`Created new Case in Notion. Updating local ID from ${id} to ${newId}`);

            const caseData = { ...row, id: newId };

            await db.batch([
                {
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
                    args: caseData
                },
                {
                    sql: 'UPDATE summons SET case_id = ? WHERE case_id = ?',
                    args: [newId, id]
                },
                {
                    sql: 'DELETE FROM cases WHERE id = ?',
                    args: [id]
                }
            ], "write");

            return { newId };
        } else {
            throw e;
        }
    }
}

export async function pushSummons(id: string): Promise<{ newId?: string } | void> {
    let row;
    for (let i = 0; i < 3; i++) {
        const rs = await db.execute({
            sql: 'SELECT * FROM summons WHERE id = ?',
            args: [id]
        });
        row = rs.rows[0] as any;
        if (row) break;
        await new Promise(r => setTimeout(r, 500 * (i + 1))); // Wait 500ms, 1000ms
    }

    if (!row) throw new Error(`Summons ${id} not found locally after retries.`);

    const modeOfService = JSON.parse(row.mode_of_service || '[]');
    const purpose = JSON.parse(row.purpose || '[]');

    const properties: any = {
        'Name of Person': { title: [{ text: { content: row.person_name } }] },
        'Person Role': row.person_role ? { select: { name: row.person_role } } : undefined,
        'Priority': row.priority ? { select: { name: row.priority } } : undefined,
        'Tone Required': row.tone ? { select: { name: row.tone } } : undefined,
        'Summons response': row.summons_response ? { select: { name: row.summons_response } } : undefined,
        'Statement Status': row.statement_status ? { select: { name: row.statement_status } } : undefined,
    };

    if (row.case_id && row.case_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        properties['Case '] = { relation: [{ id: row.case_id }] };
    }

    if (row.issue_date) properties['Date of Summon Issue'] = { date: { start: row.issue_date } };
    if (row.appearance_date) {
        const start = row.appearance_time ? `${row.appearance_date}T${row.appearance_time}:00.000Z` : row.appearance_date;
        properties['Scheduled Appearance Date'] = { date: { start } };
    }
    if (row.rescheduled_date) properties['Rescheduled Date'] = { date: { start: row.rescheduled_date } };
    if (row.date_of_1st_statement) properties['Date of 1st Statement'] = { date: { start: row.date_of_1st_statement } };
    if (row.date_of_2nd_statement) properties['Date of 2nd Statement'] = { date: { start: row.date_of_2nd_statement } };
    if (row.date_of_3rd_statement) properties['Date of 3rd Statement'] = { date: { start: row.date_of_3rd_statement } };

    if (modeOfService.length > 0) properties['Mode of Service'] = { multi_select: modeOfService.map((n: string) => ({ name: n })) };
    if (purpose.length > 0) properties['Purpose of Summons'] = { multi_select: purpose.map((n: string) => ({ name: n })) };

    properties['Summon issued'] = { checkbox: !!row.is_issued };
    properties['SummonServed'] = { checkbox: !!row.is_served };
    properties['Reschedule request received'] = { checkbox: !!row.requests_reschedule };
    properties['Appeared ongoing staement'] = { checkbox: !!row.statement_ongoing };
    properties['Statement Completed'] = { checkbox: !!row.statement_recorded };
    properties['Rescheduled date communicated'] = { checkbox: !!row.rescheduled_date_communicated };
    properties['Followup required'] = { checkbox: !!row.followup_required };

    if (row.previous_summon_id && row.previous_summon_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        properties['Previous Summon'] = { relation: [{ id: row.previous_summon_id }] };
    }

    Object.keys(properties).forEach(key => { if (properties[key] === undefined) delete properties[key]; });

    const isUuid = id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

    try {
        if (!isUuid) throw { code: 'object_not_found', status: 404 };
        await notion.pages.update({ page_id: id, properties });
    } catch (e: any) {
        if (e.code === 'object_not_found' || e.status === 400 || e.status === 404) {
            let response;
            try {
                response = await notion.pages.create({
                    parent: { database_id: SUMMONS_DATABASE_ID },
                    properties
                });
            } catch (createError: any) {
                // If creation failed potentially due to invalid relation (e.g. case not synced yet), try without relation
                if (properties['Case '] || properties['Previous Summon']) {
                    console.warn(`Failed to create Summons with relations, retrying without relations. Error: ${createError.message}`);
                    const { 'Case ': _, 'Previous Summon': __, ...propsWithoutRelations } = properties;
                    response = await notion.pages.create({
                        parent: { database_id: SUMMONS_DATABASE_ID },
                        properties: propsWithoutRelations
                    });
                } else {
                    throw createError;
                }
            }

            const newId = response.id;
            console.log(`Created new Summons in Notion. Updating local ID from ${id} to ${newId}`);

            const summonsData = { ...row, id: newId };
            await db.batch([
                {
                    sql: `
                        INSERT INTO summons (
                            id, case_id, person_name, person_role, contact_number, email, 
                            priority, tone, purpose, notes, issue_date, served_date, 
                            mode_of_service, appearance_date, appearance_time, 
                            rescheduled_date, rescheduled_date_communicated, 
                            statement_status, date_of_1st_statement, date_of_2nd_statement, 
                            date_of_3rd_statement, followup_required, summons_response, 
                            status, is_issued, is_served, requests_reschedule, 
                            statement_ongoing, statement_recorded, previous_summon_id, created_at, synced_at
                        ) VALUES (
                            :id, :case_id, :person_name, :person_role, :contact_number, :email, 
                            :priority, :tone, :purpose, :notes, :issue_date, :served_date, 
                            :mode_of_service, :appearance_date, :appearance_time, 
                            :rescheduled_date, :rescheduled_date_communicated, 
                            :statement_status, :date_of_1st_statement, :date_of_2nd_statement, 
                            :date_of_3rd_statement, :followup_required, :summons_response, 
                            :status, :is_issued, :is_served, :requests_reschedule, 
                            :statement_ongoing, :statement_recorded, :previous_summon_id, :created_at, :synced_at
                        )
                    `,
                    args: summonsData
                },
                {
                    sql: 'DELETE FROM summons WHERE id = ?',
                    args: [id]
                },
                {
                    sql: 'UPDATE activity_logs SET summons_id = ? WHERE summons_id = ?',
                    args: [newId, id]
                }
            ], "write");

            return { newId };
        } else {
            throw e;
        }
    }
}
