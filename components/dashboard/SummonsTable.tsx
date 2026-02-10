"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Summons } from "@/lib/types";
import { Download, Edit2, Eye, FileText, Search, Trash2, ChevronLeft, ChevronRight, Check, X } from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { TableColumnHeader } from "./TableColumnHeader";
import { FilterPopup, FilterState } from "@/components/ui/FilterPopup";
import { ListFilter } from "lucide-react";
import { Select } from "@/components/ui/Select";
import { PERSON_ROLE_OPTIONS, PURPOSE_OPTIONS } from "@/lib/types";

interface SummonsTableProps {
    summons: Summons[];
    currentTab: string;
    onTabChange: (tab: string) => void;
    searchTerm: string;
    onSearchChange: (term: string) => void;
    onView: (id: string) => void;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
    onExportCSV: () => void;
    onExportPDF: () => void;
    hideControls?: boolean;
    onInlineUpdate?: (id: string, updates: Partial<Summons>) => Promise<void>;
}

const TABS = [
    "All Summons",
    "Not Issued",
    "Issued but Not Served",
    "Served but Didn't Appear",
    "Reschedule Pending",
    "Ongoing Statements",
    "Upcoming 7 Days",
];

export function SummonsTable({
    summons,
    currentTab,
    onTabChange,
    searchTerm,
    onSearchChange,
    onView,
    onEdit,
    onDelete,
    onExportCSV,
    onExportPDF,
    hideControls,
    onInlineUpdate
}: SummonsTableProps) {

    // --- State ---
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' | null }>({
        key: '',
        direction: null
    });

    const [filterConfig, setFilterConfig] = useState<Record<string, string[]>>({});

    // Advanced Filter State
    const [isFilterPopupOpen, setIsFilterPopupOpen] = useState(false);
    const [advancedFilters, setAdvancedFilters] = useState<FilterState>({
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

    // Inline Editing State
    const [editingRowId, setEditingRowId] = useState<string | null>(null);
    const [editValues, setEditValues] = useState<Partial<Summons>>({});
    const [isSaving, setIsSaving] = useState(false);

    // --- Effects ---

    // Focus input when editing starts (Removed as we have multiple inputs now)

    // Reset page on filter/sort change
    useEffect(() => {
        setCurrentPage(1);
    }, [sortConfig, filterConfig, searchTerm, currentTab]);


    // --- Logic ---

    // 1. Extract Options for Filtering (Memoized)
    const filterOptions = useMemo(() => {
        const getOptions = (key: keyof Summons) => {
            const values = new Set<string>();
            summons.forEach(s => {
                const val = s[key];
                if (Array.isArray(val)) {
                    val.forEach(v => { if (v) values.add(String(v)) });
                } else if (val !== null && val !== undefined) {
                    values.add(String(val));
                }
            });
            return Array.from(values).sort();
        };

        return {
            person_role: getOptions('person_role'),
            case_id: getOptions('case_id'),
            purpose: getOptions('purpose'),
            status: getOptions('status')
        };
    }, [summons]);


    // 2. Filter and Sort Data
    const filteredAndSortedSummons = useMemo(() => {
        let result = [...summons];

        // Apply Filters
        Object.keys(filterConfig).forEach(key => {
            const selectedValues = filterConfig[key];
            if (selectedValues.length > 0) {
                result = result.filter(item => {
                    const itemValue = item[key as keyof Summons];
                    if (Array.isArray(itemValue)) {
                        return itemValue.some(v => selectedValues.includes(String(v)));
                    }
                    return selectedValues.includes(String(itemValue));
                });
            }
        });

        // Apply Advanced Filters
        const af = advancedFilters;
        result = result.filter(item => {
            // Arrays & Multi-selects
            if (af.priorities.length > 0 && !af.priorities.includes(item.priority || '')) return false;
            // personRoles handled by column filter usually, but let's support both
            if (af.personRoles.length > 0 && !af.personRoles.includes(item.person_role || '')) return false;

            if (af.modesOfService.length > 0) {
                const modes = item.mode_of_service || [];
                // If filter has values, item must match at least one? Or all? Usually one (OR).
                // FilterPopupImpl typically implies "Is one of these". 
                // item.mode_of_service is array. IF item has ANY of the selected modes, we match?
                // Or if item's modes overlap? Yes.
                const hasMatch = modes.some(m => af.modesOfService.includes(m));
                if (!hasMatch) return false;
            }

            if (af.purposes.length > 0) {
                const purposes = item.purpose || [];
                const hasMatch = purposes.some(p => af.purposes.includes(p));
                if (!hasMatch) return false;
            }

            if (af.statementStatuses.length > 0 && !af.statementStatuses.includes(item.statement_status || '')) return false;

            // Tri-state Boolean Filters
            // 'is_served' and 'requests_reschedule' are properties of Summons (deduced from line 447, 448)
            // 'issued' implies issue_date exists?

            if (af.isIssuedFilter !== 'any') {
                const isIssued = !!item.issue_date;
                if (af.isIssuedFilter === 'yes' && !isIssued) return false;
                if (af.isIssuedFilter === 'no' && isIssued) return false;
            }

            if (af.isServedFilter !== 'any') {
                // item.is_served is likely a boolean based on line 447
                if (af.isServedFilter === 'yes' && !item.is_served) return false;
                if (af.isServedFilter === 'no' && item.is_served) return false;
            }

            if (af.rescheduleFilter !== 'any') {
                // item.requests_reschedule logic
                if (af.rescheduleFilter === 'yes' && !item.requests_reschedule) return false;
                if (af.rescheduleFilter === 'no' && item.requests_reschedule) return false;
            }

            // Date Ranges
            if (af.issueDateFrom && (!item.issue_date || item.issue_date < af.issueDateFrom)) return false;
            if (af.issueDateTo && (!item.issue_date || item.issue_date > af.issueDateTo)) return false;

            if (af.appearanceDateFrom && (!item.appearance_date || item.appearance_date < af.appearanceDateFrom)) return false;
            if (af.appearanceDateTo && (!item.appearance_date || item.appearance_date > af.appearanceDateTo)) return false;

            return true;
        });

        // Apply Sort
        if (sortConfig.key && sortConfig.direction) {
            result.sort((a, b) => {
                const aVal = a[sortConfig.key as keyof Summons];
                const bVal = b[sortConfig.key as keyof Summons];

                // Handle nulls
                if (aVal === bVal) return 0;
                if (aVal === null || aVal === undefined) return 1;
                if (bVal === null || bVal === undefined) return -1;

                // String sorting
                if (typeof aVal === 'string' && typeof bVal === 'string') {
                    return sortConfig.direction === 'asc'
                        ? aVal.localeCompare(bVal)
                        : bVal.localeCompare(aVal);
                }

                // Date sorting (assuming ISO strings or Date objects)
                const dateA = new Date(String(aVal)).getTime();
                const dateB = new Date(String(bVal)).getTime();

                if (!isNaN(dateA) && !isNaN(dateB)) {
                    return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
                }

                // Default comparison
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        // Apply Search
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            result = result.filter(item =>
                item.person_name.toLowerCase().includes(search) ||
                item.case_id.toLowerCase().includes(search) ||
                item.person_role?.toLowerCase().includes(search)
            );
        }

        // Apply Tab Filter
        const today = new Date();
        const next7Days = new Date();
        next7Days.setDate(today.getDate() + 7);
        const todayStr = today.toISOString().split('T')[0];
        const next7DaysStr = next7Days.toISOString().split('T')[0];

        if (currentTab === "Not Issued") {
            result = result.filter(s => !s.issue_date);
        } else if (currentTab === "Issued but Not Served") {
            result = result.filter(s => s.issue_date && !s.is_served);
        } else if (currentTab === "Served but Didn't Appear") {
            result = result.filter(s => s.is_served && s.appearance_date && s.appearance_date < todayStr && !s.statement_recorded);
        } else if (currentTab === "Reschedule Pending") {
            result = result.filter(s => s.requests_reschedule);
        } else if (currentTab === "Ongoing Statements") {
            result = result.filter(s => s.statement_ongoing);
        } else if (currentTab === "Upcoming 7 Days") {
            result = result.filter(s => s.appearance_date && s.appearance_date >= todayStr && s.appearance_date <= next7DaysStr);
        }

        return result;
    }, [summons, filterConfig, sortConfig, advancedFilters, currentTab, searchTerm]);


    // 3. Pagination
    const totalPages = Math.ceil(filteredAndSortedSummons.length / pageSize);
    const paginatedData = filteredAndSortedSummons.slice((currentPage - 1) * pageSize, currentPage * pageSize);


    // --- Handlers ---

    const handleSort = (key: string, direction: 'asc' | 'desc' | null) => {
        setSortConfig({ key, direction });
    };

    const handleFilter = (key: string, values: string[]) => {
        setFilterConfig(prev => ({ ...prev, [key]: values }));
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    // Inline Editing Handlers
    const startRowEdit = (item: Summons) => {
        if (!onInlineUpdate) return;
        setEditingRowId(item.id);
        setEditValues({
            person_name: item.person_name,
            person_role: item.person_role,
            purpose: item.purpose,
            issue_date: item.issue_date,
            appearance_date: item.appearance_date,
            case_id: item.case_id,
            contact_number: item.contact_number,
            status: item.status,
            summons_response: item.summons_response,
            is_served: item.is_served,
            requests_reschedule: item.requests_reschedule,
        });
    };

    const cancelRowEdit = () => {
        setEditingRowId(null);
        setEditValues({});
        setIsSaving(false);
    };

    const handleEditChange = (field: keyof Summons, value: any) => {
        setEditValues(prev => ({ ...prev, [field]: value }));
    };

    const saveRowEdit = async () => {
        if (!editingRowId || !onInlineUpdate) return;
        try {
            setIsSaving(true);
            const original = summons.find(s => s.id === editingRowId);
            if (!original) return;

            // Helper to check equality safely
            const isDifferent = (key: keyof Summons) => {
                const newVal = editValues[key];
                const oldVal = original[key];
                if (Array.isArray(newVal) && Array.isArray(oldVal)) {
                    if (newVal.length !== oldVal.length) return true;
                    return !newVal.every((v, i) => v === oldVal[i]);
                }
                return newVal !== oldVal;
            };

            const updates: Partial<Summons> = {};

            if (isDifferent('person_name')) updates.person_name = editValues.person_name;
            if (isDifferent('person_role')) updates.person_role = editValues.person_role;
            if (isDifferent('case_id')) updates.case_id = editValues.case_id;
            if (isDifferent('issue_date')) updates.issue_date = editValues.issue_date;
            if (isDifferent('appearance_date')) updates.appearance_date = editValues.appearance_date;
            if (isDifferent('contact_number')) updates.contact_number = editValues.contact_number;
            if (editValues.purpose && isDifferent('purpose')) updates.purpose = editValues.purpose;
            if (isDifferent('status')) updates.status = editValues.status;
            if (isDifferent('summons_response')) updates.summons_response = editValues.summons_response;
            if (isDifferent('is_served')) updates.is_served = editValues.is_served;
            if (isDifferent('requests_reschedule')) updates.requests_reschedule = editValues.requests_reschedule;

            if (Object.keys(updates).length > 0) {
                await onInlineUpdate(editingRowId, updates);
            }
            setEditingRowId(null);
            setEditValues({});
        } catch (error) {
            console.error("Failed to update", error);
        } finally {
            setIsSaving(false);
        }
    };

    const getRowClass = (s: Summons) => {
        const today = new Date();
        const scheduledDate = s.appearance_date ? new Date(s.appearance_date) : null;
        const effectiveDate = s.rescheduled_date ? new Date(s.rescheduled_date) : scheduledDate;

        let classes = "hover:bg-accent/5 transition-colors border-b border-border ";

        if (effectiveDate) {
            const diffTime = effectiveDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays < 0 && !s.statement_recorded && !s.requests_reschedule) {
                return classes + "bg-red-50 hover:bg-red-100";
            }
            if (diffDays >= 0 && diffDays <= 3) {
                return classes + "bg-yellow-50 hover:bg-yellow-100";
            }
        }
        return classes;
    };


    return (
        <div className="space-y-4">
            {/* Header Actions for Table */}
            {!hideControls && (
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-2">
                    <div className="flex border-b border-border overflow-x-auto w-full md:w-auto">
                        {TABS.map((tab) => (
                            <button
                                key={tab}
                                onClick={() => { onTabChange(tab); setCurrentPage(1); }}
                                aria-label={`Filter by ${tab}`}
                                className={`
                                px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
                                ${currentTab === tab || (tab === "All Summons" && !TABS.includes(currentTab) && currentTab !== "")
                                        ? "border-primary text-primary"
                                        : "border-transparent text-muted-foreground hover:text-foreground"}
                            `}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-2 w-full md:w-auto items-center">
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search name, case, or role..."
                                className="pl-9 h-9 w-full bg-white"
                                value={searchTerm}
                                onChange={(e) => { onSearchChange(e.target.value); setCurrentPage(1); }}
                            />
                        </div>
                        <Button size="sm" variant="outline" onClick={onExportCSV} title="Export CSV">
                            <FileText className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">CSV</span>
                        </Button>
                        <Button size="sm" variant="outline" onClick={onExportPDF} title="Export PDF">
                            <Download className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">PDF</span>
                        </Button>
                        <Button
                            size="sm"
                            variant={Object.values(advancedFilters).some(v => Array.isArray(v) ? v.length > 0 : v !== 'any' && v !== '') ? "secondary" : "outline"}
                            onClick={() => setIsFilterPopupOpen(true)}
                            className="ml-2 gap-2"
                        >
                            <ListFilter size={16} />
                            <span className="hidden md:inline">Advanced Filters</span>
                        </Button>
                    </div>
                </div>
            )}

            {isFilterPopupOpen && (
                <FilterPopup
                    filters={advancedFilters}
                    onApply={(newFilters) => {
                        setAdvancedFilters(newFilters);
                        setIsFilterPopupOpen(false);
                        setCurrentPage(1);
                    }}
                    onClose={() => setIsFilterPopupOpen(false)}
                />
            )}

            {/* Table */}
            <div className="bg-white rounded-lg shadow-sm border border-border overflow-hidden">
                <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full text-sm text-left" role="grid" aria-label="Summons List">
                        <thead className="bg-[var(--surface-sunken)] text-muted-foreground font-medium uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4">
                                    <div className="flex flex-col gap-1">
                                        <TableColumnHeader
                                            title="Name"
                                            columnKey="person_name"
                                            sortable={true}
                                            sortDirection={sortConfig.key === 'person_name' ? sortConfig.direction : null}
                                            onSort={(dir) => handleSort('person_name', dir)}
                                            filterable={false}
                                        />
                                        <TableColumnHeader
                                            title="Role"
                                            columnKey="person_role"
                                            sortable={true}
                                            sortDirection={sortConfig.key === 'person_role' ? sortConfig.direction : null}
                                            onSort={(dir) => handleSort('person_role', dir)}
                                            filterable={true}
                                            selectedFilters={filterConfig['person_role'] || []}
                                            onFilter={(vals) => handleFilter('person_role', vals)}
                                            options={filterOptions.person_role}
                                        />
                                    </div>
                                </th>
                                <th className="px-6 py-4">
                                    <TableColumnHeader
                                        title="Case"
                                        columnKey="case_id"
                                        sortable={true}
                                        sortDirection={sortConfig.key === 'case_id' ? sortConfig.direction : null}
                                        onSort={(dir) => handleSort('case_id', dir)}
                                        filterable={true}
                                        selectedFilters={filterConfig['case_id'] || []}
                                        onFilter={(vals) => handleFilter('case_id', vals)}
                                        options={filterOptions.case_id}
                                    />
                                </th>
                                <th className="px-6 py-4">
                                    <TableColumnHeader
                                        title="Purpose"
                                        columnKey="purpose"
                                        sortable={false} // Complex sort
                                        filterable={true}
                                        selectedFilters={filterConfig['purpose'] || []}
                                        onFilter={(vals) => handleFilter('purpose', vals)}
                                        options={filterOptions.purpose}
                                    />
                                </th>
                                <th className="px-6 py-4">
                                    <TableColumnHeader
                                        title="Issue Date"
                                        columnKey="issue_date"
                                        sortable={true}
                                        sortDirection={sortConfig.key === 'issue_date' ? sortConfig.direction : null}
                                        onSort={(dir) => handleSort('issue_date', dir)}
                                        filterable={false}
                                    />
                                    <div className="h-2"></div>
                                    <TableColumnHeader
                                        title="Appearance"
                                        columnKey="appearance_date"
                                        sortable={true}
                                        sortDirection={sortConfig.key === 'appearance_date' ? sortConfig.direction : null}
                                        onSort={(dir) => handleSort('appearance_date', dir)}
                                        filterable={false}
                                    />
                                </th>
                                <th className="px-6 py-4">
                                    <TableColumnHeader
                                        title="Status"
                                        columnKey="status"
                                        sortable={true}
                                        sortDirection={sortConfig.key === 'status' ? sortConfig.direction : null}
                                        onSort={(dir) => handleSort('status', dir)}
                                        filterable={true}
                                        selectedFilters={filterConfig['status'] || []}
                                        onFilter={(vals) => handleFilter('status', vals)}
                                        options={filterOptions.status}
                                    />
                                </th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {paginatedData.map((s) => (
                                <tr key={s.id} className={getRowClass(s)}>
                                    <td className="px-6 py-4 relative group">
                                        {/* Inline Edit Trigger Wrapper */}
                                        <div className="flex flex-col gap-2">
                                            {/* Person Name Edit */}
                                            {editingRowId === s.id ? (
                                                <div className="flex flex-col gap-2">
                                                    <Input
                                                        value={editValues.person_name || ''}
                                                        onChange={(e) => handleEditChange('person_name', e.target.value)}
                                                        className="h-8 text-sm"
                                                        placeholder="Name"
                                                        aria-label="Person Name"
                                                    />
                                                    <Select
                                                        value={editValues.person_role || ''}
                                                        onChange={(e) => handleEditChange('person_role', e.target.value)}
                                                        className="h-8 text-xs w-full"
                                                    >
                                                        <option value="" disabled>Select Role</option>
                                                        {PERSON_ROLE_OPTIONS.map((role) => (
                                                            <option key={role} value={role}>
                                                                {role}
                                                            </option>
                                                        ))}
                                                    </Select>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex items-center gap-2">
                                                        <Link href={`/summons/${s.id}`} className="font-medium text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                                                            {s.person_name}
                                                        </Link>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground w-fit">
                                                        {s.person_role || "No Role"}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-muted-foreground">
                                        {/* Case ID - Editable? Let's make it input for now */}
                                        {editingRowId === s.id ? (
                                            <Input
                                                value={editValues.case_id || ''}
                                                onChange={(e) => handleEditChange('case_id', e.target.value)}
                                                className="h-8 text-sm"
                                                placeholder="Case ID"
                                            />
                                        ) : (
                                            s.case_id
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {editingRowId === s.id ? (
                                            <div className="flex flex-col gap-2">
                                                <Select
                                                    value={Array.isArray(editValues.purpose) && editValues.purpose.length > 0 ? editValues.purpose[0] : ''}
                                                    onChange={(e) => handleEditChange('purpose', [e.target.value])}
                                                    className="h-8 text-xs w-full"
                                                >
                                                    <option value="" disabled>Select Purpose</option>
                                                    {PURPOSE_OPTIONS.map((opt) => (
                                                        <option key={opt} value={opt}>
                                                            {opt}
                                                        </option>
                                                    ))}
                                                </Select>
                                                <div className="text-[10px] text-muted-foreground px-1">Or enter custom:</div>
                                                <Input
                                                    value={Array.isArray(editValues.purpose) ? editValues.purpose.join(', ') : ''}
                                                    onChange={(e) => handleEditChange('purpose', e.target.value.split(',').map(p => p.trim()).filter(Boolean))}
                                                    className="h-8 text-xs"
                                                    placeholder="Custom purpose..."
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex flex-wrap gap-1">
                                                {s.purpose?.map((p: string, i: number) => (
                                                    <span key={i} className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 border border-slate-200">{p}</span>
                                                ))}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-foreground">
                                        {editingRowId === s.id ? (
                                            <div className="flex flex-col gap-2">
                                                <div>
                                                    <label className="text-[10px] text-muted-foreground">Issue Date</label>
                                                    <Input
                                                        type="date"
                                                        value={editValues.issue_date || ''}
                                                        onChange={(e) => handleEditChange('issue_date', e.target.value)}
                                                        className="h-8 text-xs"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-muted-foreground">Appearance</label>
                                                    <Input
                                                        type="date"
                                                        value={editValues.appearance_date || ''}
                                                        onChange={(e) => handleEditChange('appearance_date', e.target.value)}
                                                        className="h-8 text-xs"
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-1">
                                                {s.issue_date && <span className="text-xs text-muted-foreground">Issued: {s.issue_date}</span>}
                                                {s.appearance_date && <span className="text-xs font-medium">Next: {s.appearance_date}</span>}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {editingRowId === s.id ? (
                                            <Select
                                                value={editValues.status || ''}
                                                onChange={(e) => handleEditChange('status', e.target.value)}
                                                className="h-8 text-xs w-full"
                                            >
                                                <option value="Draft">Draft</option>
                                                <option value="Issued">Issued</option>
                                                <option value="Served">Served</option>
                                                <option value="Rescheduled">Rescheduled</option>
                                                <option value="Completed">Completed</option>
                                            </Select>
                                        ) : (
                                            <>
                                                <Badge variant="outline" className="bg-white border-slate-200 text-slate-700">{s.status}</Badge>
                                                <div className="mt-1 flex gap-1">
                                                    {s.is_served && <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1 rounded">SERVED</span>}
                                                    {s.requests_reschedule && <span className="text-[10px] text-orange-600 font-bold bg-orange-50 px-1 rounded">RESCHEDULE</span>}
                                                </div>
                                            </>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {editingRowId === s.id ? (
                                            <div className="flex justify-end gap-2">
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:bg-green-50"
                                                    onClick={saveRowEdit} title="Save Changes" disabled={isSaving}>
                                                    <Check className="w-4 h-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:bg-red-50"
                                                    onClick={cancelRowEdit} title="Cancel" disabled={isSaving}>
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="flex justify-end gap-2">
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                                                    onClick={() => onView(s.id)} title="View Details">
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-amber-600 hover:bg-amber-50"
                                                    onClick={() => startRowEdit(s)} title="Edit Record">
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:bg-red-50"
                                                    onClick={() => onDelete(s.id)} title="Delete Record">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {paginatedData.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center gap-2">
                                            <Search className="w-8 h-8 text-muted-foreground/30" />
                                            <p>No records match your filters.</p>
                                            <Button variant="ghost" className="text-primary hover:underline h-auto p-0" onClick={() => {
                                                setFilterConfig({});
                                                setAdvancedFilters({
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
                                                onSearchChange('');
                                            }}>Clear all filters</Button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-slate-50/50">
                        <div className="text-sm text-muted-foreground">
                            Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to <span className="font-medium">{Math.min(currentPage * pageSize, filteredAndSortedSummons.length)}</span> of <span className="font-medium">{filteredAndSortedSummons.length}</span> results
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
