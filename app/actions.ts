'use server';

import {
    getAllSummonsFB,
    getSummonByIdFB,
    addSummonsFB,
    updateSummonsFB,
    deleteSummonsFB,
    getAllCasesFB,
    getCaseDetailsFB,
    addCaseFB,
    updateCaseFB,
    deleteCaseFB,
    getRecentActivityFB,
    getActivityLogsFB
} from '@/lib/sqlite-data';
import { Summons } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { syncCases } from '@/lib/sync-cases';
import { syncSummons } from '@/lib/sync';

// ==========================================
// SUMMONS ACTIONS
// ==========================================

export async function getSummonsAction(): Promise<Summons[]> {
    return await getAllSummonsFB();
}

export async function getCasesAction() {
    return await getAllCasesFB();
}

export async function getCaseDetailsAction(id: string) {
    return await getCaseDetailsFB(id);
}

export async function addSummonsAction(data: Summons): Promise<void> {
    await addSummonsFB(data);

    try {
        const { pushToNotion } = await import('@/lib/notion-write');
        await pushToNotion('summons', data.id);
    } catch (e) {
        console.error("Background Sync Failed:", e);
    }

    revalidatePath('/');
    revalidatePath('/cases');
    if (data.case_id) revalidatePath(`/cases/${data.case_id}`);
}

export async function deleteSummonsAction(id: string): Promise<void> {
    await deleteSummonsFB(id);

    try {
        const { archiveInNotion } = await import('@/lib/notion-write');
        await archiveInNotion(id);
    } catch (e) {
        console.error("Background Archival Failed:", e);
    }

    revalidatePath('/');
    revalidatePath('/cases');
}

export async function updateSummonsAction(id: string, data: Partial<Summons>): Promise<void> {
    await updateSummonsFB(id, data);

    try {
        const { pushToNotion } = await import('@/lib/notion-write');
        await pushToNotion('summons', id);
    } catch (e) {
        console.error("Background Sync Failed:", e);
    }

    revalidatePath('/');
    revalidatePath('/cases');
    if (data.case_id) revalidatePath(`/cases/${data.case_id}`);
}

export async function getSummonByIdAction(id: string): Promise<Summons | null> {
    return await getSummonByIdFB(id);
}

export async function syncDataAction() {
    await syncCases(); // Sync cases first for foreign key integrity
    return await syncSummons();
}

export async function getRecentActivityAction() {
    return await getRecentActivityFB();
}

// ==========================================
// CASE ACTIONS
// ==========================================

export async function addCaseAction(data: any): Promise<void> {
    await addCaseFB(data);

    try {
        const { pushToNotion } = await import('@/lib/notion-write');
        await pushToNotion('case', data.id);
    } catch (e) {
        console.error("Background Sync Failed:", e);
    }

    revalidatePath('/cases');
}

export async function updateCaseAction(id: string, data: any): Promise<void> {
    await updateCaseFB(id, data);

    try {
        const { pushToNotion } = await import('@/lib/notion-write');
        await pushToNotion('case', id);
    } catch (e) {
        console.error("Background Sync Failed:", e);
    }

    revalidatePath('/cases');
    revalidatePath(`/cases/${id}`);
}

export async function deleteCaseAction(id: string): Promise<void> {
    await deleteCaseFB(id);

    try {
        const { archiveInNotion } = await import('@/lib/notion-write');
        await archiveInNotion(id);
    } catch (e) {
        console.error("Background Archival Failed:", e);
    }

    revalidatePath('/cases');
}

export async function getActivityLogsAction(summonsId: string) {
    return await getActivityLogsFB(summonsId);
}

/**
 * Helper to find a case ID by fuzzy name matching
 */
async function findCaseIdByName(name: string): Promise<string | null> {
    if (!name) return null;
    const cases = await getAllCasesFB();
    const lowerName = name.toLowerCase();

    // Direct match first
    const exact = cases.find((c: any) => c.name.toLowerCase() === lowerName || c.ecir_no.toLowerCase() === lowerName);
    if (exact) return exact.id;

    // Partial match
    const partial = cases.find((c: any) => c.name.toLowerCase().includes(lowerName) || c.ecir_no.toLowerCase().includes(lowerName));
    if (partial) return partial.id;

    return null;
}

// ==========================================
// CHAT API FUNCTIONS (for AI chatbot)
// ==========================================

import { SummonsStatus } from '@/lib/summons-state-machine';

/**
 * Input type for creating summons from chat - accepts flexible field names
 */
interface ChatSummonInput {
    name?: string;
    person_name?: string;
    case_id?: string;
    role_of_person?: string;
    person_role?: string;
    date_of_summon_issue?: string;
    issue_date?: string;
    date_of_appearance?: string;
    appearance_date?: string;
    served_date?: string;
    rescheduled_date?: string;
    mode_of_service?: string[];
    statement_status?: string;
    notes?: string;
    is_issued?: boolean;
    is_served?: boolean;
    statement_ongoing?: boolean;
    statement_recorded?: boolean;
    requests_reschedule?: boolean;
}

