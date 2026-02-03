'use server';

import { db } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import * as Types from '@/lib/types';
import { Timestamp } from 'firebase-admin/firestore';

// ==========================================
// PROPERTY OPTIONS (Dropdowns)
// ==========================================

export async function getOptionsAction(propertyName: string) {
    const snapshot = await db.collection('property_options')
        .where('property_name', '==', propertyName)
        .orderBy('display_order', 'asc')
        .orderBy('option_value', 'asc')
        .get();

    // If empty, trigger migration for this property
    if (snapshot.empty) {
        await migrateInitialOptions(propertyName);

        // Fetch again after migration
        const recheck = await db.collection('property_options')
            .where('property_name', '==', propertyName)
            .orderBy('display_order', 'asc')
            .orderBy('option_value', 'asc')
            .get();
        return recheck.docs.map(doc => doc.data());
    }

    return snapshot.docs.map(doc => doc.data());
}

export async function addOptionAction(propertyName: string, value: string) {
    const id = uuidv4();
    const createdAt = new Date().toISOString();

    try {
        await db.collection('property_options').doc(id).set({
            id,
            property_name: propertyName,
            option_value: value,
            created_at: createdAt,
            display_order: 999 // Default to end
        });

        revalidatePath('/settings');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function removeOptionAction(id: string) {
    try {
        await db.collection('property_options').doc(id).delete();
        revalidatePath('/settings');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

async function migrateInitialOptions(propertyName: string) {
    const mapping: Record<string, any> = {
        'person_role': Types.PERSON_ROLE_OPTIONS,
        'priority': Types.PRIORITY_OPTIONS,
        'tone': Types.TONE_OPTIONS,
        'purpose': Types.PURPOSE_OPTIONS,
        'mode_of_service': Types.MODE_OF_SERVICE_OPTIONS,
        'statement_status': Types.STATEMENT_STATUS_OPTIONS,
        'summons_response': Types.SUMMONS_RESPONSE_OPTIONS,
        'case_status': Types.CASE_STATUS_OPTIONS,
        'assigned_officer': Types.ASSIGNED_OFFICER_OPTIONS,
        'activity': Types.ACTIVITY_OPTIONS,
    };

    const options = mapping[propertyName];
    if (!options) return;

    const createdAt = new Date().toISOString();
    const batch = db.batch();

    options.forEach((val: string, index: number) => {
        const id = uuidv4();
        const ref = db.collection('property_options').doc(id);
        batch.set(ref, {
            id,
            property_name: propertyName,
            option_value: val,
            created_at: createdAt,
            display_order: index
        });
    });

    await batch.commit();
}

// ==========================================
// APP SETTINGS (Defaults & Toggles)
// ==========================================

export async function getSettingsAction() {
    const snapshot = await db.collection('app_settings').get();
    const settings: Record<string, string> = {};

    snapshot.docs.forEach(doc => {
        const data = doc.data();
        settings[data.key] = data.value;
    });

    // Ensure defaults exist
    const defaults: Record<string, string> = {
        'fy_start_month': '4',
        'default_priority': 'Medium',
        'highlight_overdue': 'true',
    };

    let updated = false;
    const batch = db.batch();

    Object.entries(defaults).forEach(([key, value]) => {
        if (settings[key] === undefined) {
            const ref = db.collection('app_settings').doc(key);
            batch.set(ref, {
                key,
                value,
                description: `Default ${key}`,
                updated_at: new Date().toISOString()
            });
            settings[key] = value;
            updated = true;
        }
    });

    if (updated) {
        await batch.commit();
    }

    return settings;
}

export async function updateSettingAction(key: string, value: string) {
    try {
        await db.collection('app_settings').doc(key).set({
            key,
            value,
            updated_at: new Date().toISOString()
        }, { merge: true });

        revalidatePath('/settings');
        revalidatePath('/');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ==========================================
// BACKUP & RESTORE
// ==========================================

export async function backupDatabaseAction() {
    // Backup functionality temporarily disabled during Firestore migration.
    // Future implementation could export JSON data.
    return { success: false, error: 'Backup feature is currently unavailable with Firestore backend.' };
}

export async function restoreDatabaseAction(base64Data: string) {
    // Restore functionality temporarily disabled during Firestore migration.
    return { success: false, error: 'Restore feature is currently unavailable with Firestore backend.' };
}
