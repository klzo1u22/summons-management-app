/**
 * Summons Lifecycle State Machine
 * 
 * This module defines the single source of truth for summons status,
 * allowed transitions, and field editability per status.
 */

// ==========================================
// STATUS DEFINITIONS
// ==========================================
export const SUMMONS_STATUSES = [
    'Draft',
    'Issued',
    'Being Served',
    'Service Failed',
    'Served',
    'Awaiting Appearance',
    'Rescheduled',
    'Statement In Progress',
    'Statement Completed',
    'Closed',
] as const;

export type SummonsStatus = typeof SUMMONS_STATUSES[number];

// ==========================================
// TRANSITION MATRIX
// ==========================================
export const SUMMONS_TRANSITIONS: Record<SummonsStatus, SummonsStatus[]> = {
    'Draft': ['Issued'],
    'Issued': ['Being Served'],
    'Being Served': ['Served', 'Service Failed'],
    'Service Failed': ['Being Served', 'Closed'],
    'Served': ['Awaiting Appearance'],
    'Awaiting Appearance': ['Rescheduled', 'Statement In Progress'],
    'Rescheduled': ['Awaiting Appearance'],
    'Statement In Progress': ['Statement Completed'],
    'Statement Completed': ['Closed'],
    'Closed': [], // Terminal state
};

// ==========================================
// TRANSITION VALIDATION (ENHANCED)
// ==========================================

interface ValidationData {
    person_name?: string;
    case_id?: string;
    issue_date?: string;
    mode_of_service?: string[];
    served_date?: string;
    appearance_date?: string;
    rescheduled_date?: string;
    date_of_1st_statement?: string;
}

interface ValidationResult {
    valid: boolean;
    errors: string[];
}

/**
 * Get required fields to transition TO a specific status.
 */
export function getRequiredFieldsForTransition(targetStatus: SummonsStatus): string[] {
    switch (targetStatus) {
        case 'Issued':
            return ['person_name', 'case_id', 'issue_date'];
        case 'Being Served':
            return ['mode_of_service'];
        case 'Served':
            return ['served_date'];
        case 'Awaiting Appearance':
            return ['appearance_date'];
        case 'Rescheduled':
            return ['rescheduled_date'];
        case 'Statement In Progress':
            return []; // Was already served and appeared
        case 'Statement Completed':
            return ['date_of_1st_statement'];
        default:
            return [];
    }
}

/**
 * Check if a transition is structurally allowed (follows lifecycle order).
 */
