
'use server';

import db from '@/lib/db';
import { hashPassword, comparePassword } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { getAuthUser } from './auth-actions';

export async function getUserInfoAction() {
    const user = await getAuthUser();
    if (!user) {
        throw new Error('Not authenticated');
    }

    const rs = await db.execute({
        sql: 'SELECT * FROM users WHERE id = ?',
        args: [user.id]
    });
    const data = rs.rows[0] as any;

    if (!data) {
        return null;
    }

    return {
        id: data.id,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        created_at: data.created_at
    };
}

export async function updateUserInfoAction(data: { firstName: string; lastName: string; email: string }) {
    const user = await getAuthUser();
    if (!user) return { error: 'Not authenticated' };

    if (!data.firstName || !data.lastName || !data.email) {
        return { error: 'All fields are required' };
    }

    // Check if email is taken by another user
    const rs = await db.execute({
        sql: 'SELECT id FROM users WHERE email = ? AND id != ?',
        args: [data.email, user.id]
    });
    if (rs.rows[0]) {
        return { error: 'Email already registered by another user' };
    }

    try {
        await db.execute({
            sql: `
                UPDATE users 
                SET first_name = :firstName, last_name = :lastName, email = :email
                WHERE id = :id
            `,
            args: {
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
                id: user.id
            }
        });

        revalidatePath('/profile');
        return { success: 'Profile updated successfully' };
    } catch (error) {
        console.error('Update profile error:', error);
        return { error: 'Failed to update profile' };
    }
}

export async function updatePasswordAction(data: { currentPassword: string; newPassword: string }) {
    const user = await getAuthUser();
    if (!user) return { error: 'Not authenticated' };

    try {
        const rs = await db.execute({
            sql: 'SELECT password_hash FROM users WHERE id = ?',
            args: [user.id]
        });
        const userData = rs.rows[0] as any;
        if (!userData) {
            return { error: 'User not found' };
        }

        if (!(await comparePassword(data.currentPassword, userData.password_hash))) {
            return { error: 'Incorrect current password' };
        }

        const newHash = await hashPassword(data.newPassword);

        await db.execute({
            sql: 'UPDATE users SET password_hash = ? WHERE id = ?',
            args: [newHash, user.id]
        });

        return { success: 'Password updated successfully' };
    } catch (error) {
        console.error('Update password error:', error);
        return { error: 'Failed to update password' };
    }
}
