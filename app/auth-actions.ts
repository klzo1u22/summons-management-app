'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/lib/firebase-admin';
import { hashPassword, comparePassword, encrypt, AuthUser } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function signupAction(formData: FormData) {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;

    if (!email || !password || !firstName || !lastName) {
        return { error: 'All fields are required' };
    }

    // Check if user exists
    const userQuery = await db.collection('users').where('email', '==', email).limit(1).get();
    if (!userQuery.empty) {
        return { error: 'Email already registered' };
    }

    const id = uuidv4();
    const passwordHash = await hashPassword(password);
    const createdAt = new Date().toISOString();

    // Check if this is the first user - they will be the admin
    const allUsersSnap = await db.collection('users').count().get();
    const userCount = allUsersSnap.data().count;
    const role = userCount === 0 ? 'admin' : 'user';
    const status = userCount === 0 ? 'active' : 'pending';

    try {
        await db.collection('users').doc(id).set({
            id,
            email,
            password_hash: passwordHash,
            first_name: firstName,
            last_name: lastName,
            role,
            status,
            created_at: createdAt
        });

        if (status === 'pending') {
            return { error: 'Registration successful! Your account is pending admin approval.', success: true };
        }

        // Create session for active users (like the first admin)
        const user: AuthUser = { id, email, firstName, lastName, role, status };
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const session = await encrypt({ user, expires });

        (await cookies()).set('session', session, { expires, httpOnly: true });
    } catch (error) {
        console.error('Signup error:', error);
        return { error: 'Failed to create account' };
    }

    redirect('/');
}

export async function loginAction(formData: FormData) {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
        return { error: 'Email and password are required' };
    }

    const userQuery = await db.collection('users').where('email', '==', email).limit(1).get();

    if (userQuery.empty) {
        return { error: 'Invalid email or password' };
    }

    const userRecord = userQuery.docs[0].data();

    if (!(await comparePassword(password, userRecord.password_hash))) {
        return { error: 'Invalid email or password' };
    }

    if (userRecord.status === 'pending') {
        return { error: 'Your account is pending admin approval. Please check back later.' };
    }

    if (userRecord.status === 'disabled') {
        return { error: 'Your account has been disabled. Please contact an administrator.' };
    }

    const user: AuthUser = {
        id: userRecord.id, // Firestore doc ID is same as 'id' field usually, but best to use field if set
        email: userRecord.email,
        firstName: userRecord.first_name,
        lastName: userRecord.last_name,
        role: userRecord.role,
        status: userRecord.status
    };

    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const session = await encrypt({ user, expires });

    (await cookies()).set('session', session, { expires, httpOnly: true });

    redirect('/');
}

export async function logoutAction() {
    (await cookies()).set('session', '', { expires: new Date(0) });
    redirect('/login');
}

export async function getAuthUser(): Promise<AuthUser | null> {
    const session = (await cookies()).get('session')?.value;
    if (!session) return null;

    try {
        const { decrypt } = await import('@/lib/auth');
        const payload = await decrypt(session);
        return payload.user;
    } catch (error) {
        return null;
    }
}

// Admin Actions
export async function getAllUsers() {
    const user = await getAuthUser();
    if (!user || user.role !== 'admin') {
        throw new Error('Unauthorized');
    }

    const snapshot = await db.collection('users').orderBy('created_at', 'desc').get();
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: data.id,
            email: data.email,
            firstName: data.first_name,
            lastName: data.last_name,
            role: data.role,
            status: data.status,
            createdAt: data.created_at
        };
    });
}

export async function updateUserStatus(userId: string, status: 'active' | 'pending' | 'disabled') {
    const user = await getAuthUser();
    if (!user || user.role !== 'admin') {
        throw new Error('Unauthorized');
    }

    await db.collection('users').doc(userId).update({ status });
    return { success: true };
}

export async function updateUserRole(userId: string, role: 'admin' | 'user') {
    const user = await getAuthUser();
    if (!user || user.role !== 'admin') {
        throw new Error('Unauthorized');
    }

    await db.collection('users').doc(userId).update({ role });
    return { success: true };
}

export async function deleteUser(userId: string) {
    const user = await getAuthUser();
    if (!user || user.role !== 'admin') {
        throw new Error('Unauthorized');
    }

    // Don't allow admin to delete themselves
    if (user.id === userId) {
        return { error: 'You cannot delete your own account' };
    }

    await db.collection('users').doc(userId).delete();
    return { success: true };
}
