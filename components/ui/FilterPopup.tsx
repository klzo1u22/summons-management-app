'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Filter, ChevronDown, Check } from 'lucide-react';
import {
    PRIORITY_OPTIONS,
    MODE_OF_SERVICE_OPTIONS,
    PURPOSE_OPTIONS,
    STATEMENT_STATUS_OPTIONS,
    PERSON_ROLE_OPTIONS,
} from '@/lib/types';

export interface FilterState {
    priorities: string[];
    personRoles: string[];
    modesOfService: string[];
    purposes: string[];
    statementStatuses: string[];
    isIssuedFilter: 'any' | 'yes' | 'no';
    isServedFilter: 'any' | 'yes' | 'no';
    rescheduleFilter: 'any' | 'yes' | 'no';
    issueDateFrom: string;
    issueDateTo: string;
    appearanceDateFrom: string;
    appearanceDateTo: string;
}

interface FilterPopupProps {
    filters: FilterState;
    onApply: (filters: FilterState) => void;
    onClose: () => void;
}

function MultiSelectFilter({
    label,
    options,
    selected,
    onChange,
}: {
    label: string;
    options: string[];
    selected: string[];
    onChange: (values: string[]) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOption = (option: string) => {
        if (selected.includes(option)) {
            onChange(selected.filter(s => s !== option));
        } else {
            onChange([...selected, option]);
        }
    };

    return (
        <div ref={containerRef} className="filter-select-container">
            <label className="filter-label">{label}</label>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`filter-select-trigger ${selected.length > 0 ? 'has-selection' : ''}`}
            >
                <span className={selected.length === 0 ? 'placeholder' : ''}>
                    {selected.length === 0 ? 'Any' : `${selected.length} selected`}
                </span>
                <ChevronDown size={14} className={`chevron ${isOpen ? 'open' : ''}`} />
            </button>
            {isOpen && (
                <div className="filter-dropdown">
                    {options.map(option => (
                        <button
                            key={option}
                            type="button"
                            onClick={() => toggleOption(option)}
                            className={`filter-option ${selected.includes(option) ? 'selected' : ''}`}
                        >
                            <div className={`option-checkbox ${selected.includes(option) ? 'checked' : ''}`}>
                                {selected.includes(option) && <Check size={10} />}
                            </div>
                            <span>{option}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function TriStateFilter({
    label,
    value,
    onChange,
}: {
    label: string;
    value: 'any' | 'yes' | 'no';
    onChange: (value: 'any' | 'yes' | 'no') => void;
}) {
    return (
        <div className="tri-state-filter">
            <label className="filter-label">{label}</label>
            <div className="tri-state-buttons">
                <button
                    type="button"
                    onClick={() => onChange('any')}
                    className={`tri-btn ${value === 'any' ? 'active neutral' : ''}`}
                >
                    Any
                </button>
                <button
                    type="button"
                    onClick={() => onChange('yes')}
                    className={`tri-btn ${value === 'yes' ? 'active success' : ''}`}
                >
                    Yes
                </button>
                <button
                    type="button"
                    onClick={() => onChange('no')}
                    className={`tri-btn ${value === 'no' ? 'active error' : ''}`}
                >
                    No
                </button>
            </div>
        </div>
    );
}

export function FilterPopup({ filters, onApply, onClose }: FilterPopupProps) {
    const [localFilters, setLocalFilters] = useState<FilterState>(filters);
    const popupRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setLocalFilters(filters);
    }, [filters]);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    const handleApply = () => {
        onApply(localFilters);
    };

    const handleClear = () => {
        const clearedFilters: FilterState = {
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
        };
        setLocalFilters(clearedFilters);
    };

    const activeFilterCount = [
        localFilters.priorities.length > 0,
        localFilters.personRoles.length > 0,
        localFilters.modesOfService.length > 0,
        localFilters.purposes.length > 0,
        localFilters.statementStatuses.length > 0,
        localFilters.isIssuedFilter !== 'any',
        localFilters.isServedFilter !== 'any',
        localFilters.rescheduleFilter !== 'any',
        localFilters.issueDateFrom !== '' || localFilters.issueDateTo !== '',
        localFilters.appearanceDateFrom !== '' || localFilters.appearanceDateTo !== '',
    ].filter(Boolean).length;

    return (
        <div className="filter-popup-overlay" onClick={onClose}>
            <div
                ref={popupRef}
                className="filter-popup"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="filter-popup-header">
                    <div className="filter-header-left">
                        <div className="filter-icon">
                            <Filter size={18} />
                        </div>
                        <div>
                            <h2>Filters</h2>
                            <p>{activeFilterCount > 0 ? `${activeFilterCount} active filter(s)` : 'No filters applied'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="btn btn-ghost btn-icon">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="filter-popup-body">
                    <div className="filter-grid">
                        <MultiSelectFilter
                            label="Priority"
                            options={[...PRIORITY_OPTIONS]}
                            selected={localFilters.priorities}
                            onChange={(v) => setLocalFilters(f => ({ ...f, priorities: v }))}
                        />
                        <MultiSelectFilter
                            label="Person Role"
                            options={[...PERSON_ROLE_OPTIONS]}
                            selected={localFilters.personRoles}
                            onChange={(v) => setLocalFilters(f => ({ ...f, personRoles: v }))}
                        />
                        <MultiSelectFilter
                            label="Mode of Service"
                            options={[...MODE_OF_SERVICE_OPTIONS]}
                            selected={localFilters.modesOfService}
                            onChange={(v) => setLocalFilters(f => ({ ...f, modesOfService: v }))}
                        />
                        <MultiSelectFilter
                            label="Purpose"
                            options={[...PURPOSE_OPTIONS]}
                            selected={localFilters.purposes}
                            onChange={(v) => setLocalFilters(f => ({ ...f, purposes: v }))}
                        />
                        <MultiSelectFilter
                            label="Statement Status"
                            options={[...STATEMENT_STATUS_OPTIONS]}
                            selected={localFilters.statementStatuses}
                            onChange={(v) => setLocalFilters(f => ({ ...f, statementStatuses: v }))}
                        />
                    </div>

                    {/* Date range Section */}
                    <div className="filter-section">
                        <h3>Date Range</h3>
                        <div className="date-range-grid">
                            <div className="date-range-group">
                                <label className="filter-label">Issue Date From</label>
                                <input
                                    type="date"
                                    value={localFilters.issueDateFrom}
                                    onChange={(e) => setLocalFilters(f => ({ ...f, issueDateFrom: e.target.value }))}
                                    className="input"
                                />
                            </div>
                            <div className="date-range-group">
                                <label className="filter-label">Issue Date To</label>
                                <input
                                    type="date"
                                    value={localFilters.issueDateTo}
                                    onChange={(e) => setLocalFilters(f => ({ ...f, issueDateTo: e.target.value }))}
                                    className="input"
                                />
                            </div>
                            <div className="date-range-group">
                                <label className="filter-label">Appearance Date From</label>
                                <input
                                    type="date"
                                    value={localFilters.appearanceDateFrom}
                                    onChange={(e) => setLocalFilters(f => ({ ...f, appearanceDateFrom: e.target.value }))}
                                    className="input"
                                />
                            </div>
                            <div className="date-range-group">
                                <label className="filter-label">Appearance Date To</label>
                                <input
                                    type="date"
                                    value={localFilters.appearanceDateTo}
                                    onChange={(e) => setLocalFilters(f => ({ ...f, appearanceDateTo: e.target.value }))}
                                    className="input"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Tri-state filters */}
                    <div className="filter-section">
                        <h3>Status Filters</h3>
                        <div className="tri-state-grid">
                            <TriStateFilter
                                label="Is Issued"
                                value={localFilters.isIssuedFilter}
                                onChange={(v) => setLocalFilters(f => ({ ...f, isIssuedFilter: v }))}
                            />
                            <TriStateFilter
                                label="Is Served"
                                value={localFilters.isServedFilter}
                                onChange={(v) => setLocalFilters(f => ({ ...f, isServedFilter: v }))}
                            />
                            <TriStateFilter
                                label="Reschedule Requested"
                                value={localFilters.rescheduleFilter}
                                onChange={(v) => setLocalFilters(f => ({ ...f, rescheduleFilter: v }))}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="filter-popup-footer">
                    <button className="btn btn-ghost" onClick={handleClear}>
                        Clear All
                    </button>
                    <div className="filter-footer-actions">
                        <button className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button className="btn btn-primary" onClick={handleApply}>
                            Apply Filters
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
