import { Client } from '@notionhq/client';
import { db } from './firebase-admin';

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

        // If ID was updated during push (swapped to Notion UUID), use the new ID for synced_at update
        const targetId = result && result.newId ? result.newId : id;

        // Update local synced_at timestamp
        const now = new Date().toISOString();
        const docRef = db.collection(type === 'case' ? 'cases' : 'summons').doc(targetId);

        // Use set with merge to be safe, though update is fine if doc exists (which it should)
        await docRef.set({ synced_at: now }, { merge: true });

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
    const docRef = db.collection('cases').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) throw new Error(`Case ${id} not found locally.`);
    const row = docSnap.data() as any;

    // Fields are already arrays in Firestore
    const assignedOfficer = row.assigned_officer || [];
    const activity = row.activity || [];

    const properties: any = {
        'Name': { title: [{ text: { content: row.name } }] },
        'ECIR NO.': { rich_text: [{ text: { content: row.ecir_no || '' } }] },
        'Status': { select: { name: row.status } },
        'PAO Amount': { rich_text: [{ text: { content: row.pao_amount || '' } }] },
        'POC in Cr': { rich_text: [{ text: { content: row.poc_in_cr || '' } }] },
    };

    // Multi-select fields
    if (assignedOfficer.length > 0) {
        properties['Assigned officer'] = { multi_select: assignedOfficer.map((n: string) => ({ name: n })) };
    }
    if (activity.length > 0) {
        properties['Activity'] = { multi_select: activity.map((n: string) => ({ name: n })) };
    }

    // Date fields
    if (row.date_of_ecir) {
        properties['Date of ECIR'] = { date: { start: row.date_of_ecir } };
    }
    if (row.pao_date) {
        properties['PAO Date'] = { date: { start: row.pao_date } };
    }
    if (row.date_of_pc_filed) {
        properties['Date of PC Filed'] = { date: { start: row.date_of_pc_filed } };
    }
    if (row.court_cognizance_date) {
        properties['Court Cognizance Date'] = { date: { start: row.court_cognizance_date } };
    }

    // Checkbox fields
    properties['Active'] = { checkbox: !!row.active };
    properties['Whether PC Filed'] = { checkbox: !!row.whether_pc_filed };

    const isUuid = id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

    try {
        if (!isUuid) {
            throw { code: 'object_not_found' };
        }
        await notion.pages.update({
            page_id: id,
            properties: properties
        });
    } catch (e: any) {
        if (e.code === 'object_not_found' || e.status === 400 || e.status === 404) {
            const response = await notion.pages.create({
                parent: { database_id: CASES_DATABASE_ID },
                properties: properties
            });

            const newId = response.id;
            console.log(`Created new Case in Notion. Updating local ID from ${id} to ${newId}`);

            await db.runTransaction(async (t) => {
                // Get fresh data
                const oldDoc = await t.get(docRef);
                if (!oldDoc.exists) throw new Error("Document disappeared!");
                const oldData = oldDoc.data()!;

                // Get related summons that need updating
                const summonsQuery = db.collection('summons').where('case_id', '==', id);
                const relatedSummons = await t.get(summonsQuery);

                // Create new doc
                const newDocRef = db.collection('cases').doc(newId);
                t.set(newDocRef, { ...oldData, id: newId });

                // Delete old doc
                t.delete(docRef);

                // Update related summons
                relatedSummons.docs.forEach(summonsDoc => {
                    t.update(summonsDoc.ref, { case_id: newId });
                });
            });

            return { newId };
        } else {
            throw e;
        }
    }
}

