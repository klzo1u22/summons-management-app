"use client";

import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Summons } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CalendarViewProps {
    summons: Summons[];
    onClose?: () => void;
}

interface CalendarEvent {
    id: string;
    date: Date;
    type: 'scheduled' | 'rescheduled' | 'statement_1' | 'statement_2' | 'statement_3';
    label: string;
    personName: string;
}

export function CalendarView({ summons, onClose }: CalendarViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [searchTerm, setSearchTerm] = useState("");

    const daysInMonth = useMemo(() => {
        return eachDayOfInterval({
            start: startOfMonth(currentDate),
            end: endOfMonth(currentDate),
        });
    }, [currentDate]);

    // Flatten summons into calendar events
    const events = useMemo(() => {
        const evts: CalendarEvent[] = [];

        summons.forEach(s => {
            // Appearance Date (Blue) - "Summon: Name"
            if (s.appearance_date) {
                // If it's rescheduled, we might want to show the original as "Reschedule Requested" or just show the new one.
                // Based on image, we show "Summons: [Name]" on the appearance date.
                evts.push({
                    id: `${s.id}-app`,
                    date: parseISO(s.appearance_date),
                    type: 'scheduled',
                    label: `Summon: ${s.person_name}`,
                    personName: s.person_name
                });
            }

            // Rescheduled Date (Orange)
            if (s.rescheduled_date) {
                evts.push({
                    id: `${s.id}-res`,
                    date: parseISO(s.rescheduled_date),
                    type: 'rescheduled',
                    label: `Rescheduled: ${s.person_name}`,
                    personName: s.person_name
                });
            }

            // Statements (Green/Purple/Red)
            if (s.date_of_1st_statement) {
                evts.push({
                    id: `${s.id}-s1`,
                    date: parseISO(s.date_of_1st_statement),
                    type: 'statement_1',
                    label: `1st Statement: ${s.person_name}`,
                    personName: s.person_name
                });
            }
            if (s.date_of_2nd_statement) {
                evts.push({
                    id: `${s.id}-s2`,
                    date: parseISO(s.date_of_2nd_statement),
                    type: 'statement_2',
                    label: `2nd Statement: ${s.person_name}`,
                    personName: s.person_name
                });
            }
            if (s.date_of_3rd_statement) {
                evts.push({
                    id: `${s.id}-s3`,
                    date: parseISO(s.date_of_3rd_statement),
                    type: 'statement_3',
                    label: `3rd Statement: ${s.person_name}`,
                    personName: s.person_name
                });
            }
        });

        // Search Filter
        if (searchTerm.trim()) {
            const lowerTerm = searchTerm.toLowerCase();
            return evts.filter(e => e.personName.toLowerCase().includes(lowerTerm) || e.label.toLowerCase().includes(lowerTerm));
        }

        return evts;
    }, [summons, searchTerm]);

    const getEventsForDay = (day: Date) => {
        return events.filter(e => isSameDay(e.date, day));
    };

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-border h-full flex flex-col animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold text-foreground min-w-[200px]">{format(currentDate, 'MMMM yyyy')}</h2>
                    <div className="flex items-center gap-1">
                        <button onClick={prevMonth} className="btn btn-ghost btn-sm btn-icon">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button onClick={nextMonth} className="btn btn-ghost btn-sm btn-icon">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search events..."
                        className="input h-9 pl-9 w-full bg-slate-50 border-input focus:bg-white transition-colors"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 border border-border rounded-lg overflow-hidden bg-border gap-px flex-1">
                {/* Weekday Headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} className="bg-slate-50 p-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {d}
                    </div>
                ))}

                {/* Days */}
                {daysInMonth.map((day, idx) => {
                    const dayEvents = getEventsForDay(day);
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const isToday = isSameDay(day, new Date());

                    return (
                        <div
                            key={day.toString()}
                            className={cn(
                                "bg-white min-h-[120px] p-2 transition-colors relative flex flex-col gap-1",
                                !isCurrentMonth && "bg-slate-50/50 text-muted-foreground"
                            )}
                        >
                            <span className={cn(
                                "text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1",
                                isToday ? "bg-primary text-white" : "text-foreground opacity-70"
                            )}>
                                {format(day, 'd')}
                            </span>

                            <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[140px] pr-1 scrollbar-hide">
                                {dayEvents.map((evt) => (
                                    <EventTile key={evt.id} event={evt} />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-6 mt-6 pt-4 border-t border-border text-xs font-medium text-muted-foreground select-none">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-blue-600">Blue:</span> Scheduled Date
                </div>
                <div className="flex items-center gap-2">
                    <span className="font-bold text-orange-500">Orange:</span> Rescheduled Date
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-green-600 font-bold">Green (1):</span> 1st Statement
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-purple-600 font-bold">Purple (2):</span> 2nd Statement
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-red-600 font-bold">Red (3):</span> 3rd Statement
                </div>
            </div>
        </div>
    );
}

function EventTile({ event }: { event: CalendarEvent }) {
    switch (event.type) {
        case 'scheduled':
            return (
                <div className="w-full text-[11px] px-2 py-1 rounded-sm bg-[#1e88e5] text-white font-semibold truncate shadow-[0_1px_2px_rgba(0,0,0,0.1)] hover:bg-[#1976d2] cursor-pointer transition-colors" title={event.label}>
                    {event.label}
                </div>
            );
        case 'rescheduled':
            return (
                <div className="w-full text-[11px] px-2 py-1 rounded-sm bg-[#fb8c00] text-white font-semibold truncate shadow-[0_1px_2px_rgba(0,0,0,0.1)] hover:bg-[#f57c00] cursor-pointer transition-colors" title={event.label}>
                    {event.label}
                </div>
            );
        case 'statement_1':
            return (
                <div className="w-full flex items-center gap-1.5 bg-[#43a047] text-white text-[11px] px-1.5 py-1 rounded-sm shadow-[0_1px_2px_rgba(0,0,0,0.1)] hover:bg-[#388e3c] cursor-pointer transition-colors" title={event.label}>
                    <div className="w-3.5 h-3.5 rounded-full bg-white text-[#43a047] flex items-center justify-center font-bold text-[9px] shrink-0 leading-none">1</div>
                    <span className="truncate font-semibold">{event.personName}</span>
                </div>
            );
        case 'statement_2':
            return (
                <div className="w-full flex items-center gap-1.5 bg-[#8e24aa] text-white text-[11px] px-1.5 py-1 rounded-sm shadow-[0_1px_2px_rgba(0,0,0,0.1)] hover:bg-[#7b1fa2] cursor-pointer transition-colors" title={event.label}>
                    <div className="w-3.5 h-3.5 rounded-full bg-white text-[#8e24aa] flex items-center justify-center font-bold text-[9px] shrink-0 leading-none">2</div>
                    <span className="truncate font-semibold">{event.personName}</span>
                </div>
            );
        case 'statement_3':
            return (
                <div className="w-full flex items-center gap-1.5 bg-[#e53935] text-white text-[11px] px-1.5 py-1 rounded-sm shadow-[0_1px_2px_rgba(0,0,0,0.1)] hover:bg-[#d32f2f] cursor-pointer transition-colors" title={event.label}>
                    <div className="w-3.5 h-3.5 rounded-full bg-white text-[#e53935] flex items-center justify-center font-bold text-[9px] shrink-0 leading-none">3</div>
                    <span className="truncate font-semibold">{event.personName}</span>
                </div>
            );
        default:
            return null;
    }
}
