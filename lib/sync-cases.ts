import { db } from './firebase-admin';
import { Case } from './types';

const DATABASE_ID = process.env.NOTION_CASES_DATABASE_ID || '';
const NOTION_API_KEY = process.env.NOTION_API_KEY || '';

export async function syncCases() {
    console.log("Starting Case Sync...");

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

        console.log(`Fetched ${results.length} cases from Notion.`);

        const batch = db.batch();
        const syncedIds = new Set<string>();

        const mappedCases = results.map((page: any) => {
            const props = page.properties;
            const id = page.id;
            syncedIds.add(id);

            const getTitle = (key: string) => props[key]?.title?.[0]?.plain_text || 'Untitled Case';
            const getText = (key: string) => props[key]?.rich_text?.[0]?.plain_text || '';
            const getDate = (key: string) => props[key]?.date?.start || null;
            const getSelect = (key: string) => props[key]?.select?.name || 'Unknown';
            const getMultiSelect = (key: string) => props[key]?.multi_select?.map((o: any) => o.name) || [];

            return {
                id: id,
                name: getTitle('Name'),
                ecir_no: getText('ECIR NO.'),
                date_of_ecir: getDate('Date of ECIR'),
                status: getSelect('Status'),
                assigned_officer: getMultiSelect('Assigned officer'),
                activity: getMultiSelect('Activity'),
                pao_amount: getText('PAO Amount'),
                pao_date: getDate('PAO Date'),
                active: props['Active']?.checkbox ? 1 : 0,
                whether_pc_filed: props['Whether PC filed']?.checkbox ? 1 : 0,
                date_of_pc_filed: getDate('Date of PC filed'),
                court_cognizance_date: getDate('Court Cognizance Date'),
                poc_in_cr: getText('POC in Cr.'),
                created_at: page.created_time,
                last_edited: page.last_edited_time,
                synced_at: new Date().toISOString()
            };
        });

        // Add updates/sets to batch
        mappedCases.forEach((c: any) => {
            const docRef = db.collection('cases').doc(c.id);
            // cleaning undefined values
            const clearData = JSON.parse(JSON.stringify(c));
            batch.set(docRef, clearData);
        });

        // Cleanup: remove local cases that were synced but are now missing from Notion
        const casesSnap = await db.collection('cases').select('synced_at').get();
        const toDelete: string[] = [];
        casesSnap.docs.forEach(doc => {
            const data = doc.data();
            if (data.synced_at && !syncedIds.has(doc.id)) {
                toDelete.push(doc.id);
            }
        });

        if (toDelete.length > 0) {
            console.log(`Cleaning up ${toDelete.length} cases removed from Notion.`);
            toDelete.forEach(id => {
                batch.delete(db.collection('cases').doc(id));
            });
        }

        await batch.commit();

        console.log(`Successfully synced ${mappedCases.length} cases.`);
        return { success: true, count: mappedCases.length };

    } catch (error: any) {
        console.error("Case Sync Failed:", error.message);
        return { success: false, error: error.message };
    }
}
