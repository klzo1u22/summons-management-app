'use client';

import { useEffect, useState } from 'react';
import { getActivityLogsAction } from '@/app/actions';
import { ActivityLog } from '@/lib/types';
import { format } from 'date-fns';
import {
    Clock,
    PlusCircle,
    Edit,
    Trash2,
    RefreshCw,
    FileEdit,
    AlertCircle,
    User,
    Mail,
    Phone,
    Calendar,
    CheckCircle2
} from 'lucide-react';

interface SummonsActivityProps {
    summonsId: string;
}

export function SummonsActivity({ summonsId }: SummonsActivityProps) {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchLogs() {
            setLoading(true);
            try {
                const fetchedLogs = await getActivityLogsAction(summonsId);
                setLogs(fetchedLogs as ActivityLog[]);
            } catch (error) {
                console.error('Failed to fetch activity logs:', error);
            } finally {
                setLoading(false);
            }
        }

        if (summonsId) {
            fetchLogs();
        }
    }, [summonsId]);

    const getActionIcon = (action: string, fieldName?: string | null) => {
        switch (action) {
            case 'created':
                return <PlusCircle className="w-4 h-4 text-emerald-500" />;
            case 'deleted':
                return <Trash2 className="w-4 h-4 text-rose-500" />;
            case 'status_changed':
                return <RefreshCw className="w-4 h-4 text-amber-500" />;
            case 'field_changed':
                if (fieldName?.includes('date')) return <Calendar className="w-4 h-4 text-blue-500" />;
                if (fieldName === 'person_name') return <User className="w-4 h-4 text-purple-500" />;
                if (fieldName === 'email') return <Mail className="w-4 h-4 text-indigo-500" />;
                if (fieldName === 'contact_number') return <Phone className="w-4 h-4 text-cyan-500" />;
                return <FileEdit className="w-4 h-4 text-slate-500" />;
            case 'updated':
                return <Edit className="w-4 h-4 text-blue-500" />;
            default:
                return <AlertCircle className="w-4 h-4 text-slate-400" />;
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-8 space-y-3">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
                <p className="text-sm text-slate-500 animate-pulse">Loading activity history...</p>
            </div>
        );
    }

    if (logs.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <div className="p-3 bg-white rounded-full shadow-sm mb-3">
                    <Clock className="w-6 h-6 text-slate-300" />
                </div>
                <p className="text-sm font-medium text-slate-900">No activity logged yet</p>
                <p className="text-xs text-slate-500 mt-1">Changes to this summons will appear here.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Activity Timeline
            </h3>

            <div className="relative space-y-6 before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
                {logs.map((log) => (
                    <div key={log.id} className="relative pl-10 group">
                        {/* Dot/Icon container */}
                        <div className="absolute left-0 top-0 w-[35px] h-[35px] flex items-center justify-center bg-white border border-slate-200 rounded-full z-10 shadow-sm group-hover:border-slate-300 transition-colors">
                            {getActionIcon(log.action, log.field_name)}
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-slate-900">
                                    {log.description}
                                </p>
                                <time className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                                    {format(new Date(log.created_at), 'MMM d, h:mm a')}
                                </time>
                            </div>

                            {log.action === 'field_changed' || log.action === 'status_changed' ? (
                                <div className="mt-2 text-[11px] grid grid-cols-[1fr,auto,1fr] items-center gap-3 bg-slate-50/80 p-2 rounded-lg border border-slate-100">
                                    <div className="text-slate-500 truncate text-right italic" title={log.old_value || ''}>
                                        {log.old_value || '(empty)'}
                                    </div>
                                    <div className="flex items-center justify-center text-slate-300">
                                        <CheckCircle2 className="w-3 h-3" />
                                    </div>
                                    <div className="text-slate-900 font-medium truncate" title={log.new_value || ''}>
                                        {log.new_value || '(empty)'}
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
