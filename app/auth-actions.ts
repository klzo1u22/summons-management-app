
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import db from '@/lib/db';
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
    const existingUserRs = await db.execute({
        sql: 'SELECT id FROM users WHERE email = ?',
        args: [email]
    });
    if (existingUserRs.rows[0]) {
        return { error: 'Email already registered' };
    }

    const id = uuidv4();
    const passwordHash = await hashPassword(password);
    const createdAt = new Date().toISOString();

    // Check if this is the first user - they will be the admin
    const userCountRs = await db.execute('SELECT COUNT(*) as count FROM users');
    const userCount = Number(userCountRs.rows[0]?.count || 0);
    const role = userCount === 0 ? 'admin' : 'user';
    const status = userCount === 0 ? 'active' : 'pending';

    try {
        await db.execute({
            sql: `
                INSERT INTO users (id, email, password_hash, first_name, last_name, role, status, created_at)
                VALUES (:id, :email, :passwordHash, :firstName, :lastName, :role, :status, :createdAt)
            `,
            args: { id, email, passwordHash, firstName, lastName, role, status, createdAt }
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

    const rs = await db.execute({
        sql: 'SELECT * FROM users WHERE email = ?',
        args: [email]
    });
    const userRecord = rs.rows[0] as any;

    if (!userRecord) {
        return { error: 'Invalid email or password' };
    }

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
        id: userRecord.id,
        email: userRecord.email,
        firstName: userRecord.first_name,
        lastName: userRecord.last_name,
        role: userRecord.role as any,
        status: userRecord.status as any
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
    const sessionCookie = (await cookies()).get('session');
    const session = sessionCookie?.value;
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

    const rs = await db.execute('SELECT * FROM users ORDER BY created_at DESC');
    const rows = rs.rows as any[];
    return rows.map(row => ({
        id: row.id,
        email: row.email,
        firstName: row.first_name,
        lastName: row.last_name,
        role: row.role,
        status: row.status,
        createdAt: row.created_at
    }));
}

export async function updateUserStatus(userId: string, status: 'active' | 'pending' | 'disabled') {
    const user = await getAuthUser();
    if (!user || user.role !== 'admin') {
        throw new Error('Unauthorized');
    }

    await db.execute({
        sql: 'UPDATE users SET status = ? WHERE id = ?',
        args: [status, userId]
    });
    return { success: true };
}

export async function updateUserRole(userId: string, role: 'admin' | 'user') {
    const user = await getAuthUser();
    if (!user || user.role !== 'admin') {
        throw new Error('Unauthorized');
    }

    await db.execute({
        sql: 'UPDATE users SET role = ? WHERE id = ?',
        args: [role, userId]
    });
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

    await db.execute({
        sql: 'DELETE FROM users WHERE id = ?',
        args: [userId]
    });
    return { success: true };
}
