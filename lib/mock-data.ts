import { Case, Officer, Summons } from "@/types";

export const MOCK_OFFICERS: Officer[] = [
    { id: 'off-1', name: 'Inspector Roy', rank: 'Inspector', badge_number: '8821', email: 'roy@department.gov' },
    { id: 'off-2', name: 'Officer Jenny', rank: 'Constable', badge_number: '9912', email: 'jenny@department.gov' },
    { id: 'off-3', name: 'Sargent Mike', rank: 'Sargent', badge_number: '7744', email: 'mike@department.gov' },
];

export const MOCK_CASES: Case[] = [
    { id: 'case-1', title: 'The Fraud Ring', description: 'Investigation into large scale financial fraud', status: 'Active', created_at: '2025-12-01T10:00:00Z' },
    { id: 'case-2', title: 'Operation Nightfall', description: 'Surveillance operation in downtown', status: 'Active', created_at: '2026-01-10T14:30:00Z' },
    { id: 'case-3', title: 'Blue Sky', description: 'Internal affairs investigation', status: 'Closed', created_at: '2025-10-05T09:15:00Z' },
];

export const MOCK_SUMMONS: Summons[] = [
    {
        id: 'sum-1',
        case_id: 'case-1',
        person_name: 'John Doe',
        contact_number: '+1234567890',
        officer_assigned_id: 'off-1',
        created_at: '2026-01-15T09:00:00Z',
        issue_date: '2026-01-16T10:00:00Z',
        appearance_date: '2026-01-25T09:00:00Z',
        status: 'Issued and being served',
        statement_status: 'Not Started',
        priority: 'High',
        mode_of_service: ['Email'],
        // Flags
        is_issued: true,
        is_served: false,
    },
    {
        id: 'sum-2',
        case_id: 'case-1',
        person_name: 'Jane Smith',
        created_at: '2026-01-20T11:00:00Z',
        status: 'Draft',
        statement_status: 'Not Started',
        priority: 'Medium',
        mode_of_service: [],
        // Flags
        is_issued: false,
    },
    {
        id: 'sum-3',
        case_id: 'case-2',
        person_name: 'Robert White',
        officer_assigned_id: 'off-2',
        created_at: '2026-01-21T15:00:00Z',
        issue_date: '2026-01-22T09:00:00Z',
        appearance_date: '2026-01-24T10:00:00Z',
        status: 'Served',
        statement_status: 'Ongoing',
        priority: 'High',
        mode_of_service: ['Phone'],
        // Flags
        is_issued: true,
        is_served: true,
        statement_ongoing: true,
        statements: [
            {
                id: 'stmt-1',
                summons_id: 'sum-3',
                date: '2026-01-23T10:00:00Z',
                content: 'Witness confirmed receipt.',
                author_name: 'Officer Jenny'
            }
        ]
    },
    {
        id: 'sum-4',
        case_id: 'case-2',
        person_name: 'Alice Brown',
        created_at: '2026-01-22T10:00:00Z',
        status: 'Requested Rescheduling',
        statement_status: 'Not Started',
        priority: 'Low',
        mode_of_service: ['Email'],
        // Flags
        is_issued: true,
        is_served: true,
        requests_reschedule: true,
        notes: 'Requested next week due to illness.',
    }
];
