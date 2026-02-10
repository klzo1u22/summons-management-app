
import db from './db';
import { Summons } from './types';

// ==========================================
// HELPERS
// ==========================================

function parseJSON(val: any) {
    if (!val) return [];
    if (typeof val !== 'string') return val;
    try {
        return JSON.parse(val);
    } catch (e) {
        return [];
    }
}

function stringify(val: any) {
    if (!val) return null;
    return JSON.stringify(val);
}

// Helper to convert undefined to null for SQLite/LibSQL
function toDBValue<T>(val: T): T | null {
    return val === undefined ? null : val;
}

function mapSummons(row: any): Summons {
    return {
        ...row,
        mode_of_service: parseJSON(row.mode_of_service),
        purpose: parseJSON(row.purpose),
        is_issued: !!row.is_issued,
        is_served: !!row.is_served,
        requests_reschedule: !!row.requests_reschedule,
        statement_ongoing: !!row.statement_ongoing,
        statement_recorded: !!row.statement_recorded,
        rescheduled_date_communicated: !!row.rescheduled_date_communicated,
        followup_required: !!row.followup_required,
    };
}

// ==========================================
// SUMMONS OPERATIONS
// ==========================================

export async function getAllSummonsFB(): Promise<Summons[]> {
    const rs = await db.execute('SELECT * FROM summons ORDER BY created_at DESC');
    const rows = rs.rows as any[];
    const result = rows.map(mapSummons);
    return JSON.parse(JSON.stringify(result));
}

export async function getSummonByIdFB(id: string): Promise<Summons | null> {
    const rs = await db.execute({
        sql: 'SELECT * FROM summons WHERE id = ?',
        args: [id]
    });
    const row = rs.rows[0] as any;
    if (!row) return null;
    return JSON.parse(JSON.stringify(mapSummons(row)));
}

export async function addSummonsFB(data: Summons): Promise<void> {
    const sql = `
        INSERT INTO summons (
            id, case_id, person_name, person_role, contact_number, email, 
            priority, tone, purpose, notes, issue_date, served_date, 
            mode_of_service, appearance_date, appearance_time, 
            rescheduled_date, rescheduled_date_communicated, 
            statement_status, date_of_1st_statement, date_of_2nd_statement, 
            date_of_3rd_statement, followup_required, summons_response, 
            status, is_issued, is_served, requests_reschedule, 
            statement_ongoing, statement_recorded, previous_summon_id, created_at
        ) VALUES (
            :id, :case_id, :person_name, :person_role, :contact_number, :email, 
            :priority, :tone, :purpose, :notes, :issue_date, :served_date, 
            :mode_of_service, :appearance_date, :appearance_time, 
            :rescheduled_date, :rescheduled_date_communicated, 
            :statement_status, :date_of_1st_statement, :date_of_2nd_statement, 
            :date_of_3rd_statement, :followup_required, :summons_response, 
            :status, :is_issued, :is_served, :requests_reschedule, 
            :statement_ongoing, :statement_recorded, :previous_summon_id, :created_at
        )
    `;

    const args: any = {
        id: toDBValue(data.id),
        case_id: toDBValue(data.case_id),
        person_name: toDBValue(data.person_name),
        person_role: toDBValue(data.person_role),
        contact_number: toDBValue(data.contact_number),
        email: toDBValue(data.email),
        priority: toDBValue(data.priority),
        tone: toDBValue(data.tone),
        purpose: stringify(data.purpose),
        notes: toDBValue(data.notes),
        issue_date: toDBValue(data.issue_date),
        served_date: toDBValue(data.served_date),
        mode_of_service: stringify(data.mode_of_service),
        appearance_date: toDBValue(data.appearance_date),
        appearance_time: toDBValue(data.appearance_time),
        rescheduled_date: toDBValue(data.rescheduled_date),
        rescheduled_date_communicated: data.rescheduled_date_communicated ? 1 : 0,
        statement_status: toDBValue(data.statement_status),
        date_of_1st_statement: toDBValue(data.date_of_1st_statement),
        date_of_2nd_statement: toDBValue(data.date_of_2nd_statement),
        date_of_3rd_statement: toDBValue(data.date_of_3rd_statement),
        followup_required: data.followup_required ? 1 : 0,
        summons_response: toDBValue(data.summons_response),
        status: toDBValue(data.status),
        is_issued: data.is_issued ? 1 : 0,
        is_served: data.is_served ? 1 : 0,
        requests_reschedule: data.requests_reschedule ? 1 : 0,
        statement_ongoing: data.statement_ongoing ? 1 : 0,
        statement_recorded: data.statement_recorded ? 1 : 0,
        previous_summon_id: toDBValue(data.previous_summon_id),
        created_at: data.created_at || new Date().toISOString()
    };

    await db.execute({ sql, args });

    await logActivityFB({
        summons_id: data.id,
        action: 'created',
        description: `Summons created for ${data.person_name}`,
    });
}

