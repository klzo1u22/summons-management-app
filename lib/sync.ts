import { db } from './firebase-admin';
import { DATABASE_ID } from './notion';
import { Summons } from './types';
import { inferStatusFromCheckboxes, SummonsStatus } from './summons-state-machine';
import { Timestamp } from 'firebase-admin/firestore';

const NOTION_API_KEY = process.env.NOTION_API_KEY || '';

export interface SyncResult {
    success: boolean;
    added: number;
    updated: number;
    errors: string[];
}

export async function syncSummons(): Promise<SyncResult> {
    try {
        // Use raw fetch because SDK query method is missing/broken in this env
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

        // Check existing IDs in Firestore
        // We fetch minimal data to check existence and synced_at status
        const summonsSnap = await db.collection('summons').select('synced_at').get();
        const existingIds = new Set(summonsSnap.docs.map(doc => doc.id));
        const syncedIds = new Set<string>();

        const batch = db.batch();

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
                const hasMultiSelect = (key: string, value: string) => props[key]?.multi_select?.some((o: any) => o.name === value);
                const getMultiSelectArray = (key: string) => props[key]?.multi_select?.map((o: any) => o.name) || [];
                const getRelation = (key: string) => props[key]?.relation?.[0]?.id || null;

                // Mappings - try multiple property name variants
                const nextDate = getDate('Next Date Fixed') || getDate('Appearance Date') || getDate('Scheduled Appearance Date');
                const issueDate = getDate('Date of Summon Issue') || getDate('Issue Date');

                const appearanceDateRaw = nextDate;
                const appearanceDate = appearanceDateRaw?.split('T')[0] || null;
                const appearanceTime = appearanceDateRaw?.includes('T') ? appearanceDateRaw.split('T')[1].substring(0, 5) : null;
                const rescheduledDate = getDate('Rescheduled Date')?.split('T')[0] || null;

                // Statement dates
                const date1st = getDate('Date of 1st Statement') || getDate('1st Statement Date');
                const date2nd = getDate('Date of 2nd Statement') || getDate('2nd Statement Date');
                const date3rd = getDate('Date of 3rd Statement') || getDate('3rd Statement Date');

                // Status Logic (Verified Notion Schema)
                const isIssued = getCheckbox('Summon issued');
                const isServed = getCheckbox('SummonServed');
                const statementRecorded = getCheckbox('Statement Completed');
                const requestsReschedule = getCheckbox('Reschedule request received');
                const statementOngoing = getCheckbox('Appeared ongoing staement');
                const rescheduledDateCommunicated = getCheckbox('Rescheduled date communicated');
                const followupRequired = getCheckbox('Followup required');

                // Summons response 
                const summonsResponse = getSelect('Summons response') || getSelect('Summons Response');

                // Infer status using state machine
                const status: SummonsStatus = inferStatusFromCheckboxes({
                    is_issued: isIssued,
                    is_served: isServed,
                    requests_reschedule: requestsReschedule,
                    statement_ongoing: statementOngoing,
                    statement_recorded: statementRecorded,
                    rescheduled_date: rescheduledDate,
                });

                // Statement status
                const statementStatus = getSelect('Statement Status') || getSelect('Status (Statement)') || '';

                // Previous summon relation
                const previousSummonId = getRelation('Previous Summon') || getRelation('Previous Summons');

                const summonsData: Summons = {
                    id: id,
                    case_id: props['Case ']?.relation?.[0]?.id || props['Case']?.relation?.[0]?.id || 'Pending Link',
                    person_name: getTitle('Name of Person') || getTitle('Name'),
                    person_role: getSelect('Person Role') || 'Witness',
                    contact_number: getPhone('Contact Number') || getPhone('Phone') || getText('Contact'),
                    email: getEmail('Email') || undefined,
                    issue_date: issueDate,
                    appearance_date: appearanceDate,
                    rescheduled_date: rescheduledDate,
                    appearance_time: appearanceTime,
                    status: status,
                    statement_status: statementStatus,
                    priority: getSelect('Priority') || 'Medium',
                    mode_of_service: getMultiSelectArray('Mode of Service'),
                    tone: getSelect('Tone') || '',
                    purpose: getMultiSelectArray('Purpose'),
                    notes: getText('Notes'),
                    is_issued: isIssued ? true : false,
                    is_served: isServed ? true : false,
                    requests_reschedule: requestsReschedule ? true : false,
                    statement_ongoing: statementOngoing ? true : false,
                    statement_recorded: statementRecorded ? true : false,
                    summons_response: summonsResponse || '',
                    date_of_1st_statement: date1st,
                    date_of_2nd_statement: date2nd,
                    date_of_3rd_statement: date3rd,
                    rescheduled_date_communicated: rescheduledDateCommunicated ? true : false,
                    followup_required: followupRequired ? true : false,
                    previous_summon_id: previousSummonId || '',
                    created_at: page.created_time,
                    // Defaults for fields not in Notion Sync mapped yet
                    officer_assigned_id: '',
                };

                const commonData = {
                    ...summonsData,
                    is_issued: summonsData.is_issued ? 1 : 0,
                    is_served: summonsData.is_served ? 1 : 0,
                    statement_recorded: summonsData.statement_recorded ? 1 : 0,
                    requests_reschedule: summonsData.requests_reschedule ? 1 : 0,
                    statement_ongoing: summonsData.statement_ongoing ? 1 : 0,
                    rescheduled_date_communicated: summonsData.rescheduled_date_communicated ? 1 : 0,
                    followup_required: summonsData.followup_required ? 1 : 0,
                    synced_at: new Date().toISOString()
                };

                const docRef = db.collection('summons').doc(id);

                if (existingIds.has(id)) {
                    // Update only specific fields (mirroring SQLite behavior)
                    // mode_of_service, purpose, notes are NOT updated
                    const updateData = {
                        case_id: commonData.case_id,
                        person_name: commonData.person_name,
                        person_role: commonData.person_role,
                        contact_number: commonData.contact_number,
                        email: commonData.email,
                        issue_date: commonData.issue_date,
                        appearance_date: commonData.appearance_date,
                        rescheduled_date: commonData.rescheduled_date,
                        status: commonData.status,
                        statement_status: commonData.statement_status,
                        priority: commonData.priority,
                        tone: commonData.tone,
                        summons_response: commonData.summons_response,
                        is_issued: commonData.is_issued,
                        is_served: commonData.is_served,
                        statement_recorded: commonData.statement_recorded,
                        requests_reschedule: commonData.requests_reschedule,
                        statement_ongoing: commonData.statement_ongoing,
                        date_of_1st_statement: commonData.date_of_1st_statement,
                        date_of_2nd_statement: commonData.date_of_2nd_statement,
                        date_of_3rd_statement: commonData.date_of_3rd_statement,
                        rescheduled_date_communicated: commonData.rescheduled_date_communicated,
                        followup_required: commonData.followup_required,
                        previous_summon_id: commonData.previous_summon_id,
                        synced_at: commonData.synced_at
                    };
                    // Cleaning undefined
                    const cleanUpdate = JSON.parse(JSON.stringify(updateData));
                    batch.update(docRef, cleanUpdate);
                    updatedCount++;
                } else {
                    // Insert - use all data
                    const insertData = {
                        ...commonData,
                        mode_of_service: commonData.mode_of_service, // Array is supported in Firestore
                        purpose: commonData.purpose // Array is supported in Firestore
                    };
                    const cleanInsert = JSON.parse(JSON.stringify(insertData));
                    batch.set(docRef, cleanInsert);
                    addedCount++;
                }

            } catch (err: any) {
                console.error(`Error processing page ${id}:`, err);
                errors.push(`Failed to process page ${id}: ${err.message}`);
            }
        }

        // Cleanup: remove local summons that were synced but are now missing from Notion
        const toDelete: string[] = [];
        summonsSnap.docs.forEach(doc => {
            const data = doc.data();
            if (data.synced_at && !syncedIds.has(doc.id)) {
                toDelete.push(doc.id);
            }
        });

        if (toDelete.length > 0) {
            console.log(`Cleaning up ${toDelete.length} summons removed from Notion.`);
            toDelete.forEach(id => {
                batch.delete(db.collection('summons').doc(id));
            });
        }

        await batch.commit();

        return { success: true, added: addedCount, updated: updatedCount, errors };

    } catch (error: any) {
        console.error('Notion Sync Error:', error);
        return { success: false, added: 0, updated: 0, errors: [error.message] };
    }
}
