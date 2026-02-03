'use client';

import { useEffect, useState, useMemo } from 'react';
import { Header } from '@/components/layout';
import {
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    Clock,
    User,
    AlertTriangle,
    CheckCircle2,
} from 'lucide-react';
import { getSummonsAction, getCasesAction } from '@/app/actions';
import { Summons, Case } from '@/lib/types';
import Link from 'next/link';
import { formatDateKey } from '@/lib/utils';

// Days of week
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export default function CalendarPage() {
    const [summons, setSummons] = useState<Summons[]>([]);
    const [cases, setCases] = useState<Case[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [summonsData, casesData] = await Promise.all([
                getSummonsAction(),
                getCasesAction(),
            ]);
            setSummons(summonsData);
            setCases(casesData);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Get case name
    const getCaseName = (caseId: string) => {
        const c = cases.find(x => x.id === caseId);
        return c?.name || caseId.slice(0, 8) + '...';
    };

    // Calendar calculations
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const startingDayOfWeek = firstDayOfMonth.getDay();
    const totalDaysInMonth = lastDayOfMonth.getDate();

    // Create calendar grid
    const calendarDays = useMemo(() => {
        const days = [];

        // Previous month fill
        const prevMonthDays = new Date(year, month, 0).getDate();
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            days.push({
                day: prevMonthDays - i,
                isCurrentMonth: false,
                date: new Date(year, month - 1, prevMonthDays - i),
            });
        }

        // Current month
        for (let day = 1; day <= totalDaysInMonth; day++) {
            days.push({
                day,
                isCurrentMonth: true,
                date: new Date(year, month, day),
            });
        }

        // Next month fill
        const remainingDays = 42 - days.length; // 6 weeks x 7 days
        for (let day = 1; day <= remainingDays; day++) {
            days.push({
                day,
                isCurrentMonth: false,
                date: new Date(year, month + 1, day),
            });
        }

        return days;
    }, [year, month, startingDayOfWeek, totalDaysInMonth]);

    // Group summons by date
    const summonsByDate = useMemo(() => {
        const map: Record<string, Summons[]> = {};

        summons.forEach(s => {
            // Use rescheduled_date if available and valid, otherwise appearance_date
            const date = s.rescheduled_date || s.appearance_date;
            if (date) {
                const key = date.split('T')[0];
                if (!map[key]) map[key] = [];
                map[key].push(s);
            }
        });

        return map;
    }, [summons]);

    // Get summons for a date
    const getSummonsForDate = (date: Date) => {
        const key = formatDateKey(date);
        return summonsByDate[key] || [];
    };

    // Check if date is today
    const isToday = (date: Date) => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    // Navigate months
    const prevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
        setSelectedDate(null);
    };

    const nextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
        setSelectedDate(null);
    };

    const goToToday = () => {
        setCurrentDate(new Date());
        setSelectedDate(formatDateKey(new Date()));
    };

    // Selected date summons
    const selectedSummons = selectedDate ? summonsByDate[selectedDate] || [] : [];

    if (isLoading) {
        return (
            <>
                <Header title="Calendar" subtitle="Loading..." />
                <main className="main-content">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
                        Loading calendar data...
                    </div>
                </main>
            </>
        );
    }

    return (
        <>
            <Header
                title="Calendar"
                subtitle="Appearance Schedule"
            />

            <main className="main-content">
                <div className="animate-in" style={{ display: 'flex', gap: 'var(--space-4)', height: '100%' }}>

                    {/* Calendar Grid */}
                    <div className="card" style={{ flex: 2, padding: 'var(--space-4)', minWidth: 0 }}>
                        {/* Calendar Header */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: 'var(--space-4)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                <button className="btn btn-ghost btn-icon" onClick={prevMonth}>
                                    <ChevronLeft size={20} />
                                </button>
                                <h2 style={{
                                    fontSize: '1.25rem',
                                    fontWeight: 600,
                                    minWidth: 180,
                                    textAlign: 'center',
                                }}>
                                    {MONTHS[month]} {year}
                                </h2>
                                <button className="btn btn-ghost btn-icon" onClick={nextMonth}>
                                    <ChevronRight size={20} />
                                </button>
                            </div>

                            <button className="btn btn-secondary btn-sm" onClick={goToToday}>
                                <CalendarIcon size={14} />
                                Today
                            </button>
                        </div>

                        {/* Weekday Headers */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(7, 1fr)',
                            gap: 'var(--space-1)',
                            marginBottom: 'var(--space-2)',
                        }}>
                            {WEEKDAYS.map(day => (
                                <div
                                    key={day}
                                    style={{
                                        textAlign: 'center',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        color: 'var(--text-muted)',
                                        padding: 'var(--space-2)',
                                    }}
                                >
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Calendar Days */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(7, 1fr)',
                            gap: 'var(--space-1)',
                        }}>
                            {calendarDays.map((dayInfo, index) => {
                                const dateStr = formatDateKey(dayInfo.date);
                                const daySummons = getSummonsForDate(dayInfo.date);
                                const hasAppearances = daySummons.length > 0;
                                const hasOverdue = daySummons.some(s =>
                                    !s.is_served && dayInfo.date < new Date()
                                );
                                const isSelected = selectedDate === dateStr;

                                return (
                                    <button
                                        key={index}
                                        onClick={() => setSelectedDate(dateStr)}
                                        style={{
                                            aspectRatio: '1',
                                            minHeight: 60,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'flex-start',
                                            padding: 'var(--space-2)',
                                            borderRadius: 'var(--radius-md)',
                                            border: isSelected ? '2px solid var(--primary)' : '1px solid transparent',
                                            background: isToday(dayInfo.date)
                                                ? 'rgba(99, 102, 241, 0.1)'
                                                : dayInfo.isCurrentMonth
                                                    ? 'var(--surface-dim)'
                                                    : 'transparent',
                                            color: dayInfo.isCurrentMonth ? 'var(--text-primary)' : 'var(--text-muted)',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease',
                                            position: 'relative',
                                        }}
                                    >
                                        <span style={{
                                            fontSize: '0.875rem',
                                            fontWeight: isToday(dayInfo.date) ? 600 : 400,
                                            color: isToday(dayInfo.date) ? 'var(--primary)' : undefined,
                                        }}>
                                            {dayInfo.day}
                                        </span>

                                        {hasAppearances && (
                                            <div style={{
                                                display: 'flex',
                                                gap: 2,
                                                marginTop: 'var(--space-1)',
                                                flexWrap: 'wrap',
                                                justifyContent: 'center',
                                            }}>
                                                {daySummons.slice(0, 3).map((s, i) => (
                                                    <div
                                                        key={i}
                                                        style={{
                                                            width: 6,
                                                            height: 6,
                                                            borderRadius: '50%',
                                                            background: s.is_served
                                                                ? 'var(--success)'
                                                                : hasOverdue
                                                                    ? 'var(--error)'
                                                                    : 'var(--primary)',
                                                        }}
                                                    />
                                                ))}
                                                {daySummons.length > 3 && (
                                                    <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>
                                                        +{daySummons.length - 3}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Legend */}
                        <div style={{
                            display: 'flex',
                            gap: 'var(--space-4)',
                            marginTop: 'var(--space-4)',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)' }} />
                                Scheduled
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }} />
                                Served
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--error)' }} />
                                Overdue
                            </div>
                        </div>
                    </div>

                    {/* Selected Date Details */}
                    <div className="card" style={{ flex: 1, padding: 'var(--space-4)', minWidth: 300, maxWidth: 400 }}>
                        <h3 style={{
                            fontSize: '1rem',
                            fontWeight: 600,
                            marginBottom: 'var(--space-4)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-2)',
                        }}>
                            <CalendarIcon size={18} style={{ color: 'var(--primary)' }} />
                            {selectedDate
                                ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', {
                                    weekday: 'long',
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                })
                                : 'Select a date'
                            }
                        </h3>

                        {!selectedDate ? (
                            <div style={{
                                textAlign: 'center',
                                padding: 'var(--space-8)',
                                color: 'var(--text-muted)',
                            }}>
                                Click on a date to view scheduled appearances
                            </div>
                        ) : selectedSummons.length === 0 ? (
                            <div style={{
                                textAlign: 'center',
                                padding: 'var(--space-8)',
                                color: 'var(--text-muted)',
                            }}>
                                No appearances scheduled for this date
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                                {selectedSummons.map((s) => (
                                    <div
                                        key={s.id}
                                        style={{
                                            padding: 'var(--space-3)',
                                            background: 'var(--surface-dim)',
                                            borderRadius: 'var(--radius-md)',
                                            borderLeft: `3px solid ${s.is_served ? 'var(--success)' : 'var(--primary)'}`,
                                        }}
                                    >
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            marginBottom: 'var(--space-2)',
                                        }}>
                                            <span style={{ fontWeight: 500 }}>{s.person_name}</span>
                                            <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                                                {s.summons_response === 'Requested Rescheduling' && (
                                                    <span className="badge badge-warning" style={{ fontSize: '0.625rem' }}>
                                                        Reschedule req.
                                                    </span>
                                                )}
                                                {s.is_served ? (
                                                    <span className="badge badge-success" style={{ fontSize: '0.625rem' }}>
                                                        <CheckCircle2 size={10} /> Served
                                                    </span>
                                                ) : (
                                                    <span className="badge badge-info" style={{ fontSize: '0.625rem' }}>
                                                        <Clock size={10} /> {s.status === 'Rescheduled' ? 'Rescheduling' : 'Pending'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                                            {s.appearance_time && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', marginBottom: 4, color: 'var(--accent)', fontWeight: 600 }}>
                                                    <Clock size={12} />
                                                    {s.appearance_time}
                                                </div>
                                            )}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', marginBottom: 2 }}>
                                                <User size={12} style={{ opacity: 0.6 }} />
                                                {s.person_role || 'Unknown role'}
                                            </div>
                                            <Link
                                                href={`/cases/${s.case_id}`}
                                                style={{ color: 'var(--primary)', fontSize: '0.75rem' }}
                                            >
                                                {getCaseName(s.case_id)}
                                            </Link>
                                        </div>

                                        {s.rescheduled_date && s.rescheduled_date !== s.appearance_date && (
                                            <div style={{ marginTop: 'var(--space-2)', fontSize: '0.75rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>
                                                Rescheduled from {s.appearance_date}
                                            </div>
                                        )}

                                        {s.priority && (
                                            <div style={{ marginTop: 'var(--space-2)' }}>
                                                <span className={`badge ${s.priority === 'Extremely Important' ? 'badge-error' :
                                                    s.priority === 'High' ? 'badge-warning' :
                                                        'badge-neutral'
                                                    }`} style={{ fontSize: '0.625rem' }}>
                                                    {s.priority}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Summary Stats */}
                        <div style={{
                            marginTop: 'auto',
                            paddingTop: 'var(--space-4)',
                            borderTop: '1px solid var(--border)',
                        }}>
                            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 'var(--space-3)' }}>
                                This Month Summary
                            </h4>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, 1fr)',
                                gap: 'var(--space-3)',
                            }}>
                                <div style={{
                                    padding: 'var(--space-3)',
                                    background: 'var(--surface-dim)',
                                    borderRadius: 'var(--radius-md)',
                                    textAlign: 'center',
                                }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>
                                        {Object.entries(summonsByDate)
                                            .filter(([date]) => {
                                                const d = new Date(date);
                                                return d.getMonth() === month && d.getFullYear() === year;
                                            })
                                            .reduce((sum, [, list]) => sum + list.length, 0)
                                        }
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total</div>
                                </div>
                                <div style={{
                                    padding: 'var(--space-3)',
                                    background: 'var(--surface-dim)',
                                    borderRadius: 'var(--radius-md)',
                                    textAlign: 'center',
                                }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--error)' }}>
                                        {summons.filter(s => {
                                            if (!s.appearance_date || s.is_served) return false;
                                            const d = new Date(s.appearance_date);
                                            return d < new Date() && d.getMonth() === month && d.getFullYear() === year;
                                        }).length}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Overdue</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
}