export async function updateSummonsFB(id: string, data: Partial<Summons>): Promise<void> {
    const oldData = await getSummonByIdFB(id);
    if (!oldData) return;

    const fields = Object.keys(data);
    if (fields.length === 0) return;

    const setClause = fields.map(f => `${f} = :${f}`).join(', ');
    const sql = `UPDATE summons SET ${setClause} WHERE id = :id_param`;

    const args: any = { ...data, id_param: id };

    // Convert types for LibSQL
    if (args.purpose) args.purpose = stringify(args.purpose);
    if (args.mode_of_service) args.mode_of_service = stringify(args.mode_of_service);
    if (args.is_issued !== undefined) args.is_issued = args.is_issued ? 1 : 0;
    if (args.is_served !== undefined) args.is_served = args.is_served ? 1 : 0;
    if (args.requests_reschedule !== undefined) args.requests_reschedule = args.requests_reschedule ? 1 : 0;
    if (args.statement_ongoing !== undefined) args.statement_ongoing = args.statement_ongoing ? 1 : 0;
    if (args.statement_recorded !== undefined) args.statement_recorded = args.statement_recorded ? 1 : 0;
    if (args.rescheduled_date_communicated !== undefined) args.rescheduled_date_communicated = args.rescheduled_date_communicated ? 1 : 0;
    if (args.followup_required !== undefined) args.followup_required = args.followup_required ? 1 : 0;

    // Sanitize all arg values to null if they are undefined
    Object.keys(args).forEach(key => {
        if (args[key] === undefined) {
            args[key] = null;
        }
    });

    await db.execute({ sql, args });

    await logSummonsUpdatedFB(id, oldData, { ...oldData, ...data } as Summons);
}

export async function deleteSummonsFB(id: string): Promise<void> {
    const data = await getSummonByIdFB(id);

    if (data?.person_name) {
        await logActivityFB({
            summons_id: id,
            action: 'deleted',
            description: `Summons for ${data.person_name} was deleted`
        });
    }

    await db.execute({
        sql: 'DELETE FROM summons WHERE id = ?',
        args: [id]
    });
}

// ==========================================
// CASES OPERATIONS
// ==========================================

export async function getAllCasesFB() {
    const rs = await db.execute(`
        SELECT c.*, 
        (SELECT COUNT(*) FROM summons s WHERE s.case_id = c.id) as total_summons,
        (SELECT COUNT(*) FROM summons s WHERE s.case_id = c.id AND s.status != 'Done') as active_summons
        FROM cases c 
        ORDER BY last_edited DESC
    `);
    const rows = rs.rows as any[];

    const result = rows.map(c => ({
        ...c,
        assigned_officer: parseJSON(c.assigned_officer),
        activity: parseJSON(c.activity),
        active: !!c.active,
        whether_pc_filed: !!c.whether_pc_filed
    }));
    return JSON.parse(JSON.stringify(result));
}

export async function getCaseDetailsFB(id: string) {
    const caseRs = await db.execute({
        sql: 'SELECT * FROM cases WHERE id = ?',
        args: [id]
    });
    const caseRow = caseRs.rows[0] as any;
    if (!caseRow) return null;

    const summonsRs = await db.execute({
        sql: 'SELECT * FROM summons WHERE case_id = ? ORDER BY created_at DESC',
        args: [id]
    });
    const summonsRows = summonsRs.rows as any[];

    const result = {
        case: {
            ...caseRow,
            assigned_officer: parseJSON(caseRow.assigned_officer),
            activity: parseJSON(caseRow.activity),
            active: !!caseRow.active,
            whether_pc_filed: !!caseRow.whether_pc_filed
        },
        summons: summonsRows.map(mapSummons)
    };
    return JSON.parse(JSON.stringify(result));
}

export async function addCaseFB(data: any): Promise<void> {
    const sql = `
        INSERT INTO cases (id, name, status, last_edited, assigned_officer, activity, active, whether_pc_filed)
        VALUES (:id, :name, :status, :last_edited, :assigned_officer, :activity, :active, :whether_pc_filed)
    `;

    const args = {
        ...data,
        assigned_officer: stringify(data.assigned_officer),
        activity: stringify(data.activity),
        active: data.active ? 1 : 0,
        whether_pc_filed: data.whether_pc_filed ? 1 : 0,
        last_edited: data.last_edited || new Date().toISOString()
    };

    await db.execute({ sql, args });
}