export async function pushSummons(id: string): Promise<{ newId?: string } | void> {
    const docRef = db.collection('summons').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) throw new Error(`Summons ${id} not found locally.`);
    const row = docSnap.data() as any;

    // Direct array access
    const modeOfService = row.mode_of_service || [];
    const purpose = row.purpose || [];

    const properties: any = {
        'Name of Person': { title: [{ text: { content: row.person_name } }] },
        'Person Role': row.person_role ? { select: { name: row.person_role } } : undefined,
        'Priority': row.priority ? { select: { name: row.priority } } : undefined,
        'Tone Required': row.tone ? { select: { name: row.tone } } : undefined,
        'Summons response': row.summons_response ? { select: { name: row.summons_response } } : undefined,
        'Statement Status': row.statement_status ? { select: { name: row.statement_status } } : undefined,
    };

    // Case relation
    if (row.case_id) {
        // Warning: If case_id is not a valid UUID (not synced yet), this might fail in Notion if Notion expects a UUID relation
        // However, we usually sync Case first or id is already UUID.
        // If it's a pending link (e.g. "Pending Link"), we skip.
        if (row.case_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            properties['Case '] = { relation: [{ id: row.case_id }] };
        }
    }

    // Date fields
    if (row.issue_date) {
        properties['Date of Summon Issue'] = { date: { start: row.issue_date } };
    }

    if (row.appearance_date) {
        const start = row.appearance_time
            ? `${row.appearance_date}T${row.appearance_time}:00.000Z`
            : row.appearance_date;
        properties['Scheduled Appearance Date'] = { date: { start: start } };
    }

    if (row.rescheduled_date) {
        properties['Rescheduled Date'] = { date: { start: row.rescheduled_date } };
    }

    // Statement dates
    if (row.date_of_1st_statement) {
        properties['Date of 1st Statement'] = { date: { start: row.date_of_1st_statement } };
    }
    if (row.date_of_2nd_statement) {
        properties['Date of 2nd Statement'] = { date: { start: row.date_of_2nd_statement } };
    }
    if (row.date_of_3rd_statement) {
        properties['Date of 3rd Statement'] = { date: { start: row.date_of_3rd_statement } };
    }

    // Multi-select fields
    if (modeOfService.length > 0) {
        properties['Mode of Service'] = { multi_select: modeOfService.map((n: string) => ({ name: n })) };
    }
    if (purpose.length > 0) {
        properties['Purpose of Summons'] = { multi_select: purpose.map((n: string) => ({ name: n })) };
    }

    // Checkbox fields
    properties['Summon issued'] = { checkbox: row.is_issued ? true : false };
    properties['SummonServed'] = { checkbox: row.is_served ? true : false };
    properties['Reschedule request received'] = { checkbox: row.requests_reschedule ? true : false };
    properties['Appeared ongoing staement'] = { checkbox: row.statement_ongoing ? true : false };
    properties['Statement Completed'] = { checkbox: row.statement_recorded ? true : false };
    properties['Rescheduled date communicated'] = { checkbox: row.rescheduled_date_communicated ? true : false };
    properties['Followup required'] = { checkbox: row.followup_required ? true : false };

    // Previous Summon relation
    if (row.previous_summon_id) {
        if (row.previous_summon_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            properties['Previous Summon'] = { relation: [{ id: row.previous_summon_id }] };
        }
    }

    // Remove undefined properties
    Object.keys(properties).forEach(key => {
        if (properties[key] === undefined) {
            delete properties[key];
        }
    });

    const isUuid = id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

    try {
        if (!isUuid) {
            throw { code: 'object_not_found', status: 404 };
        }
        await notion.pages.update({
            page_id: id,
            properties: properties
        });
    } catch (e: any) {
        // Handle both 404 (object_not_found) and 400 (validation_error for non-uuid)
        if (e.code === 'object_not_found' || e.status === 400 || e.status === 404) {
            const response = await notion.pages.create({
                parent: { database_id: SUMMONS_DATABASE_ID },
                properties: properties
            });

            const newId = response.id;
            console.log(`Created new Summons in Notion. Updating local ID from ${id} to ${newId}`);

            await db.runTransaction(async (t) => {
                const oldDoc = await t.get(docRef);
                if (!oldDoc.exists) throw new Error("Summons disappeared!");
                const oldData = oldDoc.data()!;

                const newDocRef = db.collection('summons').doc(newId);
                t.set(newDocRef, { ...oldData, id: newId });
                t.delete(docRef);
            });

            return { newId };
        } else {
            throw e;
        }
    }
}
