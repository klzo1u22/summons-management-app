"use client";

import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, isValid } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Summons } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * NEW CALENDAR VIEW (Rebuilt Phase 26)
 * Strict requirement: Full width colored tiles.
 */

interface NewCalendarViewProps {
    summons: Summons[];
    onClose?: () => void;
}

interface CalendarEvent {
    id: string;
    date: Date;
    type: 'scheduled' | 'rescheduled' | 'statement_1' | 'statement_2' | 'statement_3';
    label: string;
    personName: string;
    originalDate?: string;
}

export function NewCalendarView({ summons, onClose }: NewCalendarViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date());

    const daysInMonth = useMemo(() => {
        return eachDayOfInterval({
            start: startOfMonth(currentDate),
            end: endOfMonth(currentDate),
        });
    }, [currentDate]);

    // --- DATA PROCESSING ---
    const events = useMemo(() => {
        const evts: CalendarEvent[] = [];

        summons.forEach(s => {
            // Helper to parse date safely
            const safeDate = (dateStr?: string | null) => {
                if (!dateStr) return null;
                const d = parseISO(dateStr);
                return isValid(d) ? d : null;
            };

            // 1. Appearance Date (Blue)
            // IF it is NOT rescheduled (or we show both? Design implies we show the latest status usually, but user wants 'Scheduled' date shown).
            // Let's show Appearance Date as Blue UNLESS it is specifically effectively cancelled/moved? 
            // Design reference chart shows: "Summons: A. Brone" (Blue).
            const appDate = safeDate(s.appearance_date);
            if (appDate) {
                evts.push({
                    id: `${s.id}-app`,
                    date: appDate,
                    type: 'scheduled',
                    label: s.person_name,
                    personName: s.person_name
                });
            }

            // 2. Rescheduled Date (Orange)
            const resDate = safeDate(s.rescheduled_date);
            if (resDate) {
                evts.push({
                    id: `${s.id}-res`,
                    date: resDate,
                    type: 'rescheduled',
                    label: s.person_name, // "Rescheduled: Name" handled by layout/color
                    personName: s.person_name
                });
            }

            // 3. Statements (Green/Purple/Red)
            const s1 = safeDate(s.date_of_1st_statement);
            if (s1) {
                evts.push({ id: `${s.id}-s1`, date: s1, type: 'statement_1', label: s.person_name, personName: s.person_name });
            }
            const s2 = safeDate(s.date_of_2nd_statement);
            if (s2) {
                evts.push({ id: `${s.id}-s2`, date: s2, type: 'statement_2', label: s.person_name, personName: s.person_name });
            }
            const s3 = safeDate(s.date_of_3rd_statement);
            if (s3) {
                evts.push({ id: `${s.id}-s3`, date: s3, type: 'statement_3', label: s.person_name, personName: s.person_name });
            }
        });

        return evts;
    }, [summons]);

    const getEventsForDay = (day: Date) => {
        return events.filter(e => isSameDay(e.date, day));
    };

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-border h-full flex flex-col">
            {/* --- HEADER --- */}
            <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold text-foreground min-w-[200px] flex items-center gap-2">
                        {format(currentDate, 'MMMM yyyy')}
                    </h2>
                    <div className="flex items-center gap-1 border rounded-md bg-slate-50">
                        <button onClick={prevMonth} className="p-1.5 hover:bg-slate-200 rounded-l-md transition-colors">
                            <ChevronLeft className="w-5 h-5 text-slate-600" />
                        </button>
                        <div className="w-[1px] h-5 bg-slate-300"></div>
                        <button onClick={nextMonth} className="p-1.5 hover:bg-slate-200 rounded-r-md transition-colors">
                            <ChevronRight className="w-5 h-5 text-slate-600" />
                        </button>
                    </div>
                </div>

            </div>

            {/* --- CALENDAR GRID --- */}
            <div className="grid grid-cols-7 border border-slate-200 rounded-t-lg bg-slate-50 border-b-0">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                    <div key={d} className={`py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider ${i !== 6 ? 'border-r border-slate-200' : ''}`}>
                        {d}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 border-l border-t border-slate-200 bg-slate-200 gap-px flex-1 rounded-b-lg overflow-hidden">
                {daysInMonth.map((day, idx) => {
                    const dayEvents = getEventsForDay(day);
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const isToday = isSameDay(day, new Date());

                    // Render Day Cell
                    return (
                        <div
                            key={day.toString()}
                            className={cn(
                                "bg-white min-h-[120px] p-1.5 flex flex-col gap-1 transition-colors hover:bg-slate-50/80",
                                !isCurrentMonth && "bg-slate-50/30 text-slate-400"
                            )}
                        >
                            <div className="flex justify-between items-start px-1">
                                <span className={cn(
                                    "text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full",
                                    isToday ? "bg-primary text-white shadow-sm" : "text-slate-700"
                                )}>
                                    {format(day, 'd')}
                                </span>
                                {dayEvents.length > 0 && <span className="text-[10px] text-slate-400 font-medium pt-1">{dayEvents.length}</span>}
                            </div>

                            <div className="flex flex-col gap-1 mt-1 overflow-y-auto max-h-[140px] scrollbar-none">
                                {dayEvents.map((evt) => (
                                    <EventTile key={evt.id} event={evt} />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* --- LEGEND --- */}
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mt-6 pt-4 border-t border-slate-100">
                <LegendItem color="bg-[#1e88e5]" label="Scheduled Date" />
                <LegendItem color="bg-[#fb8c00]" label="Rescheduled Date" />
                <LegendItem color="bg-[#43a047]" label="1st Statement" />
                <LegendItem color="bg-[#8e24aa]" label="2nd Statement" />
                <LegendItem color="bg-[#e53935]" label="3rd Statement" />
            </div>
        </div >
    );
}

// --- SUBCOMPONENTS ---

function LegendItem({ color, label }: { color: string, label: string }) {
    return (
        <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <div className={`w-3 h-3 rounded-sm ${color} shadow-sm`}></div>
            {label}
        </div>
    );
}

function EventTile({ event }: { event: CalendarEvent }) {
    // Styles matching user image exactly
    // Full width colored blocks with white text

    if (event.type === 'scheduled') {
        return (
            <div className="w-full bg-[#1e88e5] text-white text-[11px] px-2 py-1.5 rounded-[3px] shadow-[0_1px_2px_rgba(30,136,229,0.2)] font-semibold leading-tight truncate cursor-pointer hover:brightness-110 transition-all">
                Summon: {event.personName}
            </div>
        );
    }

    if (event.type === 'rescheduled') {
        return (
            <div className="w-full bg-[#fb8c00] text-white text-[11px] px-2 py-1.5 rounded-[3px] shadow-[0_1px_2px_rgba(251,140,0,0.2)] font-semibold leading-tight truncate cursor-pointer hover:brightness-110 transition-all">
                Rescheduled: {event.personName}
            </div>
        );
    }

    // Statements: Green/Purple/Red with Circle Indicator
    let bgColor = '';
    let badgeNum = '';

    if (event.type === 'statement_1') { bgColor = 'bg-[#43a047]'; badgeNum = '1'; }
    if (event.type === 'statement_2') { bgColor = 'bg-[#8e24aa]'; badgeNum = '2'; }
    if (event.type === 'statement_3') { bgColor = 'bg-[#e53935]'; badgeNum = '3'; }

    return (
        <div className={`w-full ${bgColor} text-white text-[11px] px-1.5 py-1 rounded-[3px] shadow-sm font-semibold leading-tight truncate cursor-pointer hover:brightness-110 transition-all flex items-center gap-1.5`}>
            <div className={`w-4 h-4 rounded-full bg-white ${bgColor.replace('bg-', 'text-')} flex items-center justify-center font-bold text-[9px] shrink-0 shadow-inner`}>
                {badgeNum}
            </div>
            <span className="truncate">{event.type === 'statement_1' ? '1st Statement:' : event.type === 'statement_2' ? '2nd Statement:' : '3rd Statement:'} {event.personName}</span>
        </div>
    );
}