export async function updateCaseFB(id: string, data: any): Promise<void> {
    const fields = Object.keys(data);
    if (fields.length === 0) return;

    data.last_edited = new Date().toISOString();
    const setClause = Object.keys(data).map(f => `${f} = :${f}`).join(', ');

    const sql = `UPDATE cases SET ${setClause} WHERE id = :id_param`;

    const args: any = { ...data, id_param: id };
    if (args.assigned_officer) args.assigned_officer = stringify(args.assigned_officer);
    if (args.activity) args.activity = stringify(args.activity);
    if (args.active !== undefined) args.active = args.active ? 1 : 0;
    if (args.whether_pc_filed !== undefined) args.whether_pc_filed = args.whether_pc_filed ? 1 : 0;

    await db.execute({ sql, args });
}

export async function deleteCaseFB(id: string): Promise<void> {
    await db.batch([
        { sql: 'DELETE FROM summons WHERE case_id = ?', args: [id] },
        { sql: 'DELETE FROM cases WHERE id = ?', args: [id] }
    ], "write");
}

// ==========================================
// ACTIVITY LOG OPERATIONS
// ==========================================

interface LogActivityParams {
    summons_id: string;
    user_id?: string;
    action: 'created' | 'updated' | 'deleted' | 'status_changed' | 'field_changed';
    field_name?: string;
    old_value?: string;
    new_value?: string;
    description: string;
    created_at?: string;
}

async function logActivityFB(params: LogActivityParams) {
    const sql = `
        INSERT INTO activity_logs (summons_id, user_id, action, field_name, old_value, new_value, description, created_at)
        VALUES (:summons_id, :user_id, :action, :field_name, :old_value, :new_value, :description, :created_at)
    `;

    const args = {
        summons_id: params.summons_id,
        user_id: params.user_id || 'system',
        action: params.action,
        field_name: params.field_name || null,
        old_value: params.old_value || null,
        new_value: params.new_value || null,
        description: params.description,
        created_at: params.created_at || new Date().toISOString()
    };

    await db.execute({ sql, args });
}

export async function getActivityLogsFB(summonsId: string) {
    const rs = await db.execute({
        sql: 'SELECT * FROM activity_logs WHERE summons_id = ? ORDER BY created_at DESC',
        args: [summonsId]
    });
    return JSON.parse(JSON.stringify(rs.rows));
}

const FIELD_LABELS: Record<string, string> = {
    person_name: 'Person Name',
    person_role: 'Person Role',
    case_id: 'Case',
    contact_number: 'Contact Number',
    email: 'Email',
    priority: 'Priority',
    tone: 'Tone',
    purpose: 'Purpose',
    notes: 'Notes',
    issue_date: 'Issue Date',
    served_date: 'Served Date',
    mode_of_service: 'Mode of Service',
    appearance_date: 'Appearance Date',
    appearance_time: 'Appearance Time',
    rescheduled_date: 'Rescheduled Date',
    rescheduled_date_communicated: 'Rescheduled Date Communicated',
    statement_status: 'Statement Status',
    date_of_1st_statement: '1st Statement Date',
    date_of_2nd_statement: '2nd Statement Date',
    date_of_3rd_statement: '3rd Statement Date',
    followup_required: 'Follow-up Required',
    summons_response: 'Summons Response',
    status: 'Status',
};

async function logSummonsUpdatedFB(summonsId: string, oldData: Summons, newData: Summons) {
    const changes: string[] = [];
    const fieldsToCheck = Object.keys(FIELD_LABELS) as (keyof Summons)[];

    for (const field of fieldsToCheck) {
        const oldVal = oldData[field];
        const newVal = newData[field];

        if (oldVal === newVal) continue;

        const oldStr = Array.isArray(oldVal) ? JSON.stringify(oldVal) : String(oldVal || '');
        const newStr = Array.isArray(newVal) ? JSON.stringify(newVal) : String(newVal || '');

        if (oldStr !== newStr) {
            const label = FIELD_LABELS[field] || field;
            await logActivityFB({
                summons_id: summonsId,
                action: field === 'status' ? 'status_changed' : 'field_changed',
                field_name: field,
                old_value: oldStr || '(empty)',
                new_value: newStr || '(empty)',
                description: `${label} changed from "${oldStr}" to "${newStr}"`,
            });
            changes.push(label);
        }
    }

    if (changes.length > 0) {
        await logActivityFB({
            summons_id: summonsId,
            action: 'updated',
            description: `Updated: ${changes.join(', ')}`,
        });
    }
}

export async function getRecentActivityFB() {
    const caseRs = await db.execute(`
        SELECT id, 'case' as type, name as title, status, last_edited as timestamp
        FROM cases ORDER BY last_edited DESC LIMIT 10
    `);

    const summonsRs = await db.execute(`
        SELECT id, 'summons' as type, person_name as title, status, created_at as timestamp, case_id as caseId
        FROM summons ORDER BY created_at DESC LIMIT 10
    `);

    const activities = [...(caseRs.rows as any[]), ...(summonsRs.rows as any[])];

    const result = activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);

    return JSON.parse(JSON.stringify(result));
}
