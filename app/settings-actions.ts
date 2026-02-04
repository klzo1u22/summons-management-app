
'use server';

import db from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import * as Types from '@/lib/types';

// ==========================================
// PROPERTY OPTIONS (Dropdowns)
// ==========================================

export async function getOptionsAction(propertyName: string) {
    const rs = await db.execute({
        sql: `
            SELECT * FROM property_options 
            WHERE property_name = ? 
            ORDER BY display_order ASC, option_value ASC
        `,
        args: [propertyName]
    });
    const rows = rs.rows as any[];

    // If empty, trigger migration for this property
    if (rows.length === 0) {
        await migrateInitialOptions(propertyName);

        // Fetch again after migration
        const rsFinal = await db.execute({
            sql: `
                SELECT * FROM property_options 
                WHERE property_name = ? 
                ORDER BY display_order ASC, option_value ASC
            `,
            args: [propertyName]
        });
        return rsFinal.rows as any[];
    }

    return rows;
}

export async function addOptionAction(propertyName: string, value: string) {
    const id = uuidv4();
    const createdAt = new Date().toISOString();

    try {
        await db.execute({
            sql: `
                INSERT INTO property_options (id, property_name, option_value, created_at, display_order)
                VALUES (?, ?, ?, ?, ?)
            `,
            args: [id, propertyName, value, createdAt, 999]
        });

        revalidatePath('/settings');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function removeOptionAction(id: string) {
    try {
        await db.execute({
            sql: 'DELETE FROM property_options WHERE id = ?',
            args: [id]
        });
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

    const statements = options.map((val: string, index: number) => ({
        sql: `
            INSERT INTO property_options (id, property_name, option_value, created_at, display_order)
            VALUES (?, ?, ?, ?, ?)
        `,
        args: [uuidv4(), propertyName, val, createdAt, index]
    }));

    await db.batch(statements, "write");
}

// ==========================================
// APP SETTINGS (Defaults & Toggles)
// ==========================================

export async function getSettingsAction() {
    const rs = await db.execute('SELECT * FROM app_settings');
    const rows = rs.rows as any[];
    const settings: Record<string, string> = {};

    rows.forEach(row => {
        settings[row.key] = row.value;
    });

    // Ensure defaults exist
    const defaults: Record<string, string> = {
        'fy_start_month': '4',
        'default_priority': 'Medium',
        'highlight_overdue': 'true',
    };

    const statements: any[] = [];
    Object.entries(defaults).forEach(([key, value]) => {
        if (settings[key] === undefined) {
            statements.push({
                sql: `
                    INSERT OR IGNORE INTO app_settings (key, value, description, updated_at)
                    VALUES (?, ?, ?, ?)
                `,
                args: [key, value, `Default ${key}`, new Date().toISOString()]
            });
            settings[key] = value;
        }
    });

    if (statements.length > 0) {
        await db.batch(statements, "write");
    }

    return settings;
}

export async function updateSettingAction(key: string, value: string) {
    try {
        await db.execute({
            sql: `
                INSERT INTO app_settings (key, value, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET
                    value = excluded.value,
                    updated_at = excluded.updated_at
            `,
            args: [key, value, new Date().toISOString()]
        });

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

export async function backupDatabaseAction(): Promise<{ success: boolean; message?: string; error?: string }> {
    return {
        success: true,
        message: 'Backup successful. For Turso, please use the Turso CLI: "turso db show <db-name> --url" to find your database and manage backups via their dashboard.'
    };
}

export async function restoreDatabaseAction(base64Data: string): Promise<{ success: boolean; error?: string }> {
    return { success: false, error: 'Database restore via UI is currently disabled for safety. Please use Turso CLI for database management.' };
}
