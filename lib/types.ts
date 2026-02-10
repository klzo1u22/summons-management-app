// ==========================================
// CASE INTERFACE
// ==========================================
export interface Case {
    id: string;
    name: string;
    ecir_no: string;
    date_of_ecir?: string | null;
    status: string;
    assigned_officer: string[]; // Multi-select values
    activity: string[]; // Multi-select values
    pao_amount?: string | null;
    pao_date?: string | null;
    created_at: string;
    last_edited: string;
    total_summons?: number;
    active_summons?: number;
    // New fields from Notion
    active?: boolean;
    whether_pc_filed?: boolean;
    date_of_pc_filed?: string | null;
    court_cognizance_date?: string | null;
    poc_in_cr?: string | null;
}

// ==========================================
// SUMMONS INTERFACE
// ==========================================
import { SummonsStatus } from './summons-state-machine';

export interface Summons {
    id: string;
    case_id: string;
    person_name: string;
    person_role?: string | null;
    contact_number?: string | null;
    email?: string | null;
    officer_assigned_id?: string | null;
    issue_date?: string | null;
    appearance_date?: string | null;
    rescheduled_date?: string | null;
    appearance_time?: string | null;
    status: SummonsStatus; // Now uses the state machine type
    statement_status?: string | null;
    priority?: string | null;
    mode_of_service?: string[]; // JSON array in DB, array here
    tone?: string | null;
    purpose?: string[]; // JSON array in DB
    notes?: string | null;
    is_issued: boolean;
    is_served: boolean;
    requests_reschedule: boolean;
    statement_ongoing: boolean;
    statement_recorded: boolean;
    created_at: string;
    // New fields from Notion
    summons_response?: string | null;
    date_of_1st_statement?: string | null;
    date_of_2nd_statement?: string | null;
    date_of_3rd_statement?: string | null;
    rescheduled_date_communicated?: boolean;
    followup_required?: boolean;
    previous_summon_id?: string | null;
    served_date?: string | null;
}

// ==========================================
// SELECT/MULTI-SELECT OPTIONS (from Notion)
// ==========================================

export const PERSON_ROLE_OPTIONS = [
    'Suspect',
    'Witness',
    'Accomplice',
    'Family member of main accused',
    'Main accused',
    'Key Employee of main accused',
    'RP / Liquidator',
    'Agent / Entry Operator',
    'Depositor / Investor/ victim',
    'Bank Official',
    'Statutory Auditor/ CA',
    'Dummy Director / shareholder',
] as const;

export const PRIORITY_OPTIONS = [
    'Extremely Important',
    'High',
    'Medium',
    'Low',
] as const;

export const TONE_OPTIONS = [
    'obtain documents',
    'Confront documents',
    'Co-accused',
    'Accused',
    'Witness',
    'Evasive Answers',
    'Firm',
    'Neutral',
] as const;

export const PURPOSE_OPTIONS = [
    'Fact finding',
    'Confrontation of facts/ statements',
    'Follow-up statement',
    'Document collection',
    'Identity clarification',
] as const;

export const MODE_OF_SERVICE_OPTIONS = [
    'Through employer',
    'Affixture',
    'Email',
    'Speed Post',
    'Personal service',
] as const;

export const STATEMENT_STATUS_OPTIONS = [
    'questions finalised',
    'Documents pending',
    'Statement recorded',
    'Appearance scheduled',
    'Awaiting appearance',
    'Served',
    'Issued',
    'Annexure finalised',
    'Drafting',
] as const;

export const SUMMONS_RESPONSE_OPTIONS = [
    'No response',
    'Rescheduled and communicated',
    'Requested Rescheduling',
    'Served',
    'Service Failed',
    'Issued and being served',
] as const;

export const CASE_STATUS_OPTIONS = [
    'To Do',
    'Doing',
    'Done',
    'On Hold',
] as const;

export const ASSIGNED_OFFICER_OPTIONS = [
    'Kumar',
    'Naresh',
    'Gunjan',
    'Saket',
    'Ravinder Dahiya',
] as const;

export const ACTIVITY_OPTIONS = [
    'Waiting for Instruction',
    'Dormant/ Stayed',
    'Free Time',
    'Trial',
    'Drafting',
    'Investigation',
    'Top Priority',
    'Adjudicating Authority',
] as const;

// ==========================================
// ACTIVITY LOG INTERFACE
// ==========================================
export interface ActivityLog {
    id: number;
    summons_id: string;
    action: 'created' | 'updated' | 'deleted' | 'status_changed' | 'field_changed';
    field_name?: string | null;
    old_value?: string | null;
    new_value?: string | null;
    description: string;
    created_at: string;
}
// ==========================================
// AI CHAT INTERFACES
// ==========================================
export interface ChatMessage {
    role: 'user' | 'assistant' | 'system' | 'model' | 'tool';
    content: string;
    tool_calls?: any[];
    tool_call_id?: string;
}

export interface AIResponse {
    action: 'create' | 'update' | 'delete' | 'search' | 'clarify' | 'info';
    data?: Record<string, unknown>;
    message: string;
    requires_confirmation?: boolean;
    summonId?: string;
    options?: string[];
    executed?: boolean;
    searchResults?: Summons[];
}

// New minimal AI response format (for optimized architecture)
export interface AIParsedIntent {
    intent: 'create' | 'update' | 'delete' | 'search' | 'help' | 'answer' | 'unknown';
    entities: {
        person_name?: string;
        case_id?: string;
        issue_date?: string;
        appearance_date?: string;
        served_date?: string;
        status?: string;
        address?: string;
        notes?: string;
        query?: string;
        summon_id?: string;
        error?: string | number;
        [key: string]: string | number | undefined;
    };
    raw_input?: string;
}

// Workflow state for server-side state machine
export type WorkflowState =
    | 'idle'
    | 'awaiting_name'
    | 'awaiting_case'
    | 'awaiting_details'
    | 'awaiting_confirmation'
    | 'done';

