import db from './db';
import { DATABASE_ID } from './notion';
import { Summons } from './types';
import { inferStatusFromCheckboxes, SummonsStatus } from './summons-state-machine';

const NOTION_API_KEY = process.env.NOTION_API_KEY || '';

export interface SyncResult {
    success: boolean;
    added: number;
    updated: number;
    errors: string[];
}

export async function syncSummons(): Promise<SyncResult> {
    try {
        const response = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
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
        const rs = await db.execute('SELECT id, synced_at FROM summons');
        const existingRows = rs.rows as any[];
        const existingIds = new Map(existingRows.map(row => [row.id, row.synced_at]));
        const syncedIds = new Set<string>();

        const toInsert: any[] = [];
        const toUpdate: any[] = [];

        for (const page of results) {
            const id = page.id;
            syncedIds.add(id);
            const props = (page as any).properties;

            try {
                const getTitle = (key: string) => props[key]?.title?.[0]?.plain_text || 'Unknown Name';
                const getText = (key: string) => props[key]?.rich_text?.[0]?.plain_text || '';
                const getDate = (key: string) => props[key]?.date?.start || null;
                const getSelect = (key: string) => props[key]?.select?.name || null;
                const getPhone = (key: string) => props[key]?.phone_number || '';
                const getEmail = (key: string) => props[key]?.email || '';
                const getCheckbox = (key: string) => props[key]?.checkbox ?? false;
                const getMultiSelectArray = (key: string) => props[key]?.multi_select?.map((o: any) => o.name) || [];
                const getRelation = (key: string) => props[key]?.relation?.[0]?.id || null;

                const nextDate = getDate('Next Date Fixed') || getDate('Appearance Date') || getDate('Scheduled Appearance Date');
                const issueDate = getDate('Date of Summon Issue') || getDate('Issue Date');

                const appearanceDateRaw = nextDate;
                const appearanceDate = appearanceDateRaw?.split('T')[0] || null;
                const appearanceTime = appearanceDateRaw?.includes('T') ? appearanceDateRaw.split('T')[1].substring(0, 5) : null;
                const rescheduledDate = getDate('Rescheduled Date')?.split('T')[0] || null;

                const date1st = getDate('Date of 1st Statement') || getDate('1st Statement Date');
                const date2nd = getDate('Date of 2nd Statement') || getDate('2nd Statement Date');
                const date3rd = getDate('Date of 3rd Statement') || getDate('3rd Statement Date');

                const isIssued = getCheckbox('Summon issued');
                const isServed = getCheckbox('SummonServed');
                const statementRecorded = getCheckbox('Statement Completed');
                const requestsReschedule = getCheckbox('Reschedule request received');
                const statementOngoing = getCheckbox('Appeared ongoing staement');
                const rescheduledDateCommunicated = getCheckbox('Rescheduled date communicated');
                const followupRequired = getCheckbox('Followup required');

                const status = inferStatusFromCheckboxes({
                    is_issued: isIssued,
                    is_served: isServed,
                    requests_reschedule: requestsReschedule,
                    statement_ongoing: statementOngoing,
                    statement_recorded: statementRecorded,
                    rescheduled_date: rescheduledDate,
                });

                const summonsParams = {
                    id: id,
                    case_id: props['Case ']?.relation?.[0]?.id || props['Case']?.relation?.[0]?.id || 'Pending Link',
                    person_name: getTitle('Name of Person') || getTitle('Name'),
                    person_role: getSelect('Person Role') || 'Witness',
                    contact_number: getPhone('Contact Number') || getPhone('Phone') || getText('Contact'),
                    email: getEmail('Email') || null,
                    issue_date: issueDate,
                    appearance_date: appearanceDate,
                    rescheduled_date: rescheduledDate,
                    appearance_time: appearanceTime,
                    status: status,
                    statement_status: getSelect('Statement Status') || getSelect('Status (Statement)') || '',
                    priority: getSelect('Priority') || 'Medium',
                    mode_of_service: JSON.stringify(getMultiSelectArray('Mode of Service')),
                    tone: getSelect('Tone') || '',
                    purpose: JSON.stringify(getMultiSelectArray('Purpose')),
                    notes: getText('Notes'),
                    is_issued: isIssued ? 1 : 0,
                    is_served: isServed ? 1 : 0,
                    requests_reschedule: requestsReschedule ? 1 : 0,
                    statement_ongoing: statementOngoing ? 1 : 0,
                    statement_recorded: statementRecorded ? 1 : 0,
                    summons_response: getSelect('Summons response') || getSelect('Summons Response') || '',
                    date_of_1st_statement: date1st,
                    date_of_2nd_statement: date2nd,
                    date_of_3rd_statement: date3rd,
                    rescheduled_date_communicated: rescheduledDateCommunicated ? 1 : 0,
                    followup_required: followupRequired ? 1 : 0,
                    previous_summon_id: getRelation('Previous Summon') || getRelation('Previous Summons') || '',
                    created_at: page.created_time,
                    synced_at: new Date().toISOString()
                };

                if (existingIds.has(id)) {
                    toUpdate.push(summonsParams);
                    updatedCount++;
                } else {
                    toInsert.push(summonsParams);
                    addedCount++;
                }
            } catch (err: any) {
                console.error(`Error processing page ${id}:`, err);
                errors.push(`Failed to process page ${id}: ${err.message}`);
            }
        }

        const statements: any[] = [];

        toInsert.forEach(s => {
            statements.push({
                sql: `
                    INSERT INTO summons (
                        id, case_id, person_name, person_role, contact_number, email, 
                        priority, tone, purpose, notes, issue_date, served_date, 
                        mode_of_service, appearance_date, appearance_time, 
                        rescheduled_date, rescheduled_date_communicated, 
                        statement_status, date_of_1st_statement, date_of_2nd_statement, 
                        date_of_3rd_statement, followup_required, summons_response, 
                        status, is_issued, is_served, requests_reschedule, 
                        statement_ongoing, statement_recorded, previous_summon_id, 
                        created_at, synced_at
                    ) VALUES (
                        :id, :case_id, :person_name, :person_role, :contact_number, :email, 
                        :priority, :tone, :purpose, :notes, :issue_date, :served_date, 
                        :mode_of_service, :appearance_date, :appearance_time, 
                        :rescheduled_date, :rescheduled_date_communicated, 
                        :statement_status, :date_of_1st_statement, :date_of_2nd_statement, 
                        :date_of_3rd_statement, :followup_required, :summons_response, 
                        :status, :is_issued, :is_served, :requests_reschedule, 
                        :statement_ongoing, :statement_recorded, :previous_summon_id, 
                        :created_at, :synced_at
                    )
                `,
                args: s
            });
        });

        toUpdate.forEach(s => {
            statements.push({
                sql: `
                    UPDATE summons SET 
                        case_id = :case_id, person_name = :person_name, person_role = :person_role, 
                        contact_number = :contact_number, email = :email, issue_date = :issue_date, 
                        appearance_date = :appearance_date, rescheduled_date = :rescheduled_date, 
                        status = :status, statement_status = :statement_status, priority = :priority, 
                        tone = :tone, summons_response = :summons_response, is_issued = :is_issued, 
                        is_served = :is_served, statement_recorded = :statement_recorded, 
                        requests_reschedule = :requests_reschedule, statement_ongoing = :statement_ongoing, 
                        date_of_1st_statement = :date_of_1st_statement, 
                        date_of_2nd_statement = :date_of_2nd_statement, 
                        date_of_3rd_statement = :date_of_3rd_statement, 
                        rescheduled_date_communicated = :rescheduled_date_communicated, 
                        followup_required = :followup_required, 
                        previous_summon_id = :previous_summon_id, synced_at = :synced_at
                    WHERE id = :id
                `,
                args: s
            });
        });

        const toDelete = Array.from(existingIds.keys()).filter(id => !syncedIds.has(id));
        toDelete.forEach(id => {
            statements.push({
                sql: 'DELETE FROM summons WHERE id = ?',
                args: [id]
            });
        });

        if (statements.length > 0) {
            await db.batch(statements, "write");
        }

        return { success: true, added: addedCount, updated: updatedCount, errors };

    } catch (error: any) {
        console.error('Notion Sync Error:', error);
        return { success: false, added: 0, updated: 0, errors: [error.message] };
    }
}
