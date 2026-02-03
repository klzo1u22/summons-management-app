'use client';

import { useEffect, useState, useMemo } from 'react';
import { Header } from '@/components/layout';
import {
    Search,
    Plus,
    Edit2,
    Trash2,
    ChevronDown,
    ChevronUp,
    ChevronLeft,
    ChevronRight,
    Download,
    FileSpreadsheet,
    FileDown,
    XCircle,
    FolderOpen,
    Users,
    Calendar,
    CheckCircle2,
    AlertCircle,
} from 'lucide-react';
import { getCasesAction, deleteCaseAction, getSummonsAction, updateCaseAction, addCaseAction } from '@/app/actions';
import { Case, Summons, CASE_STATUS_OPTIONS, ACTIVITY_OPTIONS, ASSIGNED_OFFICER_OPTIONS } from '@/lib/types';
import { EditCaseModal } from '@/components/cases/EditCaseModal';
import Link from 'next/link';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type SortField = 'name' | 'created_at' | 'status' | 'date_of_ecir';
type SortDirection = 'asc' | 'desc';

export default function CasesPage() {
    const [cases, setCases] = useState<Case[]>([]);
    const [summons, setSummons] = useState<Summons[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [activeFilter, setActiveFilter] = useState<string>('all');
    const [officerFilter, setOfficerFilter] = useState<string>('all');

    // Sorting
    const [sortField, setSortField] = useState<SortField>('created_at');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(12);

    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingCase, setEditingCase] = useState<Case | null>(null);
    const [showExportMenu, setShowExportMenu] = useState(false);

    // Add form state
    const [newCase, setNewCase] = useState({
        name: '',
        ecir_no: '',
        status: 'To Do',
        date_of_ecir: '',
        assigned_officer: [] as string[],
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [casesData, summonsData] = await Promise.all([
                getCasesAction(),
                getSummonsAction(),
            ]);
            setCases(casesData);
            setSummons(summonsData);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Get summons count for case
    const getSummonsCount = (caseId: string) =>
        summons.filter((s: Summons) => s.case_id === caseId).length;

    // Filtering and sorting
    const filteredCases = useMemo(() => {
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const lastMonthStr = lastMonth.toISOString().split('T')[0];

        const activeCaseIds = new Set(
            summons
                .filter(s => s.issue_date && s.issue_date >= lastMonthStr)
                .map(s => s.case_id)
        );

        let result = cases.map(c => ({
            ...c,
            active: activeCaseIds.has(c.id)
        }));

        // Search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(c =>
                c.name.toLowerCase().includes(term) ||
                c.ecir_no?.toLowerCase().includes(term)
            );
        }

        // Status filter
        if (statusFilter !== 'all') {
            result = result.filter(c => c.status === statusFilter);
        }

        // Active filter
        if (activeFilter !== 'all') {
            result = result.filter(c =>
                activeFilter === 'active' ? c.active : !c.active
            );
        }

        // Officer filter
        if (officerFilter !== 'all') {
            result = result.filter(c =>
                c.assigned_officer?.includes(officerFilter)
            );
        }

        // Sorting
        result.sort((a, b) => {
            let aVal = (a as any)[sortField];
            let bVal = (b as any)[sortField];

            if (sortField === 'created_at' || sortField === 'date_of_ecir') {
                aVal = aVal ? new Date(aVal).getTime() : 0;
                bVal = bVal ? new Date(bVal).getTime() : 0;
            }

            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [cases, searchTerm, statusFilter, activeFilter, officerFilter, sortField, sortDirection]);

    // Pagination
    const totalPages = Math.ceil(filteredCases.length / pageSize);
    const paginatedCases = filteredCases.slice(
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
        const count = getSummonsCount(id);
        if (count > 0) {
            alert(`Cannot delete case with ${count} linked summons. Please delete summons first.`);
            return;
        }

        if (!confirm('Are you sure you want to delete this case?')) return;

        setCases(prev => prev.filter(c => c.id !== id));
        await deleteCaseAction(id);
    };

    const handleAddCase = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCase.name.trim()) {
            alert('Case name is required');
            return;
        }

        const caseData = {
            id: `case-${Date.now()}`,
            name: newCase.name,
            ecir_no: newCase.ecir_no,
            status: newCase.status,
            date_of_ecir: newCase.date_of_ecir,
            assigned_officer: newCase.assigned_officer,
            activity: [],
            created_at: new Date().toISOString(),
            last_edited: new Date().toISOString(),
            active: true,
            whether_pc_filed: false,
        };

        setCases(prev => [caseData as Case, ...prev]);
        setShowAddModal(false);
        setNewCase({ name: '', ecir_no: '', status: 'To Do', date_of_ecir: '', assigned_officer: [] });

        await addCaseAction(caseData);
        loadData();
    };

    const handleExportCSV = () => {
        const csv = Papa.unparse(filteredCases.map(c => ({
            'Case Name': c.name,
            'ECIR Number': c.ecir_no || '-',
            'Status': c.status,
            'Date of ECIR': c.date_of_ecir,
            'Active': c.active ? 'Yes' : 'No',
            'Assigned Officers': c.assigned_officer?.join(', ') || '-',
            'Summons Count': getSummonsCount(c.id),
        })));

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `cases_export_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        setShowExportMenu(false);
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text('Cases Report', 14, 22);
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);

        autoTable(doc, {
            head: [['Case Name', 'ECIR', 'Status', 'Date', 'Active', 'Summons']],
            body: filteredCases.map(c => [
                c.name,
                c.ecir_no || '-',
                c.status || '-',
                c.date_of_ecir || '-',
                c.active ? 'Yes' : 'No',
                getSummonsCount(c.id).toString(),
            ]),
            startY: 35,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [99, 102, 241] },
        });

        doc.save(`cases_report_${new Date().toISOString().split('T')[0]}.pdf`);
        setShowExportMenu(false);
    };

    const getStatusBadge = (status?: string) => {
        if (!status) return null;

        const colors: Record<string, string> = {
            'To Do': 'badge-neutral',
            'Doing': 'badge-info',
            'Done': 'badge-success',
            'On Hold': 'badge-warning',
        };

        return <span className={`badge ${colors[status] || 'badge-neutral'}`}>{status}</span>;
    };

    if (isLoading) {
        return (
            <>
                <Header title="Cases" subtitle="Loading..." />
                <main className="main-content">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
                        Loading cases data...
                    </div>
                </main>
            </>
        );
    }

    return (
        <>
            <Header
                title="Cases"
                subtitle={`${filteredCases.length} of ${cases.length} cases`}
                onAddClick={() => setShowAddModal(true)}
                addLabel="New Case"
            />

            <main className="main-content">
                <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

                    {/* Filter Bar */}
                    <div className="card" style={{ padding: 'var(--space-4)' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-4)',
                            flexWrap: 'wrap',
                        }}>
                            {/* Search */}
                            <div className="search-container" style={{ flex: 1, minWidth: 200, maxWidth: 300 }}>
                                <Search className="search-icon" />
                                <input
                                    type="text"
                                    className="input search-input"
                                    placeholder="Search by name, ECIR..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            {/* Status Filter */}
                            <select
                                className="input"
                                style={{ width: 'auto', minWidth: 140 }}
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="all">All Status</option>
                                {CASE_STATUS_OPTIONS.map((s: string) => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>

                            {/* Active Filter */}
                            <select
                                className="input"
                                style={{ width: 'auto', minWidth: 120 }}
                                value={activeFilter}
                                onChange={(e) => setActiveFilter(e.target.value)}
                            >
                                <option value="all">All Activity</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>

                            {/* Officer Filter */}
                            <select
                                className="input"
                                style={{ width: 'auto', minWidth: 150 }}
                                value={officerFilter}
                                onChange={(e) => setOfficerFilter(e.target.value)}
                            >
                                <option value="all">All Officers</option>
                                {ASSIGNED_OFFICER_OPTIONS.map((o: string) => (
                                    <option key={o} value={o}>{o}</option>
                                ))}
                            </select>

                            {/* Export */}
                            <div style={{ position: 'relative' }}>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setShowExportMenu(!showExportMenu)}
                                >
                                    <Download size={16} />
                                    Export
                                    <ChevronDown size={14} />
                                </button>

                                {showExportMenu && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '100%',
                                        right: 0,
                                        marginTop: 'var(--space-2)',
                                        background: 'var(--surface)',
                                        border: '1px solid var(--border)',
                                        borderRadius: 'var(--radius-md)',
                                        padding: 'var(--space-2)',
                                        minWidth: 150,
                                        zIndex: 50,
                                    }}>
                                        <button
                                            className="btn btn-ghost"
                                            style={{ width: '100%', justifyContent: 'flex-start' }}
                                            onClick={handleExportCSV}
                                        >
                                            <FileSpreadsheet size={16} />
                                            Export CSV
                                        </button>
                                        <button
                                            className="btn btn-ghost"
                                            style={{ width: '100%', justifyContent: 'flex-start' }}
                                            onClick={handleExportPDF}
                                        >
                                            <FileDown size={16} />
                                            Export PDF
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Cases Grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                        gap: 'var(--space-4)',
                    }}>
                        {paginatedCases.length === 0 ? (
                            <div className="card" style={{
                                gridColumn: '1 / -1',
                                textAlign: 'center',
                                padding: 'var(--space-8)',
                                color: 'var(--text-muted)',
                            }}>
                                No cases found matching your filters
                            </div>
                        ) : (
                            paginatedCases.map((caseItem) => (
                                <div key={caseItem.id} className="card" style={{ padding: 'var(--space-4)' }}>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start',
                                        marginBottom: 'var(--space-3)',
                                    }}>
                                        <div style={{ flex: 1 }}>
                                            <Link
                                                href={`/cases/${caseItem.id}`}
                                                style={{
                                                    fontWeight: 600,
                                                    fontSize: '1rem',
                                                    color: 'var(--text-primary)',
                                                    display: 'block',
                                                    marginBottom: 'var(--space-1)',
                                                }}
                                            >
                                                {caseItem.name}
                                            </Link>
                                            {caseItem.ecir_no && (
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    ECIR: {caseItem.ecir_no}
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                                            <button
                                                className="btn btn-ghost btn-icon btn-sm"
                                                onClick={() => setEditingCase(caseItem)}
                                                title="Edit"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                className="btn btn-ghost btn-icon btn-sm"
                                                onClick={() => handleDelete(caseItem.id)}
                                                title="Delete"
                                                style={{ color: 'var(--error)' }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    <div style={{
                                        display: 'flex',
                                        gap: 'var(--space-2)',
                                        marginBottom: 'var(--space-3)',
                                        flexWrap: 'wrap',
                                    }}>
                                        {getStatusBadge(caseItem.status)}
                                        {caseItem.active ? (
                                            <span className="badge badge-success"><CheckCircle2 size={12} /> Active</span>
                                        ) : (
                                            <span className="badge badge-neutral"><AlertCircle size={12} /> Inactive</span>
                                        )}
                                    </div>

                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(2, 1fr)',
                                        gap: 'var(--space-2)',
                                        fontSize: '0.8125rem',
                                        color: 'var(--text-secondary)',
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                                            <Calendar size={14} style={{ opacity: 0.6 }} />
                                            {caseItem.date_of_ecir
                                                ? new Date(caseItem.date_of_ecir).toLocaleDateString('en-IN', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric',
                                                })
                                                : 'No date'
                                            }
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                                            <Users size={14} style={{ opacity: 0.6 }} />
                                            {getSummonsCount(caseItem.id)} summons
                                        </div>

                                        {caseItem.assigned_officer && caseItem.assigned_officer.length > 0 && (
                                            <div style={{
                                                gridColumn: '1 / -1',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 'var(--space-1)',
                                            }}>
                                                <FolderOpen size={14} style={{ opacity: 0.6 }} />
                                                {caseItem.assigned_officer.slice(0, 2).join(', ')}
                                                {caseItem.assigned_officer.length > 2 && (
                                                    <span style={{ opacity: 0.6 }}>+{caseItem.assigned_officer.length - 2}</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Pagination */}
                    {filteredCases.length > pageSize && (
                        <div className="card" style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: 'var(--space-4)',
                        }}>
                            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredCases.length)} of {filteredCases.length}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft size={16} />
                                    Previous
                                </button>

                                <span style={{ padding: '0 var(--space-3)', fontSize: '0.875rem' }}>
                                    Page {currentPage} of {totalPages}
                                </span>

                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    Next
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Add Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Create New Case</h3>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowAddModal(false)}>
                                <XCircle size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleAddCase}>
                            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                                <div className="form-group">
                                    <label className="form-label">Case Name *</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={newCase.name}
                                        onChange={(e) => setNewCase(prev => ({ ...prev, name: e.target.value }))}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">ECIR Number</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={newCase.ecir_no}
                                        onChange={(e) => setNewCase(prev => ({ ...prev, ecir_no: e.target.value }))}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Status</label>
                                    <select
                                        className="input"
                                        value={newCase.status}
                                        onChange={(e) => setNewCase(prev => ({ ...prev, status: e.target.value }))}
                                    >
                                        {CASE_STATUS_OPTIONS.map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Date of ECIR</label>
                                    <input
                                        type="date"
                                        className="input"
                                        value={newCase.date_of_ecir}
                                        onChange={(e) => setNewCase(prev => ({ ...prev, date_of_ecir: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Create Case
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editingCase && (
                <EditCaseModal
                    isOpen={!!editingCase}
                    onClose={() => setEditingCase(null)}
                    caseData={editingCase}
                    onSuccess={() => {
                        setEditingCase(null);
                        loadData();
                    }}
                />
            )}
        </>
    );
}
