const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'summons.db');
const db = new Database(dbPath);

console.log('Testing DB...');

try {
    // Check table info
    const info = db.pragma('table_info(summons)');
    console.log('Columns:', info.map(c => c.name));

    const stmt = db.prepare('SELECT * FROM summons WHERE id = ?');
    const row = stmt.get('invalid-id');
    console.log('Row for invalid-id:', row);

    db.prepare(`
        INSERT INTO summons (id, case_id, person_name, created_at, status, is_issued, is_served, requests_reschedule, statement_ongoing, statement_recorded, rescheduled_date_communicated, followup_required, previous_summon_id, served_date) 
        VALUES ('test-1', 'case-1', 'Test Person', '2023-01-01', 'Draft', 0, 0, 0, 0, 0, 0, 0, NULL, NULL)
    `).run();

    const row2 = stmt.get('test-1');
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

    console.log('Parsed:', parseSummons(row2));

} catch (e) {
    console.error('Error:', e);
}
