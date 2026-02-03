'use client';

import { Bell } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getSummonsAction } from '@/app/actions';
import { cn } from '@/lib/utils';

export function NotificationBell() {
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [notifications, setNotifications] = useState<{ id: string; title: string; type: 'missed' | 'upcoming'; date: string }[]>([]);
    const router = useRouter();
    const notificationsRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = async () => {
        try {
            const summonsData = await getSummonsAction();
            const now = new Date();
            const list: { id: string; title: string; type: 'missed' | 'upcoming'; date: string }[] = [];

            summonsData.forEach(s => {
                const dateStr = s.rescheduled_date || s.appearance_date;
                if (!dateStr) return;

                const targetDate = new Date(dateStr);
                const compareTarget = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
                const compareNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const compareFuture = new Date(compareNow);
                compareFuture.setDate(compareNow.getDate() + 3);

                const attendedStatuses = ['Statement In Progress', 'Statement Completed', 'Closed'];
                if (attendedStatuses.includes(s.status)) return;

                if (compareTarget < compareNow) {
                    list.push({
                        id: s.id,
                        title: `${s.person_name} - Missed Appearance`,
                        type: 'missed',
                        date: dateStr
                    });
                } else if (targetDate >= compareNow && compareTarget <= compareFuture) {
                    list.push({
                        id: s.id,
                        title: `${s.person_name} - Upcoming Summon`,
                        type: 'upcoming',
                        date: dateStr
                    });
                }
            });

            setNotifications(list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
        }
    };

    useEffect(() => {
        fetchNotifications();

        const handleClickOutside = (event: MouseEvent) => {
            if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
                setNotificationsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div style={{ position: 'relative' }} ref={notificationsRef}>
            <button
                className="btn btn-ghost btn-icon"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
            >
                <Bell size={18} />
                {notifications.length > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        width: 14,
                        height: 14,
                        background: 'var(--error)',
                        borderRadius: '50%',
                        border: '2px solid var(--background-elevated)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        color: 'white',
                        fontWeight: 'bold'
                    }}>
                        {notifications.length}
                    </span>
                )}
            </button>

            {notificationsOpen && (
                <div className="card" style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    width: 320,
                    marginTop: 'var(--space-2)',
                    zIndex: 100,
                    padding: 'var(--space-1)',
                    boxShadow: 'var(--shadow-xl)',
                    maxHeight: '400px',
                    overflowY: 'auto'
                }}>
                    <div style={{ padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ fontSize: '0.875rem', fontWeight: 600 }}>Notifications</h4>
                        <span className="badge badge-neutral">{notifications.length} Total</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {notifications.length > 0 ? (
                            notifications.map((n) => (
                                <div key={n.id}
                                    onClick={() => {
                                        router.push(`/?search=${encodeURIComponent(n.title.split(' - ')[0])}`);
                                        setNotificationsOpen(false);
                                    }}
                                    style={{
                                        padding: 'var(--space-3) var(--space-4)',
                                        borderBottom: '1px solid var(--border)',
                                        cursor: 'pointer',
                                        transition: 'background 0.2s'
                                    }} className="notification-item">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
                                        <span className={cn("badge", n.type === 'missed' ? "badge-error" : "badge-warning")} style={{ fontSize: '10px', padding: '2px 6px' }}>
                                            {n.type === 'missed' ? 'MISSED' : 'UPCOMING'}
                                        </span>
                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{n.date}</span>
                                    </div>
                                    <p style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 500, margin: 0 }}>{n.title}</p>
                                </div>
                            ))
                        ) : (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-8)' }}>
                                No pending notifications
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
