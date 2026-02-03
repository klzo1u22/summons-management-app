'use client';

import {
    LayoutDashboard,
    FileText,
    FolderKanban,
    Calendar,
    BarChart3,
    Settings,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    Bell,
    Zap,
    Sun,
    Moon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useTheme } from '@/components/providers/ThemeProvider';

interface SidebarProps {
    collapsed?: boolean;
    onToggle?: () => void;
    isSyncing?: boolean;
    onSync?: () => void;
}

const navItems = [
    { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/summons', icon: FileText, label: 'Summons' },
    { href: '/cases', icon: FolderKanban, label: 'Cases' },
    { href: '/calendar', icon: Calendar, label: 'Calendar' },
    { href: '/reports', icon: BarChart3, label: 'Reports' },
    { href: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar({ collapsed = false, onToggle, isSyncing, onSync }: SidebarProps) {
    const pathname = usePathname();

    return (
        <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
            {/* Logo Section */}
            <div style={{
                padding: 'var(--space-4)',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'space-between',
                gap: 'var(--space-3)',
            }}>
                {!collapsed && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <div style={{
                            width: 32,
                            height: 32,
                            borderRadius: 'var(--radius-md)',
                            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <Zap size={18} color="white" />
                        </div>
                        <div>
                            <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Summons</div>
                            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Management</div>
                        </div>
                    </div>
                )}

                {collapsed && (
                    <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: 'var(--radius-md)',
                        background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        <Zap size={18} color="white" />
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="nav-menu" style={{ flex: 1 }}>
                {navItems.map((item) => {
                    const isActive = pathname === item.href ||
                        (item.href !== '/' && pathname.startsWith(item.href));

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`nav-item ${isActive ? 'active' : ''}`}
                            title={collapsed ? item.label : undefined}
                        >
                            <item.icon className="nav-item-icon" />
                            {!collapsed && <span className="nav-item-label">{item.label}</span>}
                        </Link>
                    );
                })}
            </nav>

            {/* Quick Stats (when expanded) */}
            {!collapsed && (
                <div style={{
                    padding: 'var(--space-4)',
                    borderTop: '1px solid var(--border)',
                }}>
                    <div style={{
                        fontSize: '0.6875rem',
                        color: 'var(--text-muted)',
                        marginBottom: 'var(--space-3)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        fontWeight: 600,
                    }}>
                        Quick Stats
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                        <QuickStat label="Active Cases" value="12" color="var(--primary)" />
                        <QuickStat label="Pending Summons" value="8" color="var(--warning)" />
                        <QuickStat label="Due Today" value="3" color="var(--error)" />
                    </div>
                </div>
            )}

            {/* Sync Status */}
            <div style={{
                padding: 'var(--space-4)',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'space-between',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <span className={`status-dot ${isSyncing ? 'warning pulse' : 'success'}`} />
                    {!collapsed && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {isSyncing ? 'Syncing...' : 'Synced'}
                        </span>
                    )}
                </div>
                {!collapsed && (
                    <button
                        onClick={onSync}
                        disabled={isSyncing}
                        className={`btn btn-ghost btn-icon ${isSyncing ? 'animate-spin' : ''}`}
                        style={{ width: 28, height: 28 }}
                        title="Sync Now"
                    >
                        <RefreshCw size={14} />
                    </button>
                )}
            </div>

            {/* Collapse Toggle */}
            <div style={{
                padding: 'var(--space-3)',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'center',
            }}>
                <button
                    onClick={onToggle}
                    className="btn btn-ghost btn-icon"
                    style={{ width: 32, height: 32 }}
                    title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                </button>
            </div>

            {/* Theme Toggle */}
            <div style={{
                padding: 'var(--space-3)',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'center',
            }}>
                <ThemeToggle collapsed={collapsed} />
            </div>
        </aside>
    );
}

function ThemeToggle({ collapsed }: { collapsed: boolean }) {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="btn btn-ghost btn-icon"
            style={{
                width: collapsed ? 32 : '100%',
                height: 32,
                justifyContent: collapsed ? 'center' : 'flex-start',
                padding: collapsed ? 0 : '0 var(--space-4)',
                gap: 'var(--space-3)'
            }}
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            {!collapsed && <span style={{ fontSize: '0.8125rem' }}>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>}
        </button>
    );
}

function QuickStat({ label, value, color }: { label: string; value: string; color: string }) {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--space-2) var(--space-3)',
            background: 'var(--surface)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.8125rem',
        }}>
            <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
            <span style={{ fontWeight: 600, color }}>{value}</span>
        </div>
    );
}