export function canTransition(from: SummonsStatus, to: SummonsStatus): boolean {
    return SUMMONS_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Validate whether a transition is allowed WITH data validation.
 * Returns validation result with specific error messages.
 */
export function validateTransition(
    from: SummonsStatus,
    to: SummonsStatus,
    data: ValidationData
): ValidationResult {
    const errors: string[] = [];

    // 1. Check structural transition is allowed
    if (!canTransition(from, to)) {
        errors.push(`Cannot transition from "${from}" to "${to}". Invalid workflow path.`);
        return { valid: false, errors };
    }

    // 2. Check required fields for the target status
    const requiredFields = getRequiredFieldsForTransition(to);
    for (const field of requiredFields) {
        const value = data[field as keyof ValidationData];
        const isEmpty = value === undefined || value === '' ||
            (Array.isArray(value) && value.length === 0);
        if (isEmpty) {
            const labelMap: Record<string, string> = {
                person_name: 'Person Name',
                case_id: 'Case',
                issue_date: 'Issue Date',
                mode_of_service: 'Mode of Service',
                served_date: 'Served Date',
                appearance_date: 'Appearance Date',
                rescheduled_date: 'Rescheduled Date',
                date_of_1st_statement: 'Date of 1st Statement',
            };
            errors.push(`${labelMap[field] || field} is required to advance to "${to}".`);
        }
    }

    // 3. Lifecycle order checks - can't skip stages
    const currentIndex = SUMMONS_STATUSES.indexOf(from);
    const targetIndex = SUMMONS_STATUSES.indexOf(to);

    // If trying to go to Statement stages, must have been served
    if ((to === 'Statement In Progress' || to === 'Statement Completed') &&
        currentIndex < SUMMONS_STATUSES.indexOf('Served')) {
        errors.push('Cannot record statement: summons has not been served yet.');
    }

    // If trying to go to Awaiting Appearance, must have served date
    if (to === 'Awaiting Appearance' && !data.served_date) {
        errors.push('Cannot set appearance date: summons has not been served.');
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Get the list of allowed next statuses from a given status.
 */
export function getNextStatuses(currentStatus: SummonsStatus): SummonsStatus[] {
    return SUMMONS_TRANSITIONS[currentStatus] ?? [];
}

// ==========================================
// FIELD EDITABILITY BY STATUS
// ==========================================

type FieldKey =
    | 'person_name' | 'person_role' | 'case_id' | 'priority' | 'tone'
    | 'purpose' | 'notes' | 'contact_number' | 'email'
    | 'issue_date' | 'mode_of_service'
    | 'served_date'
    | 'appearance_date' | 'appearance_time'
    | 'requests_reschedule' | 'rescheduled_date' | 'rescheduled_date_communicated'
    | 'statement_status' | 'date_of_1st_statement' | 'date_of_2nd_statement' | 'date_of_3rd_statement'
    | 'followup_required';

const DRAFT_FIELDS: FieldKey[] = [
    'person_name', 'person_role', 'case_id', 'priority', 'tone',
    'purpose', 'notes', 'contact_number', 'email'
];

const EDITABLE_FIELDS_BY_STATUS: Record<SummonsStatus, FieldKey[]> = {
    'Draft': [...DRAFT_FIELDS],
    'Issued': ['mode_of_service', 'issue_date'],
    'Being Served': ['served_date', 'mode_of_service'],
    'Service Failed': ['mode_of_service', 'notes'],
    'Served': ['appearance_date', 'appearance_time'],
    'Awaiting Appearance': ['requests_reschedule', 'rescheduled_date'],
    'Rescheduled': ['rescheduled_date', 'rescheduled_date_communicated'],
    'Statement In Progress': ['statement_status', 'date_of_1st_statement', 'date_of_2nd_statement', 'date_of_3rd_statement', 'notes'],
    'Statement Completed': ['followup_required'],
    'Closed': [], // No fields editable
};

/**
 * Get the list of editable fields for a given status.
 */
export function getEditableFields(status: SummonsStatus): FieldKey[] {
    return EDITABLE_FIELDS_BY_STATUS[status] ?? [];
}

/**
 * Check if a specific field is editable for a given status.
 */
export function isFieldEditable(status: SummonsStatus, field: string): boolean {
    return getEditableFields(status).includes(field as FieldKey);
}

// ==========================================
// DERIVED CHECKBOX VALUES
// ==========================================

interface DerivedCheckboxes {
    is_issued: boolean;
    is_served: boolean;
    requests_reschedule: boolean;
    statement_ongoing: boolean;
    statement_recorded: boolean;
}

/**
 * Derive checkbox boolean values from the current status.
 * This replaces manual checkbox toggling with status-derived state.
 */
export function deriveCheckboxesFromStatus(status: SummonsStatus): DerivedCheckboxes {
    const statusIndex = SUMMONS_STATUSES.indexOf(status);
    const issuedThreshold = SUMMONS_STATUSES.indexOf('Issued');
    const servedThreshold = SUMMONS_STATUSES.indexOf('Served');
    const rescheduleThreshold = SUMMONS_STATUSES.indexOf('Rescheduled');
    const statementInProgressThreshold = SUMMONS_STATUSES.indexOf('Statement In Progress');
    const statementCompletedThreshold = SUMMONS_STATUSES.indexOf('Statement Completed');

    return {
        is_issued: statusIndex >= issuedThreshold,
        is_served: statusIndex >= servedThreshold,
        requests_reschedule: status === 'Rescheduled' || status === 'Awaiting Appearance',
        statement_ongoing: status === 'Statement In Progress',
        statement_recorded: statusIndex >= statementCompletedThreshold,
    };
}

// ==========================================
// STATUS DISPLAY METADATA
// ==========================================

interface StatusMeta {
    color: string;       // CSS variable or color name
    bgColor: string;     // Background color
    icon: string;        // Icon name (for lucide-react)
    description: string; // Human-readable description
}

export const STATUS_META: Record<SummonsStatus, StatusMeta> = {
    'Draft': {
        color: 'var(--status-draft)',
        bgColor: 'var(--status-draft-bg)',
        icon: 'FileEdit',
        description: 'Summons is being prepared',
    },
    'Issued': {
        color: 'var(--status-issued)',
        bgColor: 'var(--status-issued-bg)',
        icon: 'FileCheck',
        description: 'Formally issued, ready for service',
    },
    'Being Served': {
        color: 'var(--status-serving)',
        bgColor: 'var(--status-serving-bg)',
        icon: 'Send',
        description: 'Delivery process underway',
    },
    'Service Failed': {
        color: 'var(--status-failed)',
        bgColor: 'var(--status-failed-bg)',
        icon: 'AlertCircle',
        description: 'Delivery attempt unsuccessful',
    },
    'Served': {
        color: 'var(--status-served)',
        bgColor: 'var(--status-served-bg)',
        icon: 'CheckCircle',
        description: 'Successfully delivered',
    },
    'Awaiting Appearance': {
        color: 'var(--status-awaiting)',
        bgColor: 'var(--status-awaiting-bg)',
        icon: 'Clock',
        description: 'Waiting for scheduled appearance',
    },
    'Rescheduled': {
        color: 'var(--status-rescheduled)',
        bgColor: 'var(--status-rescheduled-bg)',
        icon: 'CalendarClock',
        description: 'New date has been set',
    },
    'Statement In Progress': {
        color: 'var(--status-in-progress)',
        bgColor: 'var(--status-in-progress-bg)',
        icon: 'Mic',
        description: 'Recording session active',
    },
    'Statement Completed': {
        color: 'var(--status-completed)',
        bgColor: 'var(--status-completed-bg)',
        icon: 'CheckCheck',
        description: 'All statements recorded',
    },
    'Closed': {
        color: 'var(--status-closed)',
        bgColor: 'var(--status-closed-bg)',
        icon: 'Lock',
        description: 'No further modifications allowed',
    },
};

// ==========================================
// STATUS INFERENCE (for migration/sync)
// ==========================================

interface LegacyCheckboxes {
    is_issued?: boolean;
    is_served?: boolean;
    requests_reschedule?: boolean;
    statement_ongoing?: boolean;
    statement_recorded?: boolean;
    rescheduled_date?: string | null;
    appearance_date?: string | null;
}

/**
 * Infer the most likely status from legacy checkbox-based data.
 * Used for migration and Notion sync where status field may not exist.
 */
export function inferStatusFromCheckboxes(data: LegacyCheckboxes): SummonsStatus {
    // Work backwards from most advanced state
    if (data.statement_recorded) {
        return 'Statement Completed';
    }
    if (data.statement_ongoing) {
        return 'Statement In Progress';
    }
    if (data.requests_reschedule && data.rescheduled_date) {
        return 'Rescheduled';
    }
    if (data.is_served && data.appearance_date) {
        return 'Awaiting Appearance';
    }
    if (data.is_served) {
        return 'Served';
    }
    if (data.is_issued) {
        return 'Issued';
    }
    return 'Draft';
}

// ==========================================
// STATUS DERIVATION FROM FORM DATA
// ==========================================

interface FormDataForStatus {
    issue_date?: string;
    served_date?: string;
    appearance_date?: string;
    rescheduled_date?: string;
    date_of_1st_statement?: string;
    statement_status?: string;
    followup_required?: boolean;
}

/**
 * Derive the current status from form field values.
 * This is the data-driven approach - status is determined by what data exists.
 * Used in the new LifecycleSummonForm.
 */
export function deriveStatusFromData(data: FormDataForStatus): SummonsStatus {
    // Check from most advanced state backwards

    // Closed: followup_required is explicitly set (ending the lifecycle)
    // Note: We can't auto-detect closed without explicit action

    // Statement Completed: 1st statement recorded AND status indicates complete
    if (data.date_of_1st_statement && data.statement_status === 'Recorded') {
        return 'Statement Completed';
    }

    // Statement In Progress: has 1st statement date but not completed
    if (data.date_of_1st_statement) {
        return 'Statement In Progress';
    }

    // Rescheduled: has a rescheduled date
    if (data.rescheduled_date) {
        return 'Rescheduled';
    }

    // Awaiting Appearance: served and has appearance date set
    if (data.served_date && data.appearance_date) {
        return 'Awaiting Appearance';
    }

    // Served: has served date
    if (data.served_date) {
        return 'Served';
    }

    // Issued: has issue date
    if (data.issue_date) {
        return 'Issued';
    }

    // Default: Draft
    return 'Draft';
}