/**
 * Create a new summon from chat - returns the created record with sync status
 */
export async function createSummon(data: ChatSummonInput): Promise<Summons & { notion_synced: boolean }> {
    const id = crypto.randomUUID();
    const personName = data.person_name || data.name || 'Unknown';
    let caseId = data.case_id || '';

    // Try to find case ID if not provided but name is
    if (!caseId && data.case_id) {
        // If case_id was passed as a name (common in AI payload), try to lookup
        const lookupId = await findCaseIdByName(data.case_id);
        if (lookupId) caseId = lookupId;
    }

    // Auto-set status to 'Issued' if date is present and status is Draft
    let status = 'Draft' as SummonsStatus;
    if (data.statement_status) status = data.statement_status as SummonsStatus; // Respect explicit status

    // If we have an issue date, it implies it's at least Issued
    if ((data.date_of_summon_issue || data.issue_date) && status === 'Draft') {
        status = 'Issued';
    }

    const summonData: Summons = {
        id,
        person_name: personName,
        case_id: caseId,
        person_role: data.role_of_person || data.person_role || null,
        status: status,
        statement_status: data.statement_status || 'Drafting',
        issue_date: data.date_of_summon_issue || data.issue_date || null,
        appearance_date: data.date_of_appearance || data.appearance_date || null,
        served_date: data.served_date || null,
        rescheduled_date: data.rescheduled_date || null,
        mode_of_service: data.mode_of_service || [],
        notes: data.notes || null,
        is_issued: data.is_issued || (status !== 'Draft'), // Auto-flag
        is_served: data.is_served || false,
        statement_ongoing: data.statement_ongoing || false,
        statement_recorded: data.statement_recorded || false,
        requests_reschedule: data.requests_reschedule || false,
        created_at: new Date().toISOString(),
    };

    await addSummonsFB(summonData);

    let notion_synced = false;
    try {
        const { pushToNotion } = await import('@/lib/notion-write');
        await pushToNotion('summons', id);
        notion_synced = true;
    } catch (e) {
        console.error("Background Sync Failed:", e);
    }

    revalidatePath('/');
    revalidatePath('/cases');
    if (caseId) revalidatePath(`/cases/${caseId}`);

    return { ...summonData, notion_synced };
}

/**
 * Update an existing summon from chat - returns sync status
 */
export async function updateSummon(id: string, data: Record<string, unknown>): Promise<{ notion_synced: boolean }> {
    // Map chat field names to database field names
    const mappedData: Partial<Summons> = {};

    if (data.name || data.person_name) {
        mappedData.person_name = (data.person_name || data.name) as string;
    }
    if (data.role_of_person || data.person_role) {
        mappedData.person_role = (data.role_of_person || data.person_role) as string;
    }
    if (data.date_of_summon_issue || data.issue_date) {
        mappedData.issue_date = (data.date_of_summon_issue || data.issue_date) as string;
    }
    if (data.date_of_appearance || data.appearance_date) {
        mappedData.appearance_date = (data.date_of_appearance || data.appearance_date) as string;
    }
    if (data.statement_status) {
        mappedData.statement_status = data.statement_status as string;
    }
    if (data.served_date) {
        mappedData.served_date = data.served_date as string;
    }
    if (data.rescheduled_date) {
        mappedData.rescheduled_date = data.rescheduled_date as string;
    }
    if (data.notes) {
        mappedData.notes = data.notes as string;
    }
    if (typeof data.is_issued === 'boolean') {
        mappedData.is_issued = data.is_issued;
    }
    if (typeof data.is_served === 'boolean') {
        mappedData.is_served = data.is_served;
    }
    if (typeof data.statement_ongoing === 'boolean') {
        mappedData.statement_ongoing = data.statement_ongoing;
    }
    if (typeof data.statement_recorded === 'boolean') {
        mappedData.statement_recorded = data.statement_recorded;
    }

    await updateSummonsFB(id, mappedData);

    let notion_synced = false;
    try {
        const { pushToNotion } = await import('@/lib/notion-write');
        await pushToNotion('summons', id);
        notion_synced = true;
    } catch (e) {
        console.error("Background Sync Failed:", e);
    }

    revalidatePath('/');
    revalidatePath('/cases');

    return { notion_synced };
}

/**
 * Search summons by query string (name, case_id, role)
 */
export async function searchSummons(query: string): Promise<Summons[]> {
    const allSummons = await getAllSummonsFB();

    if (!query || query.trim() === '') {
        return allSummons.slice(0, 10); // Return first 10 if no query
    }

    const lowerQuery = query.toLowerCase();
    return allSummons.filter((s: Summons) =>
        (s.person_name && s.person_name.toLowerCase().includes(lowerQuery)) ||
        (s.case_id && s.case_id.toLowerCase().includes(lowerQuery)) ||
        (s.person_role && s.person_role.toLowerCase().includes(lowerQuery))
    ).slice(0, 10);
}
