'use server';

import { db } from '@/lib/firebase-admin';
import { hashPassword, comparePassword } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { getAuthUser } from './auth-actions';

export async function getUserInfoAction() {
    const user = await getAuthUser();
    if (!user) {
        throw new Error('Not authenticated');
    }

    const doc = await db.collection('users').doc(user.id).get();

    if (!doc.exists) {
        return null;
    }

    const data = doc.data();
    return {
        id: data?.id,
        first_name: data?.first_name,
        last_name: data?.last_name,
        email: data?.email,
        created_at: data?.created_at
    };
}

export async function updateUserInfoAction(data: { firstName: string; lastName: string; email: string }) {
    const user = await getAuthUser();
    if (!user) return { error: 'Not authenticated' };

    if (!data.firstName || !data.lastName || !data.email) {
        return { error: 'All fields are required' };
    }

    // Check if email is taken by another user
    const emailQuery = await db.collection('users').where('email', '==', data.email).limit(1).get();
    if (!emailQuery.empty) {
        const otherUser = emailQuery.docs[0];
        if (otherUser.id !== user.id) {
            return { error: 'Email already registered by another user' };
        }
    }

    try {
        await db.collection('users').doc(user.id).update({
            first_name: data.firstName,
            last_name: data.lastName,
            email: data.email,
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
        const userDoc = await db.collection('users').doc(user.id).get();
        if (!userDoc.exists) {
            return { error: 'User not found' };
        }

        const userData = userDoc.data();
        if (!userData || !(await comparePassword(data.currentPassword, userData.password_hash))) {
            return { error: 'Incorrect current password' };
        }

        const newHash = await hashPassword(data.newPassword);

        await db.collection('users').doc(user.id).update({
            password_hash: newHash,
        });

        return { success: 'Password updated successfully' };
    } catch (error) {
        console.error('Update password error:', error);
        return { error: 'Failed to update password' };
    }
}
