const { createClient } = require('@libsql/client');
const path = require('path');
const dotenv = require('dotenv');

// Load env vars from .env.local
dotenv.config({ path: '.env.local' });

const url = process.env.TURSO_DATABASE_URL || `file:${path.join(process.cwd(), 'summons.db')}`;
const authToken = process.env.TURSO_AUTH_TOKEN;

console.log('Connecting to:', url);

const db = createClient({
    url: url,
    authToken: authToken,
});

async function main() {
    console.log('Testing DB...');

    try {
        // Check table info (different syntax for remote vs local usually, but standard SQL works)
        const info = await db.execute("PRAGMA table_info(summons)");
        console.log('Columns:', info.rows.map(c => c.name));

        // Test Select
        const rs = await db.execute({
            sql: 'SELECT * FROM summons WHERE id = ?',
            args: ['invalid-id']
        });
        const row = rs.rows[0];
        console.log('Row for invalid-id:', row);

        // Test Insert
        await db.execute({
            sql: `
            INSERT INTO summons (id, case_id, person_name, created_at, status, is_issued, is_served, requests_reschedule, statement_ongoing, statement_recorded, rescheduled_date_communicated, followup_required, previous_summon_id, served_date) 
            VALUES ('test-1', 'case-1', 'Test Person', '2023-01-01', 'Draft', 0, 0, 0, 0, 0, 0, 0, NULL, NULL)
            ON CONFLICT(id) DO UPDATE SET 
                person_name = excluded.person_name,
                status = excluded.status
            `, // Added upsert logic to make it re-runnable or just ignore error
            args: []
        });

        const rs2 = await db.execute({
            sql: 'SELECT * FROM summons WHERE id = ?',
            args: ['test-1']
        });
        const row2 = rs2.rows[0];
        console.log('Row for test-1:', row2);

        // Test parsing logic from actions.ts
        const parseSummons = (row) => ({
            ...row,
            mode_of_service: JSON.parse(row.mode_of_service || '[]'),
            purpose: JSON.parse(row.purpose || '[]'),
            is_issued: !!row.is_issued,
            is_served: !!row.is_served,
            requests_reschedule: !!row.requests_reschedule,
            statement_ongoing: !!row.statement_ongoing,
            statement_recorded: !!row.statement_recorded,
            rescheduled_date_communicated: !!row.rescheduled_date_communicated,
            followup_required: !!row.followup_required,
            served_date: row.served_date || null
        });

        if (row2) {
            console.log('Parsed:', parseSummons(row2));
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

main();

