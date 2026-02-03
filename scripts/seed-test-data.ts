/**
 * Seed script to populate comprehensive test data for all dashboard views
 * Run with: npx tsx scripts/seed-test-data.ts
 */

import db from '../lib/db';

// Ensure Antigravity Test case exists
const ensureCase = () => {
    const existingCase = db.prepare('SELECT id FROM cases WHERE name = ?').get('Antigravity test');
    if (existingCase) {
        return (existingCase as { id: string }).id;
    }

    const caseId = `case-antigravity-test`;
    db.prepare(`
        INSERT INTO cases (id, name, description, active, created_at, last_edited)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(caseId, 'Antigravity test', 'Test case for comprehensive summons testing', 1, new Date().toISOString(), new Date().toISOString());

    return caseId;
};

// Generate test data for all statuses
const seedSummons = () => {
    const caseId = ensureCase();
    const now = new Date();

    // Helper to generate date strings
    const daysAgo = (days: number) => {
        const d = new Date(now);
        d.setDate(d.getDate() - days);
        return d.toISOString().split('T')[0];
    };

    const daysFromNow = (days: number) => {
        const d = new Date(now);
        d.setDate(d.getDate() + days);
        return d.toISOString().split('T')[0];
    };

    // Clear existing test data
    db.prepare("DELETE FROM summons WHERE person_name LIKE 'Test Person A%'").run();

    const testRecords = [
        // A1: Draft - First Entry (no issue date, nothing filled)
        {
            id: 'test-sum-a1',
            case_id: caseId,
            person_name: 'Test Person A1',
            person_role: 'Witness',
            priority: 'Medium',
            status: 'Draft',
            // No issue_date, no served_date, nothing
        },

        // A2: Issued - Not Served (has issue date, no served date)
        {
            id: 'test-sum-a2',
            case_id: caseId,
            person_name: 'Test Person A2',
            person_role: 'Informant',
            priority: 'High',
            issue_date: daysAgo(5),
            mode_of_service: JSON.stringify(['Personal', 'Phone']),
            status: 'Issued',
            is_issued: 1,
        },

        // A3: Being Served (issued, has mode of service, no served date yet)
        {
            id: 'test-sum-a3',
            case_id: caseId,
            person_name: 'Test Person A3',
            person_role: 'Victim',
            priority: 'High',
            issue_date: daysAgo(3),
            mode_of_service: JSON.stringify(['Email', 'Registered Post']),
            status: 'Being Served',
            is_issued: 1,
        },

        // A4: Served - Awaiting Appearance (served, appearance date in future)
        {
            id: 'test-sum-a4',
            case_id: caseId,
            person_name: 'Test Person A4',
            person_role: 'Accused',
            priority: 'High',
            issue_date: daysAgo(10),
            mode_of_service: JSON.stringify(['Personal']),
            served_date: daysAgo(5),
            appearance_date: daysFromNow(5),
            appearance_time: '10:00',
            status: 'Awaiting Appearance',
            is_issued: 1,
            is_served: 1,
        },

        // A5: Served - Didn't Appear (served, appearance date passed, no reschedule, no statement)
        {
            id: 'test-sum-a5',
            case_id: caseId,
            person_name: 'Test Person A5',
            person_role: 'Witness',
            priority: 'Medium',
            issue_date: daysAgo(15),
            mode_of_service: JSON.stringify(['Personal', 'Phone']),
            served_date: daysAgo(10),
            appearance_date: daysAgo(3),
            appearance_time: '14:00',
            status: 'Awaiting Appearance',
            is_issued: 1,
            is_served: 1,
            // No reschedule, no statement - should show as "didn't appear"
        },

        // A6: Reschedule Pending (served, requests reschedule, no rescheduled date)
        {
            id: 'test-sum-a6',
            case_id: caseId,
            person_name: 'Test Person A6',
            person_role: 'Expert Witness',
            priority: 'Medium',
            issue_date: daysAgo(12),
            mode_of_service: JSON.stringify(['Email']),
            served_date: daysAgo(8),
            appearance_date: daysAgo(2),
            appearance_time: '11:00',
            status: 'Rescheduled',
            is_issued: 1,
            is_served: 1,
            requests_reschedule: 1,
            notes: 'Medical emergency - requested reschedule',
        },

        // A7: Rescheduled - Awaiting (has rescheduled date in future)
        {
            id: 'test-sum-a7',
            case_id: caseId,
            person_name: 'Test Person A7',
            person_role: 'Informant',
            priority: 'High',
            issue_date: daysAgo(20),
            mode_of_service: JSON.stringify(['Personal']),
            served_date: daysAgo(15),
            appearance_date: daysAgo(5),
            rescheduled_date: daysFromNow(3),
            rescheduled_date_communicated: 1,
            status: 'Rescheduled',
            is_issued: 1,
            is_served: 1,
            requests_reschedule: 1,
        },

        // A8: Statement In Progress (appeared, statement ongoing)
        {
            id: 'test-sum-a8',
            case_id: caseId,
            person_name: 'Test Person A8',
            person_role: 'Witness',
            priority: 'High',
            issue_date: daysAgo(25),
            mode_of_service: JSON.stringify(['Personal']),
            served_date: daysAgo(20),
            appearance_date: daysAgo(10),
            appearance_time: '09:00',
            date_of_1st_statement: daysAgo(10),
            statement_status: 'Ongoing',
            status: 'Statement In Progress',
            is_issued: 1,
            is_served: 1,
            statement_ongoing: 1,
        },

        // A9: Statement Completed (all statement dates filled)
        {
            id: 'test-sum-a9',
            case_id: caseId,
            person_name: 'Test Person A9',
            person_role: 'Victim',
            priority: 'High',
            issue_date: daysAgo(30),
            mode_of_service: JSON.stringify(['Personal', 'Phone']),
            served_date: daysAgo(25),
            appearance_date: daysAgo(20),
            appearance_time: '10:30',
            date_of_1st_statement: daysAgo(20),
            date_of_2nd_statement: daysAgo(15),
            date_of_3rd_statement: daysAgo(10),
            statement_status: 'Recorded',
            status: 'Statement Completed',
            is_issued: 1,
            is_served: 1,
            statement_ongoing: 0,
            statement_recorded: 1,
            followup_required: 1,
        },

        // A10: Closed (complete cycle)
        {
            id: 'test-sum-a10',
            case_id: caseId,
            person_name: 'Test Person A10',
            person_role: 'Witness',
            priority: 'Low',
            issue_date: daysAgo(45),
            mode_of_service: JSON.stringify(['Registered Post']),
            served_date: daysAgo(40),
            appearance_date: daysAgo(30),
            appearance_time: '15:00',
            date_of_1st_statement: daysAgo(30),
            statement_status: 'Recorded',
            summons_response: 'Fully Complied',
            status: 'Closed',
            is_issued: 1,
            is_served: 1,
            statement_recorded: 1,
            followup_required: 0,
        },
    ];

    const insertStmt = db.prepare(`
        INSERT INTO summons (
            id, case_id, person_name, person_role, priority, status,
            issue_date, mode_of_service, served_date, appearance_date, appearance_time,
            rescheduled_date, rescheduled_date_communicated,
            date_of_1st_statement, date_of_2nd_statement, date_of_3rd_statement,
            statement_status, summons_response, notes,
            is_issued, is_served, requests_reschedule, statement_ongoing, statement_recorded, followup_required,
            purpose, tone, created_at
        ) VALUES (
            @id, @case_id, @person_name, @person_role, @priority, @status,
            @issue_date, @mode_of_service, @served_date, @appearance_date, @appearance_time,
            @rescheduled_date, @rescheduled_date_communicated,
            @date_of_1st_statement, @date_of_2nd_statement, @date_of_3rd_statement,
            @statement_status, @summons_response, @notes,
            @is_issued, @is_served, @requests_reschedule, @statement_ongoing, @statement_recorded, @followup_required,
            @purpose, @tone, @created_at
        )
    `);

    for (const record of testRecords) {
        insertStmt.run({
            id: record.id,
            case_id: record.case_id,
            person_name: record.person_name,
            person_role: record.person_role || null,
            priority: record.priority || 'Medium',
            status: record.status || 'Draft',
            issue_date: record.issue_date || null,
            mode_of_service: record.mode_of_service || '[]',
            served_date: record.served_date || null,
            appearance_date: record.appearance_date || null,
            appearance_time: record.appearance_time || null,
            rescheduled_date: record.rescheduled_date || null,
            rescheduled_date_communicated: record.rescheduled_date_communicated || 0,
            date_of_1st_statement: record.date_of_1st_statement || null,
            date_of_2nd_statement: record.date_of_2nd_statement || null,
            date_of_3rd_statement: record.date_of_3rd_statement || null,
            statement_status: record.statement_status || null,
            summons_response: record.summons_response || null,
            notes: record.notes || null,
            is_issued: record.is_issued || 0,
            is_served: record.is_served || 0,
            requests_reschedule: record.requests_reschedule || 0,
            statement_ongoing: record.statement_ongoing || 0,
            statement_recorded: record.statement_recorded || 0,
            followup_required: record.followup_required || 0,
            purpose: '[]',
            tone: null,
            created_at: new Date().toISOString(),
        });
        console.log(`✓ Created: ${record.person_name} (${record.status})`);
    }

    console.log('\n✅ Seeded 10 test records covering all summons lifecycle stages!');
};

// Run the seed
try {
    seedSummons();
} catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
}
