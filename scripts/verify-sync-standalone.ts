import { Client } from '@notionhq/client';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Manually load .env.local because dotenv might not be available or configured
try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach(line => {
            const parts = line.split('=');
            if (parts.length >= 2) {
                const key = parts[0].trim();
                const value = parts.slice(1).join('=').trim();
                process.env[key] = value;
            }
        });
        console.log('Loaded .env.local');
    } else {
        console.warn('.env.local not found at', envPath);
    }
} catch (e) {
    console.error('Error loading .env.local', e);
}

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const DATABASE_ID = '29c2b150-477c-807b-bfc2-c8e3e7b56ceb'; // The ID found in the URL/Parent of the synced object

if (!NOTION_API_KEY) {
    console.error("Missing NOTION_API_KEY in environment");
    process.exit(1);
}

console.log(`Using Key: ${NOTION_API_KEY.substring(0, 10)}...`);
console.log(`Using DB ID: ${DATABASE_ID}`);

const notion = new Client({ auth: NOTION_API_KEY });
const dbPath = path.join(process.cwd(), 'summons.db');
console.log(`Using DB Path: ${dbPath}`);

const db = new Database(dbPath);

async function run() {
    console.log("--- VERIFICATION START ---");
    const CORRECT_ID = process.env.NOTION_SUMMONS_DATABASE_ID || '2eb2b150-477c-80f3-9d05-cb46b464dff3';
    console.log(`Target Database ID: ${CORRECT_ID}`);

    let added = 0;
    let updated = 0;
    let results: any[] = [];

    // 1. Fetch Data via Raw Fetch
    try {
        console.log(`\n1. Fetching data from Notion via raw fetch...`);
        const url = `https://api.notion.com/v1/databases/${CORRECT_ID}/query`;

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${NOTION_API_KEY}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`API Error ${res.status}: ${errText}`);
        }

        const data = await res.json() as any;
        console.log(`   SUCCESS! Found ${data.results.length} records.`);
        results = data.results;

    } catch (error: any) {
        console.error("   FAILED to query database:", error.message);
        process.exit(1);
    }

    // 2. Verify Data Content
    if (results.length > 0) {
        const sample = results[0];
        console.log('\n2. Sample Record Inspection:');
        console.log('   ID:', sample.id);
        const name = sample.properties?.Name?.title?.[0]?.plain_text || 'Unknown';
        console.log('   Name:', name);
        console.log('   Property Keys:', Object.keys(sample.properties));
    }

    // 3. Compare with Local DB
    console.log('\n3. Comparison with Local DB:');
    try {
        const countStmt = db.prepare('SELECT count(*) as count FROM summons');
        const beforeCount = (countStmt.get() as any).count;
        console.log(`   Current Local DB Count: ${beforeCount}`);

        for (const page of results) {
            if (!('properties' in page)) continue;
            const id = page.id;
            const props = page.properties as any;
            const name = props['Name']?.title?.[0]?.plain_text || 'Unknown';

            // Check if exists in DB
            const checkStmt = db.prepare('SELECT id FROM summons WHERE id = ?');
            const existing = checkStmt.get(id);

            if (existing) {
                updated++;
            } else {
                added++;
                console.log(`   [NEW] Would add: ${name} (${id})`);
            }
        }

        console.log(`\n   Sync Projection: ${added} to add, ${updated} to update.`);

    } catch (e: any) {
        console.error("   DB Check Failed:", e.message);
    }

    console.log("--- VERIFICATION END ---");
}

run();
