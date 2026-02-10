
"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Case } from "@/lib/types";
import { Edit2, Eye, FileText, Search, Trash2, ChevronLeft, ChevronRight, X, Filter } from "lucide-react";
import { useState, useMemo } from "react";
import { Select } from "@/components/ui/Select";
import { TableColumnHeader } from "../dashboard/TableColumnHeader";

interface CasesTableProps {
    cases: Case[];
    onView: (id: string) => void;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
}

export function CasesTable({
    cases,
    onView,
    onEdit,
    onDelete,
}: CasesTableProps) {
    // State
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [officerFilter, setOfficerFilter] = useState("All");
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' | null }>({
        key: '',
        direction: null
    });

    const pageSize = 10;

    // Derived Data (Filtering)
    const filteredCases = useMemo(() => {
        let result = cases.filter(c => {
            const matchesSearch =
                c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.ecir_no?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus = statusFilter === "All" || c.status === statusFilter;

            const matchesOfficer = officerFilter === "All" ||
                (c.assigned_officer && c.assigned_officer.includes(officerFilter));

            return matchesSearch && matchesStatus && matchesOfficer;
        });

        // Apply Sort
        if (sortConfig.key && sortConfig.direction) {
            result.sort((a, b) => {
                const aVal = a[sortConfig.key as keyof Case];
                const bVal = b[sortConfig.key as keyof Case];

                if (aVal === bVal) return 0;
                if (aVal === null || aVal === undefined) return 1;
                if (bVal === null || bVal === undefined) return -1;

                if (typeof aVal === 'string' && typeof bVal === 'string') {
                    return sortConfig.direction === 'asc'
                        ? aVal.localeCompare(bVal)
                        : bVal.localeCompare(aVal);
                }

                // Handle arrays (first element) or other types as strings
                const strA = String(aVal);
                const strB = String(bVal);
                return sortConfig.direction === 'asc'
                    ? strA.localeCompare(strB)
                    : strB.localeCompare(strA);
            });
        }

        return result;
    }, [cases, searchTerm, statusFilter, officerFilter, sortConfig]);

    // Derived Data (Pagination)
    const totalPages = Math.ceil(filteredCases.length / pageSize);
    const paginatedData = filteredCases.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    // Unique values for filters
    const allStatuses = Array.from(new Set(cases.map(c => c.status).filter(Boolean)));
    const allOfficers = Array.from(new Set(cases.flatMap(c => c.assigned_officer || []).filter(Boolean)));

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    const handleSort = (key: string, direction: 'asc' | 'desc' | null) => {
        setSortConfig({ key, direction });
    };

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Filters */}
            <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center bg-white p-4 rounded-xl border border-border shadow-sm">
                <div className="flex flex-col md:flex-row gap-3 w-full lg:w-auto">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search Name or ECIR..."
                            className="pl-9 bg-white"
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        />
                    </div>

                    <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                        <select
                            className="h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                        >
                            <option value="All">All Statuses</option>
                            {allStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>

                        <select
                            className="h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                            value={officerFilter}
                            onChange={(e) => { setOfficerFilter(e.target.value); setCurrentPage(1); }}
                        >
                            <option value="All">All Officers</option>
                            {allOfficers.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>

                        {(statusFilter !== "All" || officerFilter !== "All" || searchTerm) && (
                            <Button variant="ghost" size="icon" onClick={() => {
                                setSearchTerm("");
                                setStatusFilter("All");
                                setOfficerFilter("All");
                            }} title="Clear Filters">
                                <X className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                </div>

                <div className="text-sm text-muted-foreground whitespace-nowrap">
                    <strong>{filteredCases.length}</strong> cases found
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-secondary/50 text-muted-foreground font-medium text-xs uppercase border-b border-border/50">
                            <tr>
                                <th className="px-6 py-4 font-semibold tracking-wider">
                                    <TableColumnHeader
                                        title="Case Details"
                                        columnKey="name"
                                        sortable={true}
                                        sortDirection={sortConfig.key === 'name' ? sortConfig.direction : null}
                                        onSort={(dir) => handleSort('name', dir)}
                                    />
                                </th>
                                <th className="px-6 py-4 font-semibold tracking-wider">
                                    <TableColumnHeader
                                        title="Status"
                                        columnKey="status"
                                        sortable={true}
                                        sortDirection={sortConfig.key === 'status' ? sortConfig.direction : null}
                                        onSort={(dir) => handleSort('status', dir)}
                                    />
                                </th>
                                <th className="px-6 py-4 font-semibold tracking-wider">Key Stats</th>
                                <th className="px-6 py-4 font-semibold tracking-wider">Assigned</th>
                                <th className="px-6 py-4 font-semibold tracking-wider text-right">
                                    <div className="flex justify-end">
                                        <TableColumnHeader
                                            title="Last Update"
                                            columnKey="last_edited"
                                            sortable={true}
                                            sortDirection={sortConfig.key === 'last_edited' ? sortConfig.direction : null}
                                            onSort={(dir) => handleSort('last_edited', dir)}
                                        />
                                    </div>
                                </th>
                                <th className="px-6 py-4 font-semibold tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {paginatedData.map((c) => (
                                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-foreground text-base mb-0.5">{c.name}</div>
                                        {c.ecir_no && (
                                            <div className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                                                <FileText className="w-3 h-3" /> {c.ecir_no}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge variant="outline" className={`
                                            ${c.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ''}
                                            ${c.status === 'Closed' ? 'bg-slate-50 text-slate-600 border-slate-200' : ''}
                                            ${c.status === 'Trial' ? 'bg-purple-50 text-purple-700 border-purple-200' : ''}
                                        `}>
                                            {c.status}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex flex-col">
                                                <span className="text-xs text-muted-foreground uppercase tracking-wider">Summons</span>
                                                <span className="font-semibold">{c.total_summons || 0}</span>
                                            </div>
                                            <div className="w-px h-8 bg-border"></div>
                                            <div className="flex flex-col">
                                                <span className="text-xs text-muted-foreground uppercase tracking-wider">Active</span>
                                                <span className={`font-semibold ${c.active_summons ? 'text-orange-600' : ''}`}>
                                                    {c.active_summons || 0}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                                            {c.assigned_officer?.map((officer, i) => (
                                                <span key={i} className="text-[10px] px-1.5 py-0.5 bg-secondary text-secondary-foreground rounded border border-border">
                                                    {officer}
                                                </span>
                                            ))}
                                            {!c.assigned_officer?.length && <span className="text-muted-foreground text-xs italic">Unassigned</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="text-xs text-muted-foreground">
                                            {new Date(c.last_edited).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                                onClick={() => onView(c.id)} title="View Case">
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-amber-600 hover:bg-amber-50"
                                                onClick={() => onEdit(c.id)} title="Edit Case">
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                                                onClick={() => onDelete(c.id)} title="Delete Case">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {paginatedData.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center gap-2">
                                            <Search className="w-8 h-8 text-slate-300" />
                                            <p>No cases found matching your filters.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-slate-50/50">
                        <div className="text-sm text-muted-foreground">
                            Page {currentPage} of {totalPages}
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
