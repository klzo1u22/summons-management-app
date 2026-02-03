'use client';

import { RefreshCw, Wifi, WifiOff, Database, Clock } from 'lucide-react';
import { useState } from 'react';

interface FooterProps {
    isConnected?: boolean;
    lastSynced?: Date | null;
    isSyncing?: boolean;
    onSync?: () => void;
}

export function Footer({
    isConnected = true,
    lastSynced = null,
    isSyncing = false,
    onSync,
}: FooterProps) {
    const formatLastSynced = (date: Date | null) => {
        if (!date) return 'Never';

        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;

        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;

        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    };

    return (
        <footer className="footer">
            {/* Left: Connection Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    {isConnected ? (
                        <>
                            <span className="status-dot success pulse" />
                            <span>Connected</span>
                        </>
                    ) : (
                        <>
                            <span className="status-dot error" />
                            <span style={{ color: 'var(--error)' }}>Disconnected</span>
                        </>
                    )}
                </div>

                <div style={{
                    width: 1,
                    height: 16,
                    background: 'var(--border)'
                }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <Database size={12} />
                    <span>SQLite</span>
                </div>

                <div style={{
                    width: 1,
                    height: 16,
                    background: 'var(--border)'
                }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <Clock size={12} />
                    <span>Last sync: {formatLastSynced(lastSynced)}</span>
                </div>
            </div>

            {/* Right: Sync Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <span style={{
                    fontSize: '0.6875rem',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                }}>
                    Notion Sync
                </span>

                <button
                    onClick={onSync}
                    disabled={isSyncing}
                    className="btn btn-ghost btn-sm"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)',
                        color: isSyncing ? 'var(--primary)' : 'var(--text-secondary)',
                    }}
                >
                    <RefreshCw
                        size={14}
                        style={{
                            animation: isSyncing ? 'spin 1s linear infinite' : 'none',
                        }}
                    />
                    {isSyncing ? 'Syncing...' : 'Sync Now'}
                </button>
            </div>

            <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
        </footer>
    );
}
