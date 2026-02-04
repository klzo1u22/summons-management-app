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

