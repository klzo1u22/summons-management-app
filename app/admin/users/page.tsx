'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { Header } from '@/components/layout/Header';
import { getAllUsers, updateUserStatus, updateUserRole, deleteUser } from '@/app/auth-actions';
import { User, Shield, ShieldAlert, CheckCircle, XCircle, Trash2, Clock, Mail, Search, MoreVertical, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminUsersPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isPending, startTransition] = useTransition();
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const fetchUsers = async () => {
        try {
            const data = await getAllUsers();
            setUsers(data);
        } catch (error) {
            console.error('Failed to fetch users:', error);
            setMessage({ type: 'error', text: 'Failed to load users' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleStatusUpdate = (userId: string, status: any) => {
        startTransition(async () => {
            const result = await updateUserStatus(userId, status);
            if (result.success) {
                setMessage({ type: 'success', text: `User status updated to ${status}` });
                fetchUsers();
            }
        });
    };

    const handleRoleUpdate = (userId: string, role: any) => {
        startTransition(async () => {
            const result = await updateUserRole(userId, role);
            if (result.success) {
                setMessage({ type: 'success', text: `User role updated to ${role}` });
                fetchUsers();
            }
        });
    };

    const handleDeleteUser = (userId: string) => {
        if (!confirm('Are you sure you want to delete this user?')) return;

        startTransition(async () => {
            const result = await deleteUser(userId);
            if (result.success) {
                setMessage({ type: 'success', text: 'User deleted successfully' });
                fetchUsers();
            } else if (result.error) {
                setMessage({ type: 'error', text: result.error });
            }
        });
    };

    const filteredUsers = users.filter(user =>
        user.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return <span className="badge badge-success"><CheckCircle size={12} /> Active</span>;
            case 'pending':
                return <span className="badge badge-warning"><Clock size={12} /> Pending</span>;
            case 'disabled':
                return <span className="badge badge-danger"><XCircle size={12} /> Disabled</span>;
            default:
                return <span className="badge">{status}</span>;
        }
    };

    const getRoleBadge = (role: string) => {
        if (role === 'admin') {
            return <span className="badge badge-primary"><ShieldCheck size={12} /> Admin</span>;
        }
        return <span className="badge badge-outline"><User size={12} /> User</span>;
    };

    return (
        <div className="main-content">
            <Header
                title="User Management"
                subtitle="Manage user registrations, roles, and access levels."
                showSearch={false}
            />

            <div className="content-container">
                {message && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`notification ${message.type === 'error' ? 'notification-error' : 'notification-success'}`}
                        style={{ marginBottom: 'var(--space-4)' }}
                    >
                        {message.text}
                        <button onClick={() => setMessage(null)} className="close-btn">×</button>
                    </motion.div>
                )}

                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{
                        padding: 'var(--space-4)',
                        borderBottom: '1px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'var(--background-elevated)'
                    }}>
                        <div className="search-container" style={{ maxWidth: 300, margin: 0 }}>
                            <Search className="search-icon" size={16} />
                            <input
                                type="text"
                                className="input search-input"
                                placeholder="Filter users..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                            Showing {filteredUsers.length} of {users.length} users
                        </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th>Registered</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)' }}>
                                                <div className="spinner"></div>
                                                <p>Loading users...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                                            No users found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map(user => (
                                        <motion.tr
                                            key={user.id}
                                            layout
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                        >
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                                    <div style={{
                                                        width: 36, height: 36,
                                                        borderRadius: 'var(--radius-full)',
                                                        background: 'var(--background)',
                                                        border: '1px solid var(--border)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)'
                                                    }}>
                                                        {user.firstName?.[0]}{user.lastName?.[0]}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                                                            {user.firstName} {user.lastName}
                                                        </div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            <Mail size={12} /> {user.email}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>{getRoleBadge(user.role)}</td>
                                            <td>{getStatusBadge(user.status)}</td>
                                            <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                {new Date(user.createdAt).toLocaleDateString()}
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
                                                    {user.status === 'pending' && (
                                                        <button
                                                            className="btn btn-primary btn-sm"
                                                            onClick={() => handleStatusUpdate(user.id, 'active')}
                                                            disabled={isPending}
                                                        >
                                                            <CheckCircle size={14} /> Approve
                                                        </button>
                                                    )}
                                                    {user.status === 'active' && user.role !== 'admin' && (
                                                        <button
                                                            className="btn btn-outline btn-sm"
                                                            onClick={() => handleStatusUpdate(user.id, 'disabled')}
                                                            disabled={isPending}
                                                        >
                                                            <XCircle size={14} /> Disable
                                                        </button>
                                                    )}
                                                    {user.status === 'disabled' && (
                                                        <button
                                                            className="btn btn-outline btn-sm"
                                                            onClick={() => handleStatusUpdate(user.id, 'active')}
                                                            disabled={isPending}
                                                        >
                                                            <CheckCircle size={14} /> Re-enable
                                                        </button>
                                                    )}

                                                    <div style={{ width: 1, background: 'var(--border)', height: 24, margin: '0 4px' }} />

                                                    {user.role === 'user' ? (
                                                        <button
                                                            className="btn btn-ghost btn-sm"
                                                            title="Promote to Admin"
                                                            onClick={() => handleRoleUpdate(user.id, 'admin')}
                                                            disabled={isPending}
                                                        >
                                                            <Shield size={14} />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            className="btn btn-ghost btn-sm"
                                                            title="Demote to User"
                                                            onClick={() => handleRoleUpdate(user.id, 'user')}
                                                            disabled={isPending}
                                                        >
                                                            <User size={14} />
                                                        </button>
                                                    )}

                                                    <button
                                                        className="btn btn-ghost btn-sm"
                                                        style={{ color: 'var(--error)' }}
                                                        title="Delete User"
                                                        onClick={() => handleDeleteUser(user.id)}
                                                        disabled={isPending}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .notification {
                    padding: var(--space-3) var(--space-4);
                    border-radius: var(--radius-md);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 0.875rem;
                    font-weight: 500;
                    border: 1px solid transparent;
                }
                .notification-success {
                    background: rgba(var(--success-rgb), 0.1);
                    color: var(--success);
                    border-color: var(--success);
                }
                .notification-error {
                    background: rgba(var(--error-rgb), 0.1);
                    color: var(--error);
                    border-color: var(--error);
                }
                .close-btn {
                    background: none;
                    border: none;
                    font-size: 1.25rem;
                    cursor: pointer;
                    color: inherit;
                    opacity: 0.7;
                }
                .close-btn:hover {
                    opacity: 1;
                }
                .badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    padding: 2px 8px;
                    border-radius: var(--radius-full);
                    font-size: 0.75rem;
                    font-weight: 600;
                    text-transform: capitalize;
                }
                .badge-success { background: rgba(var(--success-rgb), 0.1); color: var(--success); }
                .badge-warning { background: rgba(var(--warning-rgb), 0.1); color: var(--warning); }
                .badge-danger { background: rgba(var(--error-rgb), 0.1); color: var(--error); }
                .badge-primary { background: rgba(var(--primary-rgb), 0.1); color: var(--primary); }
                .badge-outline { border: 1px solid var(--border); color: var(--text-muted); }
                
                .spinner {
                    width: 24px;
                    height: 24px;
                    border: 2px solid var(--border);
                    border-top-color: var(--primary);
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
