import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { syncCases } from '../lib/sync-cases';
import { syncSummons } from '../lib/sync';
import db from '../lib/db';

async function run() {
    console.log("--- VERIFYING FULL SYNC ---");

    // Clear tables
    db.prepare("DELETE FROM summons").run();
    db.prepare("DELETE FROM cases").run();
    console.log("Cleared local tables.");

    console.log("\n1. Syncing Cases...");
    const casesResult = await syncCases();
    console.log("Cases Result:", casesResult);

    console.log("\n2. Syncing Summons...");
    const summonsResult = await syncSummons();
    console.log("Summons Result:", summonsResult);

    if (casesResult.success && summonsResult.success) {
        // Verify Data Integrity
        const caseCount = db.prepare("SELECT count(*) as count FROM cases").get() as any;
        const summonsCount = db.prepare("SELECT count(*) as count FROM summons").get() as any;

        console.log(`\nFinal DB State:`);
        console.log(`- Cases: ${caseCount.count}`);
        console.log(`- Summons: ${summonsCount.count}`);

        if (caseCount.count > 0 && summonsCount.count > 0) {
            // Check Foreign Key Link (Logic Check)
            const linkedSummons = db.prepare(`
                SELECT s.person_name, c.name as case_name 
                FROM summons s 
                JOIN cases c ON s.case_id = c.id 
                LIMIT 3
            `).all();

            console.log("\nSample Linked Records:");
            console.table(linkedSummons);
        }
    } else {
        console.error("Sync Failed!");
    }
}

run();
