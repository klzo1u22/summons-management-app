'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
    FileText, Search, Plus, Download, RefreshCw, FileSpreadsheet, FileDown,
    Filter, ChevronDown, Calendar, BarChart3, Sun, Moon,
    AlertTriangle, CheckCircle2, Clock, MoreVertical, Edit2, Trash2, Eye, History,
    LayoutGrid, List, FileCheck, AlertCircle, MessageSquare, Briefcase, User as UserIcon,
    ArrowLeft, ArrowRight, FolderKanban, ChevronLeft, ChevronRight, XCircle, ClipboardList, Zap, CalendarDays
} from 'lucide-react';
import { NotificationBell, Header } from '@/components/layout';
import {
    getSummonsAction, getCasesAction, deleteSummonsAction, updateSummonsAction, addSummonsAction, syncDataAction,
    getActivityLogsAction
} from './actions';
import { getOptionsAction, getSettingsAction } from './settings-actions';
import { Summons, Case, PRIORITY_OPTIONS, PERSON_ROLE_OPTIONS, SUMMONS_RESPONSE_OPTIONS, STATEMENT_STATUS_OPTIONS } from '@/lib/types';
import { EditSummonModal } from '@/components/summons/EditSummonModal';
import { LifecycleSummonForm } from '@/components/forms/LifecycleSummonForm';
import { FilterPopup, FilterState } from '@/components/ui/FilterPopup';
import Link from 'next/link';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useTheme } from '@/components/providers/ThemeProvider';
import { cn } from '@/lib/utils';
import { Drawer } from '@/components/ui/Drawer';


import { NewCalendarView } from '@/components/dashboard/NewCalendarView';
import { filterSummons } from '@/lib/logic';
import { SummonsActivity } from '@/components/SummonsActivity';

type SortField = 'person_name' | 'appearance_date' | 'status' | 'priority' | 'created_at';

type SortDirection = 'asc' | 'desc';
type ViewMode = 'all' | 'all_pending_works' | 'next_7_days' | 'first_entry' | 'draft_not_issued' | 'issued_not_served' | 'didnt_attend' | 'reschedule_date_not_communicated' | 'ongoing_statement' | 'final_statement_recorded' | 'role_tone_purpose';

// View mode configurations
const VIEW_MODES = [
    { id: 'all' as const, label: 'All', icon: FolderKanban, description: 'All records' },
    { id: 'all_pending_works' as const, label: 'All Pending Works', icon: Clock, description: 'Active items' },
    { id: 'next_7_days' as const, label: 'Next 7 Days', icon: CalendarDays, description: 'Upcoming' },
    { id: 'first_entry' as const, label: 'First Entry', icon: Plus, description: 'New / Draft' },
    { id: 'draft_not_issued' as const, label: 'Draft - Not Issued', icon: FileText, description: 'Ready to issue' },
    { id: 'issued_not_served' as const, label: 'Issued - Not Served', icon: Clock, description: 'Pending service' },
    { id: 'didnt_attend' as const, label: 'Didn’t Attend', icon: XCircle, description: 'Missed appearance' },
    { id: 'reschedule_date_not_communicated' as const, label: 'Reschedule Date Not Communicated', icon: Calendar, description: 'Action needed' },
    { id: 'ongoing_statement' as const, label: 'Ongoing Statement', icon: ClipboardList, description: 'In progress' },
    { id: 'final_statement_recorded' as const, label: 'Final Statement Recorded', icon: CheckCircle2, description: 'Completed' },
    { id: 'role_tone_purpose' as const, label: 'Role Tone Purpose', icon: FolderKanban, description: 'Metadata view' },
];

interface SortableHeaderProps {
    label: string;
    field: SortField;
    currentField: SortField;
    direction: SortDirection;
    onSort: (field: SortField) => void;
}

