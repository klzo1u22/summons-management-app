
import { db } from './firebase-admin';
import { Summons } from './types';
import { getAuthUser } from '@/app/auth-actions';

// ==========================================
// TYPES & CONVERTERS
// ==========================================

// Firestore data converter (optional, but good for type safety)
const summonsConverter = {
    toFirestore(data: Summons): FirebaseFirestore.DocumentData {
        return { ...data };
    },
    fromFirestore(snapshot: FirebaseFirestore.QueryDocumentSnapshot): Summons {
        const data = snapshot.data();
        return data as Summons;
    }
};

const caseConverter = {
    toFirestore(data: any): FirebaseFirestore.DocumentData {
        return { ...data };
    },
    fromFirestore(snapshot: FirebaseFirestore.QueryDocumentSnapshot): any {
        const data = snapshot.data();
        return data; // Typed as any to match existing codebase flexibility
    }
};

// ==========================================
// SUMMONS OPERATIONS
// ==========================================

export async function getAllSummonsFB(): Promise<Summons[]> {
    const snapshot = await db.collection('summons')
        .orderBy('created_at', 'desc')
        .withConverter(summonsConverter)
        .get();

    return snapshot.docs.map(doc => doc.data());
}

export async function getSummonByIdFB(id: string): Promise<Summons | null> {
    const doc = await db.collection('summons').doc(id).withConverter(summonsConverter).get();
    if (!doc.exists) return null;
    return doc.data() || null;
}

export async function addSummonsFB(data: Summons): Promise<void> {
    // Convert arrays/objects to Firestore supported types (Firestore supports arrays/maps natively)
    // The previous SQLite implementation used JSON.stringify, but Firestore doesn't need that.
    // However, to maintain compatibility if the rest of the app expects JSON strings or specific structures,
    // we should check. The 'types.ts' likely defines them as arrays/objects, so we can store them directly.

    // Cleaning undefined values as Firestore doesn't like them
    const clearData = JSON.parse(JSON.stringify(data));

    await db.collection('summons').doc(data.id).set(clearData);

    await logActivityFB({
        summons_id: data.id,
        action: 'created',
        description: `Summons created for ${data.person_name}`,
    });
}

export async function updateSummonsFB(id: string, data: Partial<Summons>): Promise<void> {
    const ref = db.collection('summons').doc(id);
    const snap = await ref.get();

    if (!snap.exists) return;
    const oldData = snap.data() as Summons;

    // Clean undefineds
    const cleanUpdates = JSON.parse(JSON.stringify(data));

    await ref.update(cleanUpdates);

    await logSummonsUpdatedFB(id, oldData, data as Summons);
}

export async function deleteSummonsFB(id: string): Promise<void> {
    // Get data for logging
    const doc = await db.collection('summons').doc(id).get();
    const data = doc.data();

    await db.collection('summons').doc(id).delete();

    if (data?.person_name) {
        await logActivityFB({
            summons_id: id,
            action: 'deleted',
            description: `Summons for ${data.person_name} was deleted`
        });
    }
}

// ==========================================
// CASES OPERATIONS
// ==========================================

export async function getAllCasesFB() {
    const casesSnap = await db.collection('cases').orderBy('last_edited', 'desc').withConverter(caseConverter).get();
    const cases = casesSnap.docs.map(doc => doc.data());

    // In SQL we did a join to get counts. In Firestore, doing N+1 count queries is expensive.
    // Optimization: Store counts on the case document itself (counter caching).
    // Fallback for now (migration phase): Fetch ALL summons once and aggregate in memory.
    // This is better than N queries.

    const summonsSnap = await db.collection('summons').select('case_id', 'status').get();
    const summons = summonsSnap.docs.map(d => d.data());

    return cases.map(c => {
        const caseSummons = summons.filter((s: any) => s.case_id === c.id);
        return {
            ...c,
            total_summons: caseSummons.length,
            active_summons: caseSummons.filter((s: any) => s.status !== 'Done').length,
            // Ensure compatibility with existing component expectations (cleaning any parsing residues)
            assigned_officer: c.assigned_officer || [],
            activity: c.activity || [],
            active: !!c.active,
            whether_pc_filed: !!c.whether_pc_filed
        };
    });
}

