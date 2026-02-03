import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { syncCases } from '../lib/sync-cases';
import db from '../lib/db';

async function run() {
    console.log("--- VERIFYING CASE SYNC ---");

    // Clear cases table first
    db.prepare("DELETE FROM cases").run();
    console.log("Cleared local cases table.");

    // Run Sync
    const result = await syncCases();
    console.log("Sync Result:", result);

    if (result.success) {
        // Verify DB Content
        const rowCount = db.prepare("SELECT count(*) as count FROM cases").get() as any;
        console.log(`DB Row Count: ${rowCount.count}`);

        if (rowCount.count > 0) {
            const sample = db.prepare("SELECT * FROM cases LIMIT 1").get() as any;
            console.log("\nSample Case:");
            console.log(sample);
        } else {
            console.error("ERROR: Sync reported success but DB is empty!");
        }
    } else {
        console.error("Sync Failed!");
    }
}

run();