const SortableHeader = ({ label, field, currentField, direction, onSort }: SortableHeaderProps) => (
    <th onClick={() => onSort(field)} style={{ cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {label}
            {currentField === field && (
                direction === 'asc' ? <ChevronDown size={14} className="transform rotate-180" /> : <ChevronDown size={14} />
            )}
        </div>
    </th>
);

export default function UnifiedDashboard() {
    const { theme, toggleTheme } = useTheme();
    // State
    const [summons, setSummons] = useState<Summons[]>([]);
    const [cases, setCases] = useState<Case[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);
    const [showFilterPopup, setShowFilterPopup] = useState(false);
    const [filters, setFilters] = useState<FilterState>({
        priorities: [],
        personRoles: [],
        modesOfService: [],
        purposes: [],
        statementStatuses: [],
        isIssuedFilter: 'any',
        isServedFilter: 'any',
        rescheduleFilter: 'any',
        issueDateFrom: '',
        issueDateTo: '',
        appearanceDateFrom: '',
        appearanceDateTo: '',
    });
    const [sortField, setSortField] = useState<SortField>('appearance_date');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const [editingSummon, setEditingSummon] = useState<Summons | null>(null);
    const [viewingActivity, setViewingActivity] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    const exportMenuRef = useRef<HTMLDivElement>(null);
    const [appSettings, setAppSettings] = useState<Record<string, string>>({});
    const [dynamicOptions, setDynamicOptions] = useState<Record<string, any[]>>({});

    // Initial Data Load
    const loadData = async () => {
        setIsLoading(true);
        try {
            const [summonsData, casesData, settingsData] = await Promise.all([
                getSummonsAction(),
                getCasesAction(),
                getSettingsAction()
            ]);
            setSummons(summonsData);
            setCases(casesData);
            setAppSettings(settingsData);

            // Fetch property options
            const properties = [
                'person_role', 'priority', 'tone', 'purpose',
                'mode_of_service', 'statement_status', 'summons_response'
            ];
            const optionsMap: Record<string, any[]> = {};
            for (const prop of properties) {
                optionsMap[prop] = await getOptionsAction(prop);
            }
            setDynamicOptions(optionsMap);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const triggerSync = async () => {
        setIsSyncing(true);
        try {
            await syncDataAction();
            await loadData();
        } catch (error) {
            console.error('Sync failed:', error);
            alert('Failed to sync with Notion');
        } finally {
            setIsSyncing(false);
        }
    };

    const getCaseName = (caseId: string) => {
        return cases.find(c => c.id === caseId)?.name || 'Unknown Case';
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
                setShowExportMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ... (inside UnifiedDashboard)

    // Compute counts for tiles
    const tileCounts = useMemo(() => {
        return {
            all: filterSummons(summons, 'all').length,
            all_pending_works: filterSummons(summons, 'all_pending_works').length,
            next_7_days: filterSummons(summons, 'next_7_days').length,
            first_entry: filterSummons(summons, 'first_entry').length,
            draft_not_issued: filterSummons(summons, 'draft_not_issued').length,
            issued_not_served: filterSummons(summons, 'issued_not_served').length,
            didnt_attend: filterSummons(summons, 'didnt_attend').length,
            reschedule_date_not_communicated: filterSummons(summons, 'reschedule_date_not_communicated').length,
            ongoing_statement: filterSummons(summons, 'ongoing_statement').length,
            final_statement_recorded: filterSummons(summons, 'final_statement_recorded').length,
            role_tone_purpose: filterSummons(summons, 'role_tone_purpose').length,
        };
    }, [summons]);

    // Filter and sort summons
    const filteredSummons = useMemo(() => {
        let result: Summons[] = filterSummons(summons, viewMode);

        // Search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter((s: Summons) =>
                s.person_name.toLowerCase().includes(term) ||
                getCaseName(s.case_id).toLowerCase().includes(term) ||
                s.person_role?.toLowerCase().includes(term) ||
                s.contact_number?.includes(term)
            );
        }

        // Advanced filters from popup
        if (filters.priorities.length > 0) {
            result = result.filter((s: Summons) => s.priority && filters.priorities.includes(s.priority));
        }
        if (filters.personRoles.length > 0) {
            result = result.filter((s: Summons) => s.person_role && filters.personRoles.includes(s.person_role));
        }
        if (filters.modesOfService.length > 0) {
            result = result.filter((s: Summons) => s.mode_of_service && s.mode_of_service.some((m: string) => filters.modesOfService.includes(m)));
        }
        if (filters.purposes.length > 0) {
            result = result.filter((s: Summons) => s.purpose && s.purpose.some((p: string) => filters.purposes.includes(p)));
        }
        if (filters.statementStatuses.length > 0) {
            result = result.filter((s: Summons) => s.statement_status && filters.statementStatuses.includes(s.statement_status));
        }

        // Tri-state filters
        if (filters.isIssuedFilter === 'yes') {
            result = result.filter((s: Summons) => s.is_issued);
        } else if (filters.isIssuedFilter === 'no') {
            result = result.filter((s: Summons) => !s.is_issued);
        }
        if (filters.isServedFilter === 'yes') {
            result = result.filter((s: Summons) => s.is_served);
        } else if (filters.isServedFilter === 'no') {
            result = result.filter((s: Summons) => !s.is_served);
        }
        if (filters.rescheduleFilter === 'yes') {
            result = result.filter((s: Summons) => s.requests_reschedule);
        } else if (filters.rescheduleFilter === 'no') {
            result = result.filter((s: Summons) => !s.requests_reschedule);
        }

        // Date range filters
        if (filters.issueDateFrom) {
            result = result.filter((s: Summons) => s.issue_date && s.issue_date >= filters.issueDateFrom);
        }
        if (filters.issueDateTo) {
            result = result.filter((s: Summons) => s.issue_date && s.issue_date <= filters.issueDateTo);
        }
        if (filters.appearanceDateFrom) {
            result = result.filter((s: Summons) => s.appearance_date && s.appearance_date >= filters.appearanceDateFrom);
        }
        if (filters.appearanceDateTo) {
            result = result.filter((s: Summons) => s.appearance_date && s.appearance_date <= filters.appearanceDateTo);
        }

        // Sorting
        result.sort((a, b) => {
            let aVal = a[sortField];
            let bVal = b[sortField];

            if (sortField === 'appearance_date' || sortField === 'created_at') {
                const aTime = aVal && (typeof aVal === 'string' || typeof aVal === 'number') ? new Date(aVal).getTime() : 0;
                const bTime = bVal && (typeof bVal === 'string' || typeof bVal === 'number') ? new Date(bVal).getTime() : 0;
                return sortDirection === 'asc' ? aTime - bTime : bTime - aTime;
            }

            const aSafe = aVal ?? '';
            const bSafe = bVal ?? '';

            if (aSafe < bSafe) return sortDirection === 'asc' ? -1 : 1;
            if (aSafe > bSafe) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [summons, viewMode, searchTerm, filters, sortField, sortDirection, cases]);

    // Pagination
    const totalPages = Math.ceil(filteredSummons.length / pageSize);
    const paginatedSummons = filteredSummons.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    // Handlers
    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this summons?')) return;
        setSummons(prev => prev.filter(s => s.id !== id));
        await deleteSummonsAction(id);
    };

    const handleExportCSV = () => {
        // Only export visible columns, excluding 'actions'
        const exportColumns = visibleColumns.filter(col => col.id !== 'actions');

        const csvData = filteredSummons.map(s => {
            const row: Record<string, string> = {};
            exportColumns.forEach(col => {
                row[col.label] = col.export(s);
            });
            return row;
        });

        const csv = Papa.unparse(csvData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `summons_export_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        setShowExportMenu(false);
    };

    const handleExportPDF = () => {
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        // Only export visible columns, excluding 'actions'
        const exportColumns = visibleColumns.filter(col => col.id !== 'actions');
        const headers = [exportColumns.map(col => col.label)];
        const body = filteredSummons.map(s => exportColumns.map(col => col.export(s)));

        doc.setFontSize(18);
        doc.text('Summons Report', 14, 22);
        doc.setFontSize(10);
        doc.text(`View: ${VIEW_MODES.find(v => v.id === viewMode)?.label || 'All'}`, 14, 28);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 34);

        autoTable(doc, {
            head: headers,
            body: body,
            startY: 40,
            styles: { fontSize: 7, cellPadding: 2 },
            headStyles: { fillColor: [99, 102, 241] },
            margin: { left: 10, right: 10 }
        });

        doc.save(`summons_report_${new Date().toISOString().split('T')[0]}.pdf`);
        setShowExportMenu(false);
    };

    const handleAddSummons = async (data: Record<string, unknown>) => {
        // Derive status from the form data
        const status = data.served_date ? 'Served' : data.issue_date ? 'Issued' : 'Draft';

        const newSummons: Summons = {
            id: `sum-${Date.now()}`,
            person_name: data.person_name as string,
            person_role: data.person_role as string,
            case_id: data.case_id as string,
            contact_number: data.contact_number as string,
            email: data.email as string,
            priority: data.priority as string,
            tone: data.tone as string,
            purpose: data.purpose as string[],
            notes: data.notes as string,
            issue_date: data.issue_date as string,
            mode_of_service: data.mode_of_service as string[],
            served_date: data.served_date as string,
            appearance_date: data.appearance_date as string,
            appearance_time: data.appearance_time as string,
            rescheduled_date: data.rescheduled_date as string,
            rescheduled_date_communicated: !!data.rescheduled_date_communicated,
            statement_status: data.statement_status as string,
            date_of_1st_statement: data.date_of_1st_statement as string,
            date_of_2nd_statement: data.date_of_2nd_statement as string,
            date_of_3rd_statement: data.date_of_3rd_statement as string,
            followup_required: !!data.followup_required,
            summons_response: data.summons_response as string,
            status: status as Summons['status'],
            created_at: new Date().toISOString(),
            is_issued: !!data.issue_date,
            is_served: !!data.served_date,
            requests_reschedule: !!data.rescheduled_date,
            statement_ongoing: !!data.date_of_1st_statement && data.statement_status !== 'Recorded',
            statement_recorded: data.statement_status === 'Recorded',
        };

        setSummons(prev => [newSummons, ...prev]);
        setShowAddModal(false);
        await addSummonsAction(newSummons);
        loadData();
    };

    const handleSync = async () => {
        await triggerSync();
        loadData();
    };

    const validateSummonsLogic = (summon: Summons): string[] => {
        const errors: string[] = [];
        if (summon.is_issued && !summon.issue_date) {
            errors.push("Marked as Issued but missing Issue Date");
        }
        if (summon.is_served) {
            if (!summon.is_issued) errors.push("Marked as Served but not Issued");
            if (!summon.served_date) errors.push("Marked as Served but missing Served Date");
            if (!summon.mode_of_service || summon.mode_of_service.length === 0) errors.push("Marked as Served but missing Mode of Service");
        }
        if (summon.requests_reschedule && !summon.is_served) {
            errors.push("Reschedule requested but not Served");
        }
        if (summon.rescheduled_date_communicated && !summon.rescheduled_date) {
            errors.push("Rescheduled date communicated but no date set");
        }
        return errors;
    };

    const getStatusBadge = (summon: Summons) => {
        const errors = validateSummonsLogic(summon);
        let badge;

        if (summon.is_served) {
            badge = <span className="badge badge-success gap-1"><CheckCircle2 size={12} /> Served</span>;
        } else {
            const today = new Date().toISOString().split('T')[0];
            if (summon.appearance_date && summon.appearance_date < today && !summon.rescheduled_date) {
                badge = <span className="badge badge-error gap-1"><AlertTriangle size={12} /> Overdue</span>;
            } else if (summon.is_issued) {
                badge = <span className="badge badge-info gap-1"><Clock size={12} /> Issued</span>;
            } else {
                badge = <span className="badge badge-neutral">Draft</span>;
            }
        }

        if (errors.length > 0) {
            return (
                <div className="flex items-center gap-1">
                    {badge}
                    <div className="tooltip tooltip-left" data-tip={errors.join('. ')}>
                        <AlertTriangle size={14} className="text-warning cursor-help" />
                    </div>
                </div>
            );
        }

        return badge;
    };

    const getPriorityBadge = (priority?: string | null) => {
        if (!priority) return null;
        const colors: Record<string, string> = {
            'Extremely Important': 'badge-error',
            'High': 'badge-warning',
            'Medium': 'badge-info',
            'Low': 'badge-neutral',
        };
        return <span className={`badge ${colors[priority] || 'badge-neutral'}`}>{priority}</span>;
    };

    const formatDate = (date?: string | null) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    // Check if any filters are active
    const hasActiveFilters = filters.priorities.length > 0 ||
        filters.personRoles.length > 0 ||
        filters.modesOfService.length > 0 ||
        filters.purposes.length > 0 ||
        filters.statementStatuses.length > 0 ||
        filters.isIssuedFilter !== 'any' ||
        filters.isServedFilter !== 'any' ||
        filters.rescheduleFilter !== 'any' ||
        filters.issueDateFrom !== '' ||
        filters.issueDateTo !== '' ||
        filters.appearanceDateFrom !== '' ||
        filters.appearanceDateTo !== '';

    const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
    const [showColumnPicker, setShowColumnPicker] = useState(false);
    const [isCalendarView, setIsCalendarView] = useState(false);

    // Reset hidden columns when view changes - hide columns not in the default set for that view
    useEffect(() => {
        const getDefaultColumnsForView = (mode: ViewMode): string[] => {
            const appearanceModes: ViewMode[] = ['didnt_attend', 'reschedule_date_not_communicated', 'next_7_days'];
            const statementModes: ViewMode[] = ['ongoing_statement', 'final_statement_recorded', 'all_pending_works'];
            const roleToneModes: ViewMode[] = ['role_tone_purpose'];

            if (appearanceModes.includes(mode)) {
                return ['person_name', 'case', 'appearance_date', 'rescheduled_date', 'response', 'served', 'actions'];
            } else if (mode === 'issued_not_served') {
                return ['person_name', 'case', 'issue_date', 'appearance_date', 'served', 'actions'];
            } else if (statementModes.includes(mode)) {
                return ['person_name', 'case', 'statement_status', 'date_of_1st_statement', 'date_of_2nd_statement', 'date_of_3rd_statement', 'recorded', 'actions'];
            } else if (roleToneModes.includes(mode)) {
                return ['person_name', 'case', 'role', 'tone', 'purpose', 'contact', 'status', 'actions'];
            } else if (mode === 'first_entry' || mode === 'draft_not_issued') {
                return ['person_name', 'role', 'case', 'created_at', 'status', 'actions'];
            } else {
                // Default (All)
                return ['person_name', 'role', 'case', 'appearance_date', 'status', 'priority', 'actions'];
            }
        };

        const allColumnIds = Object.keys(allBaseColumns);
        const defaultColumns = getDefaultColumnsForView(viewMode);
        // Hide columns that are not in the default set for this view
        const columnsToHide = allColumnIds.filter(id => !defaultColumns.includes(id));
        setHiddenColumns(columnsToHide);
    }, [viewMode]);

    interface ColumnConfig {
        id: string;
        label: string;
        renderHeader: () => React.ReactNode;
        renderCell: (s: Summons) => React.ReactNode;
        export: (s: Summons) => string;
    }

    // All possible columns - defined outside useMemo so column picker can access all
    const allBaseColumns: Record<string, { id: string; label: string }> = {
        person_name: { id: 'person_name', label: 'Person Name' },
        case: { id: 'case', label: 'Case' },
        role: { id: 'role', label: 'Role' },
        appearance_date: { id: 'appearance_date', label: 'Appearance Date' },
        status: { id: 'status', label: 'Status' },
        priority: { id: 'priority', label: 'Priority' },
        rescheduled_date: { id: 'rescheduled_date', label: 'Rescheduled Date' },
        issue_date: { id: 'issue_date', label: 'Issue Date' },
        created_at: { id: 'created_at', label: 'Created' },
        response: { id: 'response', label: 'Response' },
        served: { id: 'served', label: 'Served' },
        statement_status: { id: 'statement_status', label: 'Statement Status' },
        date_of_1st_statement: { id: 'date_of_1st_statement', label: '1st Statement' },
        date_of_2nd_statement: { id: 'date_of_2nd_statement', label: '2nd Statement' },
        date_of_3rd_statement: { id: 'date_of_3rd_statement', label: '3rd Statement' },
        recorded: { id: 'recorded', label: 'Recorded' },
        tone: { id: 'tone', label: 'Tone' },
        purpose: { id: 'purpose', label: 'Purpose' },
        contact: { id: 'contact', label: 'Contact' },
        actions: { id: 'actions', label: 'Actions' },
    };

    const columns = useMemo<ColumnConfig[]>(() => {
        const baseColumns: Record<string, ColumnConfig> = {
            person_name: {
                id: 'person_name',
                label: 'Person Name',
                renderHeader: () => <SortableHeader label="Person Name" field="person_name" currentField={sortField} direction={sortDirection} onSort={handleSort} />,
                renderCell: (s) => (
                    <td key="person_name">
                        <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                            {s.person_name}
                        </span>
                        {s.contact_number && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.contact_number}</div>
                        )}
                    </td>
                ),
                export: (s) => s.person_name
            },
            case: {
                id: 'case',
                label: 'Case',
                renderHeader: () => <th key="case">Case</th>,
                renderCell: (s) => (
                    <td key="case">
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                            {getCaseName(s.case_id)}
                        </span>
                    </td>
                ),
                export: (s) => getCaseName(s.case_id)
            },
            role: {
                id: 'role',
                label: 'Role',
                renderHeader: () => <th key="role">Role</th>,
                renderCell: (s) => <td key="role">{s.person_role || '-'}</td>,
                export: (s) => s.person_role || '-'
            },
            appearance_date: {
                id: 'appearance_date',
                label: 'Appearance Date',
                renderHeader: () => <SortableHeader label="Appearance Date" field="appearance_date" currentField={sortField} direction={sortDirection} onSort={handleSort} />,
                renderCell: (s) => (
                    <td key="appearance_date" style={{ fontWeight: 500, color: s.appearance_date && s.appearance_date < new Date().toISOString().split('T')[0] && !s.rescheduled_date ? 'var(--error)' : 'inherit' }}>
                        {formatDate(s.appearance_date)}
                    </td>
                ),
                export: (s) => s.appearance_date || '-'
            },
            status: {
                id: 'status',
                label: 'Status',
                renderHeader: () => <SortableHeader label="Status" field="status" currentField={sortField} direction={sortDirection} onSort={handleSort} />,
                renderCell: (s) => <td key="status">{getStatusBadge(s)}</td>,
                export: (s) => s.status
            },
            priority: {
                id: 'priority',
                label: 'Priority',
                renderHeader: () => <SortableHeader label="Priority" field="priority" currentField={sortField} direction={sortDirection} onSort={handleSort} />,
                renderCell: (s) => <td key="priority">{getPriorityBadge(s.priority)}</td>,
                export: (s) => s.priority || '-'
            },
            rescheduled_date: {
                id: 'rescheduled_date',
                label: 'Rescheduled Date',
                renderHeader: () => <th key="rescheduled_date">Rescheduled Date</th>,
                renderCell: (s) => <td key="rescheduled_date">{formatDate(s.rescheduled_date)}</td>,
                export: (s) => s.rescheduled_date || '-'
            },
            issue_date: {
                id: 'issue_date',
                label: 'Issue Date',
                renderHeader: () => <th key="issue_date">Issue Date</th>,
                renderCell: (s) => <td key="issue_date">{formatDate(s.issue_date)}</td>,
                export: (s) => s.issue_date || '-'
            },
            created_at: {
                id: 'created_at',
                label: 'Created',
                renderHeader: () => <SortableHeader label="Created" field="created_at" currentField={sortField} direction={sortDirection} onSort={handleSort} />,
                renderCell: (s) => <td key="created_at">{formatDate(s.created_at)}</td>,
                export: (s) => s.created_at ? new Date(s.created_at).toISOString() : '-'
            },
            response: {
                id: 'response',
                label: 'Response',
                renderHeader: () => <th key="response">Response</th>,
                renderCell: (s) => (
                    <td key="response">
                        {s.summons_response && (
                            <span className={`badge ${s.summons_response === 'Served' ? 'badge-success' : 'badge-neutral'}`}>
                                {s.summons_response}
                            </span>
                        )}
                    </td>
                ),
                export: (s) => s.summons_response || '-'
            },
            served: {
                id: 'served',
                label: 'Served',
                renderHeader: () => <th key="served">Served</th>,
                renderCell: (s) => (
                    <td key="served">
                        {s.is_served ? (
                            <span className="badge badge-success"><CheckCircle2 size={12} /></span>
                        ) : (
                            <span className="badge badge-neutral"><XCircle size={12} /></span>
                        )}
                    </td>
                ),
                export: (s) => s.is_served ? 'Yes' : 'No'
            },
            statement_status: {
                id: 'statement_status',
                label: 'Statement Status',
                renderHeader: () => <th key="statement_status">Statement Status</th>,
                renderCell: (s) => (
                    <td key="statement_status">
                        <span className={`badge ${s.statement_status === 'Completed' ? 'badge-success' : 'badge-neutral'}`}>
                            {s.statement_status || 'Pending'}
                        </span>
                    </td>
                ),
                export: (s) => s.statement_status || 'Pending'
            },
            date_of_1st_statement: {
                id: 'date_of_1st_statement',
                label: '1st Statement',
                renderHeader: () => <th key="date_of_1st_statement">1st Statement</th>,
                renderCell: (s) => <td key="date_of_1st_statement">{formatDate(s.date_of_1st_statement)}</td>,
                export: (s) => s.date_of_1st_statement || '-'
            },
            date_of_2nd_statement: {
                id: 'date_of_2nd_statement',
                label: '2nd Statement',
                renderHeader: () => <th key="date_of_2nd_statement">2nd Statement</th>,
                renderCell: (s) => <td key="date_of_2nd_statement">{formatDate(s.date_of_2nd_statement)}</td>,
                export: (s) => s.date_of_2nd_statement || '-'
            },
            date_of_3rd_statement: {
                id: 'date_of_3rd_statement',
                label: '3rd Statement',
                renderHeader: () => <th key="date_of_3rd_statement">3rd Statement</th>,
                renderCell: (s) => <td key="date_of_3rd_statement">{formatDate(s.date_of_3rd_statement)}</td>,
                export: (s) => s.date_of_3rd_statement || '-'
            },
            recorded: {
                id: 'recorded',
                label: 'Recorded',
                renderHeader: () => <th key="recorded">Recorded</th>,
                renderCell: (s) => (
                    <td key="recorded">
                        {s.statement_recorded ? (
                            <span className="badge badge-success">Yes</span>
                        ) : (
                            <span className="badge badge-neutral">No</span>
                        )}
                    </td>
                ),
                export: (s) => s.statement_recorded ? 'Yes' : 'No'
            },
            tone: {
                id: 'tone',
                label: 'Tone',
                renderHeader: () => <th key="tone">Tone</th>,
                renderCell: (s) => <td key="tone">{s.tone || '-'}</td>,
                export: (s) => s.tone || '-'
            },
            purpose: {
                id: 'purpose',
                label: 'Purpose',
                renderHeader: () => <th key="purpose">Purpose</th>,
                renderCell: (s) => (
                    <td key="purpose">
                        <div className="flex gap-1 flex-wrap">
                            {s.purpose?.map((p, i) => (
                                <span key={i} className="badge badge-sm badge-neutral">{p}</span>
                            ))}
                        </div>
                    </td>
                ),
                export: (s) => s.purpose?.join(', ') || '-'
            },
            contact: {
                id: 'contact',
                label: 'Contact',
                renderHeader: () => <th key="contact">Contact</th>,
                renderCell: (s) => <td key="contact">{s.contact_number || '-'}</td>,
                export: (s) => s.contact_number || '-'
            },
            actions: {
                id: 'actions',
                label: 'Actions',
                renderHeader: () => <th key="actions" style={{ width: 100 }}>Actions</th>,
                renderCell: (s) => (
                    <td key="actions">
                        <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setViewingActivity(s.id)} title="View History">
                                <Clock size={14} />
                            </button>
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setEditingSummon(s)} title="Edit">
                                <Edit2 size={14} />
                            </button>
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(s.id)} title="Delete" style={{ color: 'var(--error)' }}>
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </td>
                ),
                export: (s) => ''
            }
        };
        // Get all column IDs that should be visible (from baseColumns, excluding hidden ones)
        const allColumnIds = Object.keys(baseColumns);

        // Default column order based on view mode (determines initial order)
        const appearanceModes: ViewMode[] = ['didnt_attend', 'reschedule_date_not_communicated', 'next_7_days'];
        const statementModes: ViewMode[] = ['ongoing_statement', 'final_statement_recorded', 'all_pending_works'];
        const roleToneModes: ViewMode[] = ['role_tone_purpose'];

        let defaultColumnIds: string[] = [];
        if (appearanceModes.includes(viewMode)) {
            defaultColumnIds = ['person_name', 'case', 'appearance_date', 'rescheduled_date', 'response', 'served', 'actions'];
        } else if (viewMode === 'issued_not_served') {
            defaultColumnIds = ['person_name', 'case', 'issue_date', 'appearance_date', 'served', 'actions'];
        } else if (statementModes.includes(viewMode)) {
            defaultColumnIds = ['person_name', 'case', 'statement_status', 'date_of_1st_statement', 'date_of_2nd_statement', 'date_of_3rd_statement', 'recorded', 'actions'];
        } else if (roleToneModes.includes(viewMode)) {
            defaultColumnIds = ['person_name', 'case', 'role', 'tone', 'purpose', 'contact', 'status', 'actions'];
        } else if (viewMode === 'first_entry' || viewMode === 'draft_not_issued') {
            defaultColumnIds = ['person_name', 'role', 'case', 'created_at', 'status', 'actions'];
        } else {
            // Default (All)
            defaultColumnIds = ['person_name', 'role', 'case', 'appearance_date', 'status', 'priority', 'actions'];
        }

        // Merge: start with default columns, then add any additional non-hidden columns
        const orderedColumnIds = [
            ...defaultColumnIds,
            ...allColumnIds.filter(id => !defaultColumnIds.includes(id))
        ];

        // Return columns not in hidden list
        return orderedColumnIds
            .filter(id => !hiddenColumns.includes(id))
            .map(id => baseColumns[id])
            .filter(Boolean);
    }, [viewMode, sortField, sortDirection, handleSort, formatDate, getCaseName, getStatusBadge, getPriorityBadge, setEditingSummon, handleDelete, hiddenColumns]);

    const visibleColumns = columns;

    // Different table columns based on view mode
    const renderTableHeader = () => {
        return (
            <tr>
                {visibleColumns.map(col => (
                    <React.Fragment key={col.id}>{col.renderHeader()}</React.Fragment>
                ))}
            </tr>
        );
    };

    const renderTableRow = (summon: Summons) => {
        return (
            <tr key={summon.id}>
                {visibleColumns.map(col => col.renderCell(summon))}
            </tr>
        );
    };

    if (isLoading) {
        return (
            <div className="unified-dashboard">
                <div className="dashboard-loading">
                    <div className="loading-spinner"></div>
                    <p>Loading summons data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="unified-dashboard">
            {/* Header Bar */}
            {/* Unified Header */}
            <Header
                title="Summons Manager"
                subtitle="Comprehensive summons and case management"
                searchQuery={searchTerm}
                onSearchChange={(val) => {
                    setSearchTerm(val);
                    setCurrentPage(1);
                }}
                searchPlaceholder="Search by name, case, role..."
                onAddClick={() => setShowAddModal(true)}
                addLabel="New Summons"
                actions={
                    <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                        {/* Filter Button */}
                        <button
                            className={`btn btn-secondary ${hasActiveFilters ? 'has-filters' : ''}`}
                            onClick={() => setShowFilterPopup(true)}
                            title="Filters"
                        >
                            <Filter size={16} />
                            {hasActiveFilters && <span className="filter-badge">{
                                filters.priorities.length + filters.personRoles.length +
                                filters.modesOfService.length + filters.purposes.length +
                                filters.statementStatuses.length +
                                (filters.isIssuedFilter !== 'any' ? 1 : 0) +
                                (filters.isServedFilter !== 'any' ? 1 : 0) +
                                (filters.rescheduleFilter !== 'any' ? 1 : 0) +
                                (filters.issueDateFrom || filters.issueDateTo ? 1 : 0) +
                                (filters.appearanceDateFrom || filters.appearanceDateTo ? 1 : 0)
                            }</span>}
                        </button>

                        {/* Column Picker */}
                        {!isCalendarView && (
                            <div style={{ position: 'relative' }}>
                                <button className="btn btn-secondary" onClick={() => setShowColumnPicker(!showColumnPicker)} title="Columns">
                                    <FolderKanban size={16} />
                                    <ChevronDown size={14} style={{ marginLeft: '4px' }} />
                                </button>
                                {showColumnPicker && (
                                    <div className="dropdown-menu" style={{ width: '240px', padding: '0.5rem', maxHeight: '400px', overflowY: 'auto', zIndex: 50 }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.25rem 0.5rem', opacity: 0.7, marginBottom: '0.25rem' }}>
                                            Toggle Columns
                                        </div>
                                        {Object.values(allBaseColumns).filter(col => col.id !== 'actions').map(col => {
                                            const isVisible = !hiddenColumns.includes(col.id);
                                            return (
                                                <label
                                                    key={col.id}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.5rem',
                                                        padding: '0.375rem 0.5rem',
                                                        cursor: 'pointer',
                                                        borderRadius: 'var(--radius-sm)',
                                                    }}
                                                    className="hover:bg-base-200"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="checkbox checkbox-xs"
                                                        checked={isVisible}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setHiddenColumns(hiddenColumns.filter(id => id !== col.id));
                                                            } else {
                                                                setHiddenColumns([...hiddenColumns, col.id]);
                                                            }
                                                        }}
                                                    />
                                                    <span style={{ fontSize: '0.875rem' }}>{col.label}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Reports Button */}
                        <a
                            href="/reports"
                            className="btn btn-secondary"
                            title="Reports & Analytics"
                        >
                            <BarChart3 size={16} />
                        </a>

                        {/* Calendar Toggle */}
                        <button
                            className={cn("btn", isCalendarView ? "btn-primary" : "btn-secondary")}
                            onClick={() => setIsCalendarView(!isCalendarView)}
                            title={isCalendarView ? "List View" : "Calendar View"}
                        >
                            <Calendar size={16} />
                        </button>

                        {/* Export Button */}
                        <div className="export-dropdown" ref={exportMenuRef}>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowExportMenu(!showExportMenu)}
                                title="Export Data"
                            >
                                <Download size={16} />
                                <ChevronDown size={14} style={{ marginLeft: '4px' }} />
                            </button>

                            {showExportMenu && (
                                <div className="dropdown-menu">
                                    <button onClick={handleExportCSV}>
                                        <FileSpreadsheet size={16} />
                                        Export CSV
                                    </button>
                                    <button onClick={handleExportPDF}>
                                        <FileDown size={16} />
                                        Export PDF
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Sync Button */}
                        <button
                            className="btn btn-secondary"
                            onClick={handleSync}
                            disabled={isSyncing}
                            title="Sync from Notion"
                        >
                            <RefreshCw size={16} className={isSyncing ? 'spinning' : ''} />
                        </button>

                        {/* Theme Toggle */}
                        <button
                            className="btn btn-ghost btn-icon"
                            onClick={toggleTheme}
                            title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                        >
                            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                        </button>

                        <div style={{ height: 24, width: 1, backgroundColor: 'var(--border)', margin: '0 8px' }} />
                    </div>
                }
            />

            {/* View Mode Tiles */}
            <div className="view-tiles">
                {VIEW_MODES.map((mode) => {
                    const Icon = mode.icon;
                    const isActive = viewMode === mode.id;
                    const count = tileCounts[mode.id];
                    return (
                        <button
                            key={mode.id}
                            className={`view-tile ${isActive ? 'active' : ''}`}
                            onClick={() => {
                                setViewMode(mode.id);
                                setCurrentPage(1);
                            }}
                            title={mode.description}
                        >
                            <Icon size={18} />
                            <span className="tile-label">{mode.label}</span>
                            <span className="tile-count">{count}</span>
                        </button>
                    );
                })}
            </div>

            {/* Main Data Table */}
            <main className="dashboard-main">
                {isCalendarView ? (
                    <NewCalendarView summons={filteredSummons} onClose={() => setIsCalendarView(false)} />
                ) : (
                    <>
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    {renderTableHeader()}
                                </thead>
                                <tbody>
                                    {paginatedSummons.length === 0 ? (
                                        <tr>
                                            <td colSpan={visibleColumns.length} style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-muted)' }}>
                                                No summons found matching your criteria
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedSummons.map(renderTableRow)
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="pagination">
                                <div className="pagination-info">
                                    Showing {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, filteredSummons.length)} of {filteredSummons.length}
                                </div>
                                <div className="pagination-controls">
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                    >
                                        <ChevronLeft size={16} />
                                    </button>

                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let pageNum;
                                        if (totalPages <= 5) {
                                            pageNum = i + 1;
                                        } else if (currentPage <= 3) {
                                            pageNum = i + 1;
                                        } else if (currentPage >= totalPages - 2) {
                                            pageNum = totalPages - 4 + i;
                                        } else {
                                            pageNum = currentPage - 2 + i;
                                        }
                                        return (
                                            <button
                                                key={pageNum}
                                                className={`btn btn-ghost btn-sm ${currentPage === pageNum ? 'active' : ''}`}
                                                onClick={() => setCurrentPage(pageNum)}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}

                                    <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                                <select
                                    className="input pagination-size"
                                    value={pageSize}
                                    onChange={(e) => {
                                        setPageSize(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                >
                                    <option value={10}>10 per page</option>
                                    <option value={15}>15 per page</option>
                                    <option value={25}>25 per page</option>
                                    <option value={50}>50 per page</option>
                                </select>
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* Filter Popup */}
            {showFilterPopup && (
                <FilterPopup
                    filters={filters}
                    onApply={(newFilters) => {
                        setFilters(newFilters);
                        setCurrentPage(1);
                        setShowFilterPopup(false);
                    }}
                    onClose={() => setShowFilterPopup(false)}
                />
            )}

            {/* Add Summons Drawer */}
            <Drawer
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title="Add New Summons"
                width="560px"
            >
                <LifecycleSummonForm
                    cases={cases}
                    options={dynamicOptions}
                    onSubmit={handleAddSummons}
                    onCancel={() => setShowAddModal(false)}
                />
            </Drawer>

            {/* Edit Summons Drawer */}
            <Drawer
                isOpen={!!editingSummon}
                onClose={() => setEditingSummon(null)}
                title={editingSummon ? `Edit: ${editingSummon.person_name}` : 'Edit Summons'}
                width="560px"
            >
                {editingSummon && (
                    <LifecycleSummonForm
                        initialData={editingSummon}
                        cases={cases}
                        options={dynamicOptions}
                        onSubmit={async (data: any) => {
                            await updateSummonsAction(editingSummon.id, data);
                            await loadData();
                            setEditingSummon(null);
                        }}
                        onCancel={() => setEditingSummon(null)}
                    />
                )}
            </Drawer>

            {/* Activity Log Drawer */}
            <Drawer
                isOpen={!!viewingActivity}
                onClose={() => setViewingActivity(null)}
                title="Activity History"
                width="480px"
            >
                {viewingActivity && (
                    <div style={{ padding: 'var(--space-6)' }}>
                        <SummonsActivity summonsId={viewingActivity} />
                    </div>
                )}
            </Drawer>
        </div>
    );
}