export async function getCaseDetailsFB(id: string) {
    const caseDoc = await db.collection('cases').doc(id).withConverter(caseConverter).get();
    if (!caseDoc.exists) return null;

    const summonsSnap = await db.collection('summons')
        .where('case_id', '==', id)
        .orderBy('created_at', 'desc')
        .withConverter(summonsConverter)
        .get();

    return {
        case: caseDoc.data(),
        summons: summonsSnap.docs.map(d => d.data())
    };
}

export async function addCaseFB(data: any): Promise<void> {
    const cleanData = JSON.parse(JSON.stringify(data));
    await db.collection('cases').doc(data.id).set(cleanData);
}

export async function updateCaseFB(id: string, data: any): Promise<void> {
    const cleanData = JSON.parse(JSON.stringify(data));
    // Always update last_edited
    cleanData.last_edited = new Date().toISOString();

    await db.collection('cases').doc(id).update(cleanData);
}

export async function deleteCaseFB(id: string): Promise<void> {
    // Delete associated summons
    const summonsSnap = await db.collection('summons').where('case_id', '==', id).get();
    const batch = db.batch();

    summonsSnap.docs.forEach(doc => {
        batch.delete(doc.ref);
    });

    batch.delete(db.collection('cases').doc(id));
    await batch.commit();
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
    created_at?: string; // Optional override
}

async function logActivityFB(params: LogActivityParams) {
    const user_id = params.user_id || 'system'; // Requires auth context if strictly tracking user

    await db.collection('activity_logs').add({
        ...params,
        user_id,
        created_at: params.created_at || new Date().toISOString()
    });
}

export async function getActivityLogsFB(summonsId: string) {
    const snap = await db.collection('activity_logs')
        .where('summons_id', '==', summonsId)
        .orderBy('created_at', 'desc')
        .get();

    // Need to join with users manually if user names are needed
    // For now, returning raw logs. 
    // Optimization: Store user_name in activity_log to avoid join.
    // Or fetch known users.

    return snap.docs.map(d => d.data());
}

// Field labels for activity log
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
        // Firestore data might not be strings, might be arrays directly.
        // Comparison needs to be careful.
        const oldVal = oldData[field];
        const newVal = newData[field];

        if (!oldVal && !newVal) continue;

        const oldStr = JSON.stringify(oldVal);
        const newStr = JSON.stringify(newVal);

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
    // This is hard to replicate exactly efficiently in NoSQL without a dedicated 'feed' collection.
    // The previous SQL queried both cases and summons and sorted them.

    // We will fetch top 10 from both and merge, then slice.
    const casesPromise = db.collection('cases').orderBy('last_edited', 'desc').limit(10).get();
    const summonsPromise = db.collection('summons').orderBy('created_at', 'desc').limit(10).get();

    const [casesSnap, summonsSnap] = await Promise.all([casesPromise, summonsPromise]);

    const activities: any[] = [];

    casesSnap.docs.forEach(doc => {
        const c = doc.data();
        activities.push({
            id: c.id,
            type: "case",
            title: c.name,
            status: c.status,
            timestamp: c.last_edited,
            officer: Array.isArray(c.assigned_officer) && c.assigned_officer.length > 0 ? c.assigned_officer[0] : undefined
        });
    });

    summonsSnap.docs.forEach(doc => {
        const s = doc.data();
        activities.push({
            id: s.id,
            type: "summons",
            title: s.person_name,
            status: s.status,
            timestamp: s.created_at,
            caseId: s.case_id
        });
    });

    // Sort and take top 10
    return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);
}
