'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Lock, CheckCircle, AlertCircle, Loader2, Save, ArrowLeft } from 'lucide-react';
import { getUserInfoAction, updateUserInfoAction, updatePasswordAction } from '../profile-actions';
import Link from 'next/link';

export default function ProfilePage() {
    const [user, setUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    // Form states
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');

    // Password states
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        setIsLoading(true);
        try {
            const userData = await getUserInfoAction();
            setUser(userData);
            if (userData) {
                setFirstName(userData.first_name || '');
                setLastName(userData.last_name || '');
                setEmail(userData.email || '');
            }
        } catch (error) {
            console.error('Failed to load user:', error);
            // No user data found or not authenticated
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateInfo = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage(null);

        const res = await updateUserInfoAction({ firstName, lastName, email });
        if (res.success) {
            setMessage({ text: 'Profile updated successfully!', type: 'success' });
            await loadUser();
        } else {
            setMessage({ text: res.error || 'Failed to update profile', type: 'error' });
        }
        setIsSaving(false);
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setMessage({ text: 'New passwords do not match', type: 'error' });
            return;
        }

        setIsSaving(true);
        setMessage(null);

        const res = await updatePasswordAction({ currentPassword, newPassword });
        if (res.success) {
            setMessage({ text: 'Password changed successfully!', type: 'success' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } else {
            setMessage({ text: res.error || 'Failed to update password', type: 'error' });
        }
        setIsSaving(false);
    };

    if (isLoading && !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-[var(--accent-primary)]" size={48} />
                    <p className="text-[var(--text-secondary)] animate-pulse">Loading profile...</p>
                </div>
            </div>
        );
    }

    if (!user && !isLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-primary)] p-6 text-center">
                <div className="w-20 h-20 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 mb-6">
                    <AlertCircle size={40} />
                </div>
                <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
                <p className="text-[var(--text-secondary)] mb-8 max-w-md">
                    We couldn't load your profile information. This may be because your session has expired or you are not logged in.
                </p>
                <Link href="/login" className="btn btn-primary px-8">
                    Return to Login
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] pb-12">
            <div className="max-w-4xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-10 pb-6 border-b border-[var(--border)]">
                    <div className="flex items-center gap-5">
                        <Link href="/" className="p-2.5 bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] rounded-full transition-all text-[var(--text-secondary)] shadow-sm">
                            <ArrowLeft size={18} />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">My Profile</h1>
                            <p className="text-[var(--text-secondary)] mt-1">Manage your personal information and security settings.</p>
                        </div>
                    </div>
                </div>

                {/* Notifications */}
                <AnimatePresence>
                    {message && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className={`mb-8 p-4 rounded-xl flex items-center gap-3 border shadow-lg ${message.type === 'success'
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                                }`}
                        >
                            <div className={`p-2 rounded-lg ${message.type === 'success' ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>
                                {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                            </div>
                            <p className="text-sm font-medium">{message.text}</p>
                            <button onClick={() => setMessage(null)} className="ml-auto p-1 hover:bg-black/10 rounded-md transition-colors opacity-70 hover:opacity-100 uppercase text-[10px] font-bold tracking-wider">Dismiss</button>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                    {/* Left Column: Avatar and Quick Stats */}
                    <div className="space-y-6">
                        <div className="card p-8 flex flex-col items-center text-center shadow-xl border-t-4 border-t-[var(--primary)] bg-[var(--surface)]">
                            <div className="relative group mb-6">
                                <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] rounded-full blur-md opacity-20 group-hover:opacity-40 transition-opacity" />
                                <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white text-4xl font-bold shadow-2xl border-4 border-[var(--background)] z-10">
                                    {firstName?.[0]}{lastName?.[0] || firstName?.[1] || user?.email?.[0]}
                                </div>
                            </div>
                            <h2 className="text-2xl font-bold mb-1 text-[var(--text-primary)]">{firstName} {lastName}</h2>
                            <p className="text-[var(--text-muted)] text-sm mb-6">{user?.email}</p>

                            <div className="w-full h-px bg-[var(--border)] my-6" />

                            <div className="w-full text-left space-y-4">
                                <div className="flex justify-between items-center py-1">
                                    <span className="text-[var(--text-muted)] text-[10px] uppercase tracking-widest font-bold">Member Since</span>
                                    <span className="font-semibold text-sm">
                                        {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-1">
                                    <span className="text-[var(--text-muted)] text-[10px] uppercase tracking-widest font-bold">Status</span>
                                    <span className="badge badge-success px-3 py-1 font-bold">
                                        ACTIVE <div className="w-1.5 h-1.5 rounded-full bg-current shadow-[0_0_8px_currentColor]" />
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Forms */}
                    <div className="md:col-span-2 space-y-10">
                        {/* Personal Info Form */}
                        <div className="card overflow-hidden shadow-xl border border-[var(--border)]">
                            <div className="px-6 py-4 bg-[var(--background-elevated)] border-b border-[var(--border)] flex items-center gap-3">
                                <div className="p-2 bg-[var(--primary-muted)] text-[var(--primary)] rounded-lg">
                                    <User size={18} />
                                </div>
                                <h3 className="font-bold text-lg">Personal Information</h3>
                            </div>
                            <form onSubmit={handleUpdateInfo} className="p-8 space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="input-group">
                                        <label className="input-label" htmlFor="firstName">First Name</label>
                                        <input
                                            id="firstName"
                                            type="text"
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            className="input"
                                            placeholder="John"
                                            required
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label className="input-label" htmlFor="lastName">Last Name</label>
                                        <input
                                            id="lastName"
                                            type="text"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            className="input"
                                            placeholder="Doe"
                                        />
                                    </div>
                                </div>
                                <div className="input-group">
                                    <label className="input-label" htmlFor="email">Email Address</label>
                                    <div className="relative">
                                        {!email && <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-colors" />}
                                        <input
                                            id="email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className={`input ${!email ? 'pl-11' : ''}`}
                                            placeholder="john.doe@example.com"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end pt-8">
                                    <button
                                        disabled={isSaving}
                                        type="submit"
                                        className="btn btn-primary px-8 py-3 rounded-xl shadow-lg shadow-[var(--primary-muted)] hover:shadow-[var(--primary)]/20 active:scale-95 flex items-center gap-3"
                                    >
                                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                        Save Profile Changes
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Security Form */}
                        <div className="card overflow-hidden shadow-xl border-l-[6px] border-l-rose-500/80 hover:border-l-rose-500 transition-all">
                            <div className="px-6 py-4 bg-[var(--background-elevated)] border-b border-[var(--border)] flex items-center gap-3">
                                <div className="p-2 bg-rose-500/10 text-rose-500 rounded-lg">
                                    <Lock size={18} />
                                </div>
                                <h3 className="font-bold text-lg">Account Security</h3>
                            </div>
                            <form onSubmit={handleUpdatePassword} className="p-8 space-y-6">
                                <div className="input-group">
                                    <label className="input-label" htmlFor="currPass">Current Password</label>
                                    <input
                                        id="currPass"
                                        type="password"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        className="input"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="input-group">
                                        <label className="input-label" htmlFor="newPass">New Password</label>
                                        <input
                                            id="newPass"
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="input"
                                            placeholder="••••••••"
                                            required
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label className="input-label" htmlFor="confPass">Confirm New Password</label>
                                        <input
                                            id="confPass"
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="input"
                                            placeholder="••••••••"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end pt-8">
                                    <button
                                        disabled={isSaving}
                                        type="submit"
                                        className="btn btn-danger px-8 py-3 rounded-xl shadow-lg shadow-rose-500/10 hover:shadow-rose-500/20 active:scale-95 flex items-center gap-3 font-bold"
                                    >
                                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />}
                                        Update Password
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
