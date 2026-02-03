import Database from 'better-sqlite3';
import path from 'path';
import { db } from '../lib/firebase-admin';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Function to migrate
async function migrate() {
    console.log("Starting Migration...");

    // 1. Connect to SQLite
    const dbPath = path.join(process.cwd(), 'summons.db');
    console.log(`Reading from SQLite DB at: ${dbPath}`);
    const sqlite = new Database(dbPath);

    try {
        // 2. Migrate Users
        const users = sqlite.prepare('SELECT * FROM users').all() as any[];
        console.log(`Found ${users.length} users to migrate.`);

        let batch = db.batch();
        let count = 0;

        for (const user of users) {
            const ref = db.collection('users').doc(user.id);
            batch.set(ref, user);
            count++;
            if (count >= 500) {
                await batch.commit();
                batch = db.batch();
                count = 0;
            }
        }
        await batch.commit();
        console.log("Users migrated successfully.");

        // 3. Migrate Summons
        const summons = sqlite.prepare('SELECT * FROM summons').all() as any[];
        console.log(`Found ${summons.length} summons to migrate.`);

        batch = db.batch();
        count = 0;
        for (const s of summons) {
            // Parse JSON fields
            try {
                if (typeof s.mode_of_service === 'string') s.mode_of_service = JSON.parse(s.mode_of_service);
            } catch (e) { }
            try {
                if (typeof s.purpose === 'string') s.purpose = JSON.parse(s.purpose);
            } catch (e) { }

            const ref = db.collection('summons').doc(s.id);
            batch.set(ref, s);
            count++;
            if (count >= 500) {
                await batch.commit();
                batch = db.batch();
                count = 0;
            }
        }
        await batch.commit();
        console.log("Summons migrated successfully.");

        // 4. Migrate Cases
        const cases = sqlite.prepare('SELECT * FROM cases').all() as any[];
        console.log(`Found ${cases.length} cases to migrate.`);

        batch = db.batch();
        count = 0;
        for (const c of cases) {
            // Parse JSON fields
            try {
                if (typeof c.assigned_officer === 'string') c.assigned_officer = JSON.parse(c.assigned_officer);
            } catch (e) { }
            try {
                if (typeof c.activity === 'string') c.activity = JSON.parse(c.activity);
            } catch (e) { }

            const ref = db.collection('cases').doc(c.id);
            batch.set(ref, c);
            count++;
            if (count >= 500) {
                await batch.commit();
                batch = db.batch();
                count = 0;
            }
        }
        await batch.commit();
        console.log("Cases migrated successfully.");

        // 5. Migrate Activity Logs
        const logs = sqlite.prepare('SELECT * FROM activity_logs').all() as any[];
        console.log(`Found ${logs.length} activity logs to migrate.`);

        batch = db.batch();
        count = 0;
        for (const log of logs) {
            // Use auto-id or string ID if exists. Log IDs are integers in SQLite.
            // We'll use string conversion for ID
            const ref = db.collection('activity_logs').doc(String(log.id));
            batch.set(ref, log);
            count++;
            if (count >= 500) {
                await batch.commit();
                batch = db.batch();
                count = 0;
            }
        }
        await batch.commit();
        console.log("Activity Logs migrated successfully.");

    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        sqlite.close();
    }
}

migrate();
