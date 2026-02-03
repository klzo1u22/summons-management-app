'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { Header } from '@/components/layout';
import {
    Download,
    FileText,
    FileSpreadsheet,
    BarChart3,
    PieChart,
    TrendingUp,
    Calendar,
    Users,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Filter,
    ArrowLeft,
    TrendingDown,
    Zap,
    Scale,
    Gavel,
    History,
    ChevronDown,
    LayoutGrid,
    Check,
} from 'lucide-react';
import { getSummonsAction, getCasesAction } from '@/app/actions';
import { Summons, Case } from '@/lib/types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';
import { cn } from '@/lib/utils';

type ReportType = 'summon_generated' | 'statement_recorded';

export default function ReportsPage() {
    const [summons, setSummons] = useState<Summons[]>([]);
    const [cases, setCases] = useState<Case[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filters State
    const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);
    const [dateRange, setDateRange] = useState({ from: '', to: '' });
    const [reportType, setReportType] = useState<ReportType>('summon_generated');
    const [visibleColumns, setVisibleColumns] = useState<string[]>(['name', 'case', 'status', 'date']);

    // UI State
    const [showCasePicker, setShowCasePicker] = useState(false);
    const [showColumnPicker, setShowColumnPicker] = useState(false);
    const casePickerRef = useRef<HTMLDivElement>(null);
    const columnPickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadData();

        // Default to current Financial Year
        const now = new Date();
        const year = now.getFullYear();
        const fyStart = now.getMonth() < 3 ? year - 1 : year;
        setDateRange({
            from: `${fyStart}-04-01`,
            to: now.toISOString().split('T')[0]
        });

        // Click outside
        const handleClickOutside = (e: MouseEvent) => {
            if (casePickerRef.current && !casePickerRef.current.contains(e.target as Node)) setShowCasePicker(false);
            if (columnPickerRef.current && !columnPickerRef.current.contains(e.target as Node)) setShowColumnPicker(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
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

    // Financial Year Logic
    const setFYReport = () => {
        const now = new Date();
        const year = now.getFullYear();
        const fyStart = now.getMonth() < 3 ? year - 1 : year;
        setDateRange({ from: `${fyStart}-04-01`, to: `${fyStart + 1}-03-31` });
    };

    const setQuarterlyReport = (q: 1 | 2 | 3 | 4) => {
        const now = new Date();
        const year = now.getFullYear();
        const fyStart = now.getMonth() < 3 ? year - 1 : year;
        const qMap = {
            1: { from: `${fyStart}-04-01`, to: `${fyStart}-06-30` },
            2: { from: `${fyStart}-07-01`, to: `${fyStart}-09-30` },
            3: { from: `${fyStart}-10-01`, to: `${fyStart}-12-31` },
            4: { from: `${fyStart + 1}-01-01`, to: `${fyStart + 1}-03-31` },
        };
        setDateRange(qMap[q]);
    };

    const setMonthlyReport = () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        setDateRange({ from: start.toISOString().split('T')[0], to: end.toISOString().split('T')[0] });
    };

    const setCalendarYearReport = () => {
        const year = new Date().getFullYear();
        setDateRange({ from: `${year}-01-01`, to: `${year}-12-31` });
    };

    // Analytics Logic
    const analytics = useMemo(() => {
        let filtered = summons.filter(s => {
            const date = reportType === 'summon_generated' ? (s.issue_date || s.created_at) : s.served_date;
            if (!date) return false;

            const matchesDate = (!dateRange.from || date >= dateRange.from) && (!dateRange.to || date <= dateRange.to);
            const matchesCase = selectedCaseIds.length === 0 || selectedCaseIds.includes(s.case_id);
            const matchesType = reportType === 'statement_recorded' ? s.statement_recorded : true;

            return matchesDate && matchesCase && matchesType;
        });

        const total = filtered.length;
        const served = filtered.filter(s => s.is_served).length;
        const pending = filtered.filter(s => !s.is_served).length;
        const efficiency = total ? (served / total) * 100 : 0;

        // Modes of Service
        const modes: Record<string, number> = {};
        filtered.forEach(s => {
            const m = s.mode_of_service && s.mode_of_service.length ? s.mode_of_service[0] : 'Unknown';
            modes[m] = (modes[m] || 0) + 1;
        });

        // Trends (Last 6 Months)
        const months: Record<string, { issued: number; served: number; statements: number }> = {};
        filtered.forEach(s => {
            const date = s.issue_date || s.created_at;
            if (!date) return;
            const m = date.substring(0, 7);
            if (!months[m]) months[m] = { issued: 0, served: 0, statements: 0 };
            months[m].issued++;
            if (s.is_served) months[m].served++;
            if (s.statement_recorded) months[m].statements++;
        });

        const trendData = Object.entries(months)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .slice(-6);

        return {
            total,
            served,
            pending,
            efficiency,
            modes,
            trendData,
            filteredData: filtered
        };
    }, [summons, dateRange, selectedCaseIds, reportType]);

    // Exports
    const exportCSV = () => {
        const data = analytics.filteredData.map(s => ({
            'Name': s.person_name,
            'Case': cases.find(c => c.id === s.case_id)?.name || s.case_id,
            'Status': s.status,
            'Date': s.issue_date || s.created_at,
            'Served': s.is_served ? 'Yes' : 'No',
            'Statement Recorded': s.statement_recorded ? 'Yes' : 'No',
            'Role': s.person_role,
        }));
        const csv = Papa.unparse(data);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Report_${reportType}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    const exportPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(22);
        doc.text('Summons Intelligence Report', 14, 20);
        doc.setFontSize(10);
        doc.text(`Type: ${reportType.replace('_', ' ').toUpperCase()}`, 14, 28);
        doc.text(`Period: ${dateRange.from || 'All'} to ${dateRange.to || 'Today'}`, 14, 34);

        autoTable(doc, {
            startY: 45,
            head: [['Name', 'Case', 'Status', 'Date', 'Served']],
            body: analytics.filteredData.map(s => [
                s.person_name,
                cases.find(c => c.id === s.case_id)?.name || 'Unknown',
                s.status,
                s.issue_date || s.created_at?.split('T')[0],
                s.is_served ? 'YES' : 'NO'
            ]),
            theme: 'grid',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [79, 70, 229] }
        });

        doc.save(`Intelligence_Report_${new Date().getTime()}.pdf`);
    };

    if (isLoading) return <div className="loading-container">Generating Intelligence...</div>;

    return (
        <div className="reports-page">
            <Header
                title="Intelligence Center"
                subtitle="Advanced reporting and operational performance analytics"
                showSearch={false}
                actions={
                    <div className="header-actions">
                        <button className="btn btn-secondary" onClick={() => window.location.href = '/'}>
                            <ArrowLeft size={16} /> Dashboard
                        </button>
                        <div className="divider-v" />
                        <button className="btn btn-secondary" onClick={exportCSV}>
                            <FileSpreadsheet size={16} /> CSV
                        </button>
                        <button className="btn btn-primary" onClick={exportPDF}>
                            <FileText size={16} /> PDF Report
                        </button>
                    </div>
                }
            />

            <main className="main-content">
                <div className="intelligence-grid">

                    {/* Control Bar */}
                    <div className="card control-card">
                        <div className="control-section">
                            <div className="control-group">
                                <label className="control-label"><Gavel size={14} /> Case Context</label>
                                <div className="custom-picker" ref={casePickerRef}>
                                    <button className="picker-trigger" onClick={() => setShowCasePicker(!showCasePicker)}>
                                        {selectedCaseIds.length === 0 ? 'All Cases' : `${selectedCaseIds.length} Cases Selected`}
                                        <ChevronDown size={14} />
                                    </button>
                                    {showCasePicker && (
                                        <div className="picker-dropdown">
                                            <div className="picker-item" onClick={() => setSelectedCaseIds([])}>
                                                <div className={cn("checkbox-s", selectedCaseIds.length === 0 && "active")}>
                                                    {selectedCaseIds.length === 0 && <Check size={12} />}
                                                </div>
                                                All Active Cases
                                            </div>
                                            {cases.map(c => (
                                                <div key={c.id} className="picker-item" onClick={() => {
                                                    setSelectedCaseIds(prev => prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id]);
                                                }}>
                                                    <div className={cn("checkbox-s", selectedCaseIds.includes(c.id) && "active")}>
                                                        {selectedCaseIds.includes(c.id) && <Check size={12} />}
                                                    </div>
                                                    {c.name}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="control-group">
                                <label className="control-label"><Calendar size={14} /> Date Range</label>
                                <div className="date-inputs">
                                    <input type="date" className="date-field" value={dateRange.from} onChange={e => setDateRange(p => ({ ...p, from: e.target.value }))} />
                                    <span>to</span>
                                    <input type="date" className="date-field" value={dateRange.to} onChange={e => setDateRange(p => ({ ...p, to: e.target.value }))} />
                                </div>
                            </div>

                            <div className="control-group">
                                <label className="control-label"><LayoutGrid size={14} /> View mode</label>
                                <div className="radio-group">
                                    <button
                                        className={cn("radio-btn", reportType === 'summon_generated' && "active")}
                                        onClick={() => setReportType('summon_generated')}
                                    >
                                        Summon Generated
                                    </button>
                                    <button
                                        className={cn("radio-btn", reportType === 'statement_recorded' && "active")}
                                        onClick={() => setReportType('statement_recorded')}
                                    >
                                        Statement Recorded
                                    </button>
                                </div>
                            </div>

                            <div className="control-group">
                                <label className="control-label"><Filter size={14} /> Properties</label>
                                <div className="custom-picker" ref={columnPickerRef}>
                                    <button className="picker-trigger" onClick={() => setShowColumnPicker(!showColumnPicker)}>
                                        Display {visibleColumns.length}
                                        <ChevronDown size={14} />
                                    </button>
                                    {showColumnPicker && (
                                        <div className="picker-dropdown">
                                            {['name', 'case', 'status', 'date', 'role', 'mode'].map(col => (
                                                <div key={col} className="picker-item" onClick={() => {
                                                    setVisibleColumns(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);
                                                }}>
                                                    <div className={cn("checkbox-s", visibleColumns.includes(col) && "active")}>
                                                        {visibleColumns.includes(col) && <Check size={12} />}
                                                    </div>
                                                    {col.charAt(0).toUpperCase() + col.slice(1)}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="preset-strip">
                            <span className="preset-label">Financial & Pre-built:</span>
                            <button className="chip" onClick={setFYReport}>Full FY</button>
                            <button className="chip" onClick={() => setQuarterlyReport(1)}>Q1 (AMJ)</button>
                            <button className="chip" onClick={() => setQuarterlyReport(2)}>Q2 (JAS)</button>
                            <button className="chip" onClick={() => setQuarterlyReport(3)}>Q3 (OND)</button>
                            <button className="chip" onClick={() => setQuarterlyReport(4)}>Q4 (JFM)</button>
                            <button className="chip" onClick={setMonthlyReport}>This Month</button>
                            <button className="chip" onClick={setCalendarYearReport}>Cal. Year</button>
                        </div>
                    </div>

                    {/* KPI Cards */}
                    <div className="kpi-row">
                        <div className="card kpi-glass">
                            <div className="kpi-icon-w"><Zap size={20} /></div>
                            <div className="kpi-info">
                                <h3>{analytics.total}</h3>
                                <p>{reportType === 'summon_generated' ? 'Summons Issued' : 'Statements Recorded'}</p>
                            </div>
                        </div>
                        <div className="card kpi-glass success">
                            <div className="kpi-icon-w"><CheckCircle2 size={20} /></div>
                            <div className="kpi-info">
                                <h3>{analytics.served}</h3>
                                <p>Successfully Served</p>
                            </div>
                        </div>
                        <div className="card kpi-glass warning">
                            <div className="kpi-icon-w"><History size={20} /></div>
                            <div className="kpi-info">
                                <h3>{analytics.pending}</h3>
                                <p>Remaining Action</p>
                            </div>
                        </div>
                        <div className="card kpi-glass primary">
                            <div className="kpi-icon-w"><TrendingUp size={20} /></div>
                            <div className="kpi-info">
                                <h3>{analytics.efficiency.toFixed(1)}%</h3>
                                <p>Success Rate</p>
                            </div>
                        </div>
                    </div>

                    {/* Charts Grid */}
                    <div className="charts-container">
                        <div className="card chart-item">
                            <div className="chart-header">
                                <h4><BarChart3 size={16} /> Issued vs Served</h4>
                                <span>Recent delivery performance</span>
                            </div>
                            <div className="horizontal-bars">
                                {Object.entries(analytics.modes).map(([mode, count]) => {
                                    const percent = (count / analytics.total) * 100;
                                    return (
                                        <div key={mode} className="bar-row">
                                            <div className="bar-meta"><span>{mode}</span><span>{count}</span></div>
                                            <div className="bar-bg"><div className="bar-fill" style={{ width: `${percent}%` }} /></div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="card chart-item">
                            <div className="chart-header">
                                <h4><TrendingUp size={16} /> Statement Trends</h4>
                                <span>Recording volume over time</span>
                            </div>
                            <div className="line-chart-v">
                                {analytics.trendData.map(([month, data]) => {
                                    const h = (data.statements / (analytics.total || 1)) * 100;
                                    return (
                                        <div key={month} className="trend-bar">
                                            <div className="bar-core" style={{ height: `${Math.max(10, h)}%` }}>
                                                <span className="val">{data.statements}</span>
                                            </div>
                                            <span className="month">{month.split('-')[1]}/{month.split('-')[0].slice(2)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Custom Report Table Preview */}
                    <div className="card preview-card">
                        <div className="preview-header">
                            <h4>Custom Report Generator Preview</h4>
                            <p>Showing {analytics.filteredData.length} records matching current criteria</p>
                        </div>
                        <div className="table-wrapper">
                            <table className="report-table">
                                <thead>
                                    <tr>
                                        {visibleColumns.includes('name') && <th>Name</th>}
                                        {visibleColumns.includes('case') && <th>Case</th>}
                                        {visibleColumns.includes('status') && <th>Status</th>}
                                        {visibleColumns.includes('date') && <th>Date</th>}
                                        {visibleColumns.includes('role') && <th>Role</th>}
                                        {visibleColumns.includes('mode') && <th>Service Mode</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {analytics.filteredData.slice(0, 10).map(s => (
                                        <tr key={s.id}>
                                            {visibleColumns.includes('name') && <td>{s.person_name}</td>}
                                            {visibleColumns.includes('case') && <td className="font-mono text-muted">{cases.find(c => c.id === s.case_id)?.name || s.case_id}</td>}
                                            {visibleColumns.includes('status') && <td><span className={cn("status-badge", s.status === 'Served' && "success")}>{s.status}</span></td>}
                                            {visibleColumns.includes('date') && <td>{s.issue_date || s.created_at?.split('T')[0]}</td>}
                                            {visibleColumns.includes('role') && <td>{s.person_role}</td>}
                                            {visibleColumns.includes('mode') && <td>{s.mode_of_service?.[0] || '-'}</td>}
                                        </tr>
                                    ))}
                                    {analytics.filteredData.length > 10 && (
                                        <tr>
                                            <td colSpan={visibleColumns.length} style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--text-muted)' }}>
                                                + {analytics.filteredData.length - 10} more records in full export
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>

            <style jsx>{`
                .reports-page { min-height: 100vh; background: var(--background); }
                .header-actions { display: flex; gap: var(--space-2); align-items: center; }
                .divider-v { width: 1px; height: 24px; background: var(--border); margin: 0 4px; }
                .intelligence-grid { display: flex; flex-direction: column; gap: var(--space-4); max-width: 1400px; margin: 0 auto; width: 100%; }
                
                .control-card { padding: var(--space-5); border-top: 4px solid var(--primary); }
                .control-section { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-6); margin-bottom: var(--space-5); }
                .control-group { display: flex; flex-direction: column; gap: var(--space-3); }
                .control-label { font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 8px; }
                
                .custom-picker { position: relative; }
                .picker-trigger { width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--surface-dim); border: 1px solid var(--border); border-radius: var(--radius-md); font-size: 0.875rem; cursor: pointer; }
                .picker-dropdown { position: absolute; top: calc(100% + 8px); left: 0; width: 100%; min-width: 240px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); box-shadow: var(--shadow-xl); z-index: 50; max-height: 300px; overflow-y: auto; padding: 4px; }
                .picker-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; font-size: 0.8125rem; cursor: pointer; border-radius: 6px; }
                .picker-item:hover { background: var(--surface-dim); }
                .checkbox-s { width: 16px; height: 16px; border: 2px solid var(--border); border-radius: 4px; display: flex; align-items: center; justify-content: center; }
                .checkbox-s.active { background: var(--primary); border-color: var(--primary); color: white; }
                
                .date-inputs { display: flex; align-items: center; gap: 8px; }
                .date-field { padding: 9px 12px; background: var(--surface-dim); border: 1px solid var(--border); border-radius: var(--radius-md); color: var(--text-primary); font-size: 0.8125rem; }
                
                .radio-group { display: flex; background: var(--surface-dim); padding: 4px; border-radius: var(--radius-md); border: 1px solid var(--border); }
                .radio-btn { flex: 1; padding: 6px 12px; border-radius: 6px; border: none; background: transparent; color: var(--text-muted); font-size: 0.75rem; font-weight: 600; cursor: pointer; white-space: nowrap; }
                .radio-btn.active { background: var(--surface); color: var(--primary); box-shadow: var(--shadow-sm); }
                
                .preset-strip { display: flex; align-items: center; gap: 12px; padding-top: var(--space-4); border-top: 1px solid var(--border); flex-wrap: wrap; }
                .preset-label { font-size: 0.75rem; font-weight: 700; color: var(--text-muted); }
                .chip { padding: 4px 12px; border-radius: 20px; border: 1px solid var(--border); background: var(--surface-dim); font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
                .chip:hover { border-color: var(--primary); color: var(--primary); }
                
                .kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-4); }
                .kpi-glass { padding: var(--space-5); display: flex; align-items: center; gap: var(--space-4); background: rgba(var(--surface-rgb), 0.7); backdrop-filter: blur(10px); }
                .kpi-icon-w { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: rgba(79, 70, 229, 0.1); color: var(--primary); }
                .kpi-glass.success .kpi-icon-w { background: rgba(16, 185, 129, 0.1); color: var(--success); }
                .kpi-glass.warning .kpi-icon-w { background: rgba(245, 158, 11, 0.1); color: var(--warning); }
                .kpi-glass.primary .kpi-icon-w { background: rgba(59, 130, 246, 0.1); color: var(--info); }
                .kpi-info h3 { font-size: 1.5rem; font-weight: 700; margin-bottom: 2px; }
                .kpi-info p { font-size: 0.75rem; color: var(--text-muted); font-weight: 600; }
                
                .charts-container { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }
                .chart-item { padding: var(--space-5); }
                .chart-header { margin-bottom: var(--space-6); }
                .chart-header h4 { font-size: 0.9375rem; font-weight: 700; display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
                .chart-header span { font-size: 0.75rem; color: var(--text-muted); }
                
                .horizontal-bars { display: flex; flex-direction: column; gap: var(--space-4); }
                .bar-row { display: flex; flex-direction: column; gap: 6px; }
                .bar-meta { display: flex; justify-content: space-between; font-size: 0.75rem; font-weight: 600; }
                .bar-bg { height: 8px; background: var(--surface-dim); border-radius: 4px; overflow: hidden; }
                .bar-fill { height: 100%; background: linear-gradient(90deg, var(--primary), var(--accent)); border-radius: 4px; transition: width 1s ease; }
                
                .line-chart-v { height: 200px; display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; padding-top: 20px; }
                .trend-bar { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px; height: 100%; justify-content: flex-end; }
                .bar-core { width: 100%; background: rgba(79, 70, 229, 0.1); border-top: 2px solid var(--primary); border-radius: 4px 4px 0 0; display: flex; justify-content: center; position: relative; transition: height 0.6s ease; }
                .val { position: absolute; top: -20px; font-size: 0.75rem; font-weight: 700; color: var(--primary); }
                .month { font-size: 0.6875rem; color: var(--text-muted); font-weight: 600; }
                
                .preview-card { padding: var(--space-5); }
                .preview-header { margin-bottom: var(--space-4); }
                .preview-header h4 { font-size: 0.9375rem; font-weight: 700; margin-bottom: 4px; }
                .preview-header p { font-size: 0.75rem; color: var(--text-muted); }
                .table-wrapper { overflow-x: auto; border: 1px solid var(--border); border-radius: var(--radius-md); }
                .report-table { width: 100%; border-collapse: collapse; }
                .report-table th { background: var(--surface-dim); padding: 12px; text-align: left; font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; border-bottom: 2px solid var(--border); }
                .report-table td { padding: 12px; font-size: 0.8125rem; border-bottom: 1px solid var(--border); }
                .status-badge { padding: 4px 8px; border-radius: 4px; background: var(--surface-dim); font-size: 0.75rem; font-weight: 600; }
                .status-badge.success { background: rgba(16, 185, 129, 0.1); color: var(--success); }

                @media (max-width: 1024px) {
                    .charts-container { grid-template-columns: 1fr; }
                }
            `}</style>
        </div>
    );
}
