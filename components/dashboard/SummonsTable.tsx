"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Summons } from "@/lib/types";
import { Download, Edit2, Eye, FileText, Search, Trash2, ChevronLeft, ChevronRight, Check, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

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
    onInlineUpdate?: (id: string, field: string, value: any) => Promise<void>;
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

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;
    const totalPages = Math.ceil(summons.length / pageSize);

    // Inline Editing State
    const [editingCell, setEditingCell] = useState<{ id: string, field: string } | null>(null);
    const [tempValue, setTempValue] = useState<string>("");
    const [isSaving, setIsSaving] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus input when editing starts
    useEffect(() => {
        if (editingCell && inputRef.current) {
            inputRef.current.focus();
        }
    }, [editingCell]);

    // Slice data for current page
    const paginatedData = summons.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
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

    // Inline Editing Handlers
    const startEditing = (id: string, field: string, currentValue: any) => {
        if (!onInlineUpdate) return;
        setEditingCell({ id, field });
        setTempValue(currentValue || "");
    };

    const cancelEditing = () => {
        setEditingCell(null);
        setTempValue("");
        setIsSaving(false);
    };

    const saveEditing = async () => {
        if (!editingCell || !onInlineUpdate) return;

        // Basic validation or optimization: don't save if no change?
        try {
            setIsSaving(true);
            await onInlineUpdate(editingCell.id, editingCell.field, tempValue);
            setEditingCell(null);
            setTempValue("");
        } catch (error) {
            console.error("Failed to update", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            saveEditing();
        } else if (e.key === 'Escape') {
            cancelEditing();
        }
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
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-lg shadow-sm border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left" role="grid" aria-label="Summons List">
                        <thead className="bg-secondary text-muted-foreground font-medium uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4">Name / Role</th>
                                <th className="px-6 py-4">Case</th>
                                <th className="px-6 py-4">Purpose</th>
                                <th className="px-6 py-4">Dates</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {paginatedData.map((s) => (
                                <tr key={s.id} className={getRowClass(s)}>
                                    <td className="px-6 py-4 relative group">
                                        {/* Inline Edit Trigger Wrapper */}
                                        <div className="flex flex-col gap-1">
                                            {/* Person Name Edit */}
                                            {editingCell?.id === s.id && editingCell?.field === 'person_name' ? (
                                                <div className="flex items-center gap-1">
                                                    <Input
                                                        ref={inputRef}
                                                        value={tempValue}
                                                        onChange={(e) => setTempValue(e.target.value)}
                                                        onKeyDown={handleKeyDown}
                                                        disabled={isSaving}
                                                        className="h-7 text-sm py-1 px-2"
                                                        onBlur={saveEditing}
                                                    />
                                                </div>
                                            ) : (
                                                <div
                                                    className={cn("flex items-center gap-2", onInlineUpdate && "cursor-pointer rounded -ml-1 pl-1 hover:bg-slate-100/80")}
                                                    onClick={() => startEditing(s.id, 'person_name', s.person_name)}
                                                >
                                                    <Link href={`/summons/${s.id}`} target="_blank" className="font-medium text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                                                        {s.person_name}
                                                    </Link>
                                                    {onInlineUpdate && <Edit2 className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-50" />}
                                                </div>
                                            )}

                                            {/* Role Edit */}
                                            {editingCell?.id === s.id && editingCell?.field === 'person_role' ? (
                                                <Input
                                                    ref={inputRef}
                                                    value={tempValue}
                                                    onChange={(e) => setTempValue(e.target.value)}
                                                    onKeyDown={handleKeyDown}
                                                    disabled={isSaving}
                                                    className="h-6 text-xs w-full mt-1"
                                                    onBlur={saveEditing}
                                                />
                                            ) : (
                                                <div
                                                    className={cn("text-xs text-muted-foreground w-fit", onInlineUpdate && "cursor-pointer hover:text-foreground")}
                                                    onClick={() => startEditing(s.id, 'person_role', s.person_role)}
                                                >
                                                    {s.person_role || "No Role"}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-muted-foreground">
                                        {s.case_id}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {s.purpose?.map((p: string, i: number) => (
                                                <span key={i} className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{p}</span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-foreground">
                                        <div className="flex flex-col gap-1">
                                            {s.issue_date && <span className="text-xs text-muted-foreground">Issued: {s.issue_date}</span>}
                                            {s.appearance_date && <span className="text-xs font-medium">Next: {s.appearance_date}</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge variant="outline" className="bg-white border-slate-200 text-slate-700">{s.status}</Badge>
                                        <div className="mt-1 flex gap-1">
                                            {s.is_served && <span className="text-[10px] text-emerald-600 font-bold">SERVED</span>}
                                            {s.requests_reschedule && <span className="text-[10px] text-orange-600 font-bold">RESCHEDULE</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                                                onClick={() => onView(s.id)} title="View Details">
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-amber-600 hover:bg-amber-50"
                                                onClick={() => onEdit(s.id)} title="Edit Record">
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:bg-red-50"
                                                onClick={() => onDelete(s.id)} title="Delete Record">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {paginatedData.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                                        No records found.
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
                            Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to <span className="font-medium">{Math.min(currentPage * pageSize, summons.length)}</span> of <span className="font-medium">{summons.length}</span> results
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
