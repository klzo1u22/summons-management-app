'use client';

import Link from 'next/link';
import { Search, Bell, Plus, User, ChevronDown, LogOut, Settings, UserCircle, ShieldCheck } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { NotificationBell } from './NotificationBell';
import { getSummonsAction } from '@/app/actions';
import { getAuthUser, logoutAction } from '@/app/auth-actions';
import { Summons } from '@/lib/types';
import { cn } from '@/lib/utils';
import { AuthUser } from '@/lib/auth';

interface HeaderProps {
    title?: string;
    subtitle?: string;
    onAddClick?: () => void;
    addLabel?: string;
    actions?: React.ReactNode;
    showSearch?: boolean;
    searchQuery?: string;
    onSearchChange?: (value: string) => void;
    searchPlaceholder?: string;
}

export function Header({
    title = 'Dashboard',
    subtitle,
    onAddClick,
    addLabel = 'Add New',
    actions,
    showSearch = true,
    searchQuery: externalSearchQuery,
    onSearchChange,
    searchPlaceholder = 'Search summons, cases...',
}: HeaderProps) {
    const [currentTime, setCurrentTime] = useState<string>('');
    const [searchOpen, setSearchOpen] = useState(false);
    const [internalSearchQuery, setInternalSearchQuery] = useState('');
    const [profileOpen, setProfileOpen] = useState(false);
    const [user, setUser] = useState<AuthUser | null>(null);
    const router = useRouter();


    // Use internal state if onSearchChange is not provided, otherwise use external searchQuery
    const isExternalSearch = !!onSearchChange;
    const currentSearchQuery = isExternalSearch ? (externalSearchQuery || '') : internalSearchQuery;
    const setSearchQuery = isExternalSearch ? onSearchChange : setInternalSearchQuery;

    const profileRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            setCurrentTime(now.toLocaleString('en-IN', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
            }));
        };

        updateTime();
        const interval = setInterval(updateTime, 60000);

        // Fetch user
        const fetchUser = async () => {
            const authUser = await getAuthUser();
            setUser(authUser);
        };
        fetchUser();

        // Click outside listener
        const handleClickOutside = (event: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setProfileOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            clearInterval(interval);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        // Only redirect if it's internal search and there's a query
        if (!isExternalSearch && currentSearchQuery.trim()) {
            router.push(`/summons?search=${encodeURIComponent(currentSearchQuery)}`);
        }
    };

    return (
        <header className="header">
            {/* Left: Title & Breadcrumb */}
            <div style={{ flex: 1 }}>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 2 }}>
                    {title}
                </h1>
                {subtitle && (
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                        {subtitle}
                    </p>
                )}
            </div>

            {/* Center: Search */}
            {showSearch && (
                <form onSubmit={handleSearch} className="search-container" style={{ flex: 1, maxWidth: 400 }}>
                    <Search className="search-icon" />
                    <input
                        type="text"
                        className="input search-input"
                        placeholder={searchPlaceholder}
                        value={currentSearchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => setSearchOpen(true)}
                    />
                    <span className="search-shortcut">⌘K</span>
                </form>
            )}

            {/* Right: Actions */}
            <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 'var(--space-3)',
            }}>
                {/* Time Display */}
                <div style={{
                    fontSize: '0.8125rem',
                    color: 'var(--text-muted)',
                    marginRight: 'var(--space-4)',
                    whiteSpace: 'nowrap',
                }}>
                    {currentTime}
                </div>

                {/* Custom Actions */}
                {actions}

                {/* Quick Add Button */}
                {onAddClick && (
                    <button className="btn btn-primary" onClick={onAddClick}>
                        <Plus size={16} />
                        <span className="hide-mobile">{addLabel}</span>
                    </button>
                )}

                {/* Notifications */}
                <NotificationBell />

                {/* User Menu */}
                <div style={{ position: 'relative' }} ref={profileRef}>
                    <button
                        className="btn btn-ghost"
                        onClick={() => setProfileOpen(!profileOpen)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-2)',
                            padding: 'var(--space-2)',
                        }}
                    >
                        <div style={{
                            width: 32,
                            height: 32,
                            borderRadius: 'var(--radius-full)',
                            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <User size={16} color="white" />
                        </div>
                        <span className="hide-mobile" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                            {user ? `${user.firstName} ${user.lastName}` : 'Guest'}
                        </span>
                        <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
                    </button>

                    {profileOpen && (
                        <div className="card" style={{
                            position: 'absolute',
                            top: '100%',
                            right: 0,
                            width: 200,
                            marginTop: 'var(--space-2)',
                            zIndex: 100,
                            padding: 'var(--space-2)',
                            boxShadow: 'var(--shadow-xl)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 'var(--space-1)',
                        }}>
                            {user?.role === 'admin' && (
                                <Link href="/admin/users" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.8125rem', color: 'var(--primary)' }} onClick={() => setProfileOpen(false)}>
                                    <ShieldCheck size={16} /> User Management
                                </Link>
                            )}
                            <Link href="/settings" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.8125rem' }} onClick={() => setProfileOpen(false)}>
                                <Settings size={16} /> Settings
                            </Link>
                            <Link href="/profile" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.8125rem' }} onClick={() => setProfileOpen(false)}>
                                <User size={16} /> My Profile
                            </Link>
                            <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                            <button
                                className="btn btn-ghost"
                                onClick={() => logoutAction()}
                                style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.8125rem', color: 'var(--error)' }}
                            >
                                <LogOut size={16} /> Sign Out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
