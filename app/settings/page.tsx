'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { Header } from '@/components/layout/Header';
import {
    Settings,
    Plus,
    Trash2,
    Database,
    Download,
    Upload,
    Shield,
    Clock,
    AlertCircle,
    Check,
    X,
    ChevronRight,
    Search,
    User
} from 'lucide-react';
import {
    getOptionsAction,
    addOptionAction,
    removeOptionAction,
    getSettingsAction,
    updateSettingAction,
    backupDatabaseAction,
    restoreDatabaseAction
} from '../settings-actions';
import { motion, AnimatePresence } from 'framer-motion';

const PROPERTIES = [
    { id: 'person_role', label: 'Person Role', icon: User },
    { id: 'priority', label: 'Priority', icon: AlertCircle },
    { id: 'tone', label: 'Tone Required', icon: Settings },
    { id: 'purpose', label: 'Purpose of Summons', icon: Check },
    { id: 'mode_of_service', label: 'Mode of Service', icon: ChevronRight },
    { id: 'statement_status', label: 'Statement Status', icon: Settings },
    { id: 'summons_response', label: 'Summons Response', icon: Settings },
    { id: 'case_status', label: 'Case Status', icon: Settings },
    { id: 'assigned_officer', label: 'Assigned Officer', icon: User },
    { id: 'activity', label: 'Activity Types', icon: AlertCircle },
];

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('properties');
    const [selectedProperty, setSelectedProperty] = useState(PROPERTIES[0].id);
    const [options, setOptions] = useState<any[]>([]);
    const [appSettings, setAppSettings] = useState<Record<string, string>>({});
    const [newOption, setNewOption] = useState('');
    const [isPending, startTransition] = useTransition();
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        loadOptions(selectedProperty);
    }, [selectedProperty]);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadOptions = async (property: string) => {
        const data = await getOptionsAction(property);
        setOptions(data);
    };

    const loadSettings = async () => {
        const data = await getSettingsAction();
        setAppSettings(data);
    };

    const handleAddOption = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newOption.trim()) return;

        const result = await addOptionAction(selectedProperty, newOption.trim());
        if (result.success) {
            setNewOption('');
            loadOptions(selectedProperty);
            showFlash('success', 'Option added successfully');
        } else {
            showFlash('error', result.error);
        }
    };

    const handleRemoveOption = async (id: string) => {
        if (!confirm('Are you sure you want to remove this option?')) return;
        const result = await removeOptionAction(id);
        if (result.success) {
            loadOptions(selectedProperty);
            showFlash('success', 'Option removed');
        }
    };

    const handleUpdateSetting = async (key: string, value: string) => {
        const result = await updateSettingAction(key, value);
        if (result.success) {
            setAppSettings(prev => ({ ...prev, [key]: value }));
            showFlash('success', 'Setting updated');
        }
    };

    const handleBackup = async () => {
        const result = await backupDatabaseAction();
        if (result.success) {
            // Backup export logic would go here if/when re-enabled with valid return data
            showFlash('success', 'Backup successful');
        } else {
            showFlash('error', result.error || 'Backup failed');
        }
    };

    const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64 = (event.target?.result as string).split(',')[1];
            if (confirm('Warning: This will overwrite your current database. Proceed?')) {
                const result = await restoreDatabaseAction(base64);
                if (result.success) {
                    showFlash('success', 'Database restored. Reloading...');
                    setTimeout(() => window.location.reload(), 2000);
                } else {
                    showFlash('error', result.error || 'Restore failed');
                }
            }
        };
        reader.readAsDataURL(file);
    };

    const showFlash = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 3000);
    };

    return (
        <div className="layout">
            <Header
                title="Application Settings"
                subtitle="Manage properties, defaults, and administrative tasks"
                showSearch={false}
            />

            <main className="settings-main">
                {/* Lateral Navigation */}
                <aside className="settings-nav">
                    <button
                        className={`nav-item ${activeTab === 'properties' ? 'active' : ''}`}
                        onClick={() => setActiveTab('properties')}
                    >
                        <Settings size={18} />
                        Property Management
                    </button>
                    <button
                        className={`nav-item ${activeTab === 'defaults' ? 'active' : ''}`}
                        onClick={() => setActiveTab('defaults')}
                    >
                        <Clock size={18} />
                        Global Defaults
                    </button>
                    <button
                        className={`nav-item ${activeTab === 'admin' ? 'active' : ''}`}
                        onClick={() => setActiveTab('admin')}
                    >
                        <Shield size={18} />
                        Administration
                    </button>
                    <button
                        className={`nav-item ${activeTab === 'users' ? 'active' : ''}`}
                        onClick={() => setActiveTab('users')}
                    >
                        <User size={18} />
                        User Management
                    </button>
                </aside>

                {/* Content Area */}
                <div className="settings-content">
                    <AnimatePresence mode="wait">
                        {message && (
                            <motion.div
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className={`flash-message ${message.type}`}
                            >
                                {message.type === 'success' ? <Check size={16} /> : <X size={16} />}
                                {message.text}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {activeTab === 'properties' && (
                        <div className="property-manager">
                            <div className="property-selector">
                                <h3>Select Property</h3>
                                <div className="property-list">
                                    {PROPERTIES.map(prop => (
                                        <button
                                            key={prop.id}
                                            className={`prop-btn ${selectedProperty === prop.id ? 'active' : ''}`}
                                            onClick={() => setSelectedProperty(prop.id)}
                                        >
                                            <prop.icon size={16} />
                                            {prop.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="option-manager">
                                <div className="section-header">
                                    <h3>Options for {PROPERTIES.find(p => p.id === selectedProperty)?.label}</h3>
                                    <form onSubmit={handleAddOption} className="add-option-form">
                                        <input
                                            type="text"
                                            placeholder="Add new option..."
                                            value={newOption}
                                            onChange={(e) => setNewOption(e.target.value)}
                                            className="input"
                                        />
                                        <button type="submit" className="btn btn-primary btn-icon">
                                            <Plus size={18} />
                                        </button>
                                    </form>
                                </div>

                                <div className="options-table-container">
                                    <table className="settings-table">
                                        <thead>
                                            <tr>
                                                <th>Option Value</th>
                                                <th>Created At</th>
                                                <th style={{ width: 80 }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {options.map((opt) => (
                                                <tr key={opt.id}>
                                                    <td>{opt.option_value}</td>
                                                    <td className="text-muted">{new Date(opt.created_at).toLocaleDateString()}</td>
                                                    <td>
                                                        <button
                                                            className="btn btn-ghost btn-sm text-error"
                                                            onClick={() => handleRemoveOption(opt.id)}
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {options.length === 0 && (
                                                <tr>
                                                    <td colSpan={3} className="text-center text-muted py-8">
                                                        No options defined yet.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'defaults' && (
                        <div className="defaults-manager">
                            <h3>Application Defaults</h3>
                            <div className="settings-grid">
                                <div className="setting-card">
                                    <div className="setting-info">
                                        <label>Financial Year Start Month</label>
                                        <p>Set the month when the fiscal year begins (e.g., April = 4)</p>
                                    </div>
                                    <select
                                        value={appSettings['fy_start_month'] || '4'}
                                        onChange={(e) => handleUpdateSetting('fy_start_month', e.target.value)}
                                        className="select"
                                    >
                                        <option value="1">January</option>
                                        <option value="4">April</option>
                                        <option value="7">July</option>
                                        <option value="10">October</option>
                                    </select>
                                </div>

                                <div className="setting-card">
                                    <div className="setting-info">
                                        <label>Default Summon Priority</label>
                                        <p>Assign this priority to newly created summons by default</p>
                                    </div>
                                    <select
                                        value={appSettings['default_priority'] || 'Medium'}
                                        onChange={(e) => handleUpdateSetting('default_priority', e.target.value)}
                                        className="select"
                                    >
                                        <option value="High">High</option>
                                        <option value="Medium">Medium</option>
                                        <option value="Low">Low</option>
                                    </select>
                                </div>

                                <div className="setting-card">
                                    <div className="setting-info">
                                        <label>Highlight Overdue Summons</label>
                                        <p>Automatically mark rows in red if appearance date is passed</p>
                                    </div>
                                    <div className="toggle-wrapper">
                                        <button
                                            className={`toggle-btn ${appSettings['highlight_overdue'] === 'true' ? 'active' : ''}`}
                                            onClick={() => handleUpdateSetting('highlight_overdue', appSettings['highlight_overdue'] === 'true' ? 'false' : 'true')}
                                        >
                                            <div className="toggle-thumb" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'admin' && (
                        <div className="admin-manager">
                            <h3>Backup & Restore</h3>
                            <div className="admin-grid">
                                <div className="admin-card">
                                    <div className="admin-icon"><Database size={24} /></div>
                                    <div className="admin-info">
                                        <h4>Full Database Backup</h4>
                                        <p>Download a complete copy of the SQLite database including all summons, cases, and logs.</p>
                                        <button onClick={handleBackup} className="btn btn-secondary mt-4">
                                            <Download size={16} /> Download .db File
                                        </button>
                                    </div>
                                </div>

                                <div className="admin-card">
                                    <div className="admin-icon"><Upload size={24} /></div>
                                    <div className="admin-info">
                                        <h4>Restore Database</h4>
                                        <p>Upload a previously backed up .db file to restore all data. This will overwrite current entries.</p>
                                        <label className="btn btn-outline mt-4 cursor-pointer">
                                            <Upload size={16} /> Upload & Restore
                                            <input type="file" accept=".db" onChange={handleRestore} hidden />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'users' && (
                        <div className="user-manager">
                            <h3>User Roles & Access</h3>
                            <div className="card text-center py-12">
                                <Shield size={48} className="mx-auto text-muted mb-4" />
                                <h4 className="text-lg font-semibold">Role-Based Access Control</h4>
                                <p className="text-muted max-w-md mx-auto mt-2">
                                    User management and multi-user roles are currently restricted to the system administrator.
                                    Individual profile editing is available in the profile menu.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <style jsx>{`
                .settings-main {
                    display: flex;
                    gap: var(--space-8);
                    padding: var(--space-6);
                    min-height: calc(100vh - 80px);
                }
                .settings-nav {
                    width: 260px;
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-1);
                }
                .nav-item {
                    display: flex;
                    align-items: center;
                    gap: var(--space-3);
                    padding: var(--space-3) var(--space-4);
                    border-radius: var(--radius-md);
                    background: transparent;
                    border: none;
                    color: var(--foreground-muted);
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    text-align: left;
                }
                .nav-item:hover {
                    background: var(--background-elevated);
                    color: var(--foreground);
                }
                .nav-item.active {
                    background: var(--primary-light);
                    color: var(--primary);
                }
                .settings-content {
                    flex: 1;
                    max-width: 1000px;
                    position: relative;
                }
                .flash-message {
                    position: fixed;
                    top: var(--space-4);
                    right: var(--space-4);
                    padding: var(--space-3) var(--space-4);
                    border-radius: var(--radius-md);
                    display: flex;
                    align-items: center;
                    gap: var(--space-2);
                    font-size: 0.875rem;
                    z-index: 1000;
                    box-shadow: var(--shadow-lg);
                }
                .flash-message.success {
                    background: var(--success);
                    color: white;
                }
                .flash-message.error {
                    background: var(--error);
                    color: white;
                }

                /* Property Manager */
                .property-manager {
                    display: grid;
                    grid-template-columns: 240px 1fr;
                    gap: var(--space-6);
                }
                .property-list {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                    margin-top: var(--space-3);
                }
                .prop-btn {
                    display: flex;
                    align-items: center;
                    gap: var(--space-2);
                    padding: var(--space-2) var(--space-3);
                    border-radius: var(--radius-sm);
                    font-size: 0.875rem;
                    background: transparent;
                    border: none;
                    text-align: left;
                    cursor: pointer;
                    color: var(--foreground-muted);
                }
                .prop-btn:hover {
                    background: var(--background-elevated);
                }
                .prop-btn.active {
                    background: var(--background-elevated);
                    color: var(--primary);
                    font-weight: 600;
                }
                .section-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: var(--space-4);
                }
                .add-option-form {
                    display: flex;
                    gap: var(--space-2);
                }
                .settings-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .settings-table th {
                    text-align: left;
                    padding: var(--space-3);
                    border-bottom: 2px solid var(--border);
                    font-size: 0.75rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: var(--foreground-muted);
                }
                .settings-table td {
                    padding: var(--space-3);
                    border-bottom: 1px solid var(--border);
                    font-size: 0.875rem;
                }

                /* Defaults manager */
                .settings-grid {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-4);
                    margin-top: var(--space-4);
                }
                .setting-card {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: var(--space-4);
                    background: var(--background-elevated);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-lg);
                }
                .setting-info label {
                    display: block;
                    font-weight: 600;
                    margin-bottom: 4px;
                }
                .setting-info p {
                    font-size: 0.8125rem;
                    color: var(--foreground-muted);
                }

                /* Admin Section */
                .admin-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: var(--space-4);
                    margin-top: var(--space-4);
                }
                .admin-card {
                    display: flex;
                    gap: var(--space-4);
                    padding: var(--space-6);
                    background: var(--background-elevated);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-xl);
                }
                .admin-icon {
                    width: 48px;
                    height: 48px;
                    border-radius: var(--radius-lg);
                    background: var(--background);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--primary);
                    flex-shrink: 0;
                }
                .admin-info h4 {
                    font-weight: 700;
                    margin-bottom: var(--space-2);
                }
                .admin-info p {
                    font-size: 0.875rem;
                    color: var(--foreground-muted);
                    line-height: 1.5;
                }

                /* Toggle */
                .toggle-btn {
                    width: 44px;
                    height: 24px;
                    border-radius: 12px;
                    background: var(--border);
                    border: none;
                    position: relative;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .toggle-btn.active {
                    background: var(--primary);
                }
                .toggle-thumb {
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: white;
                    position: absolute;
                    top: 2px;
                    left: 2px;
                    transition: all 0.2s;
                }
                .toggle-btn.active .toggle-thumb {
                    left: 22px;
                }
            `}</style>
        </div>
    );
}
