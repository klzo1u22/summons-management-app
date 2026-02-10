'use client';

import { useState, useRef, useEffect } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown, Filter, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface TableColumnHeaderProps {
    title: string;
    columnKey: string;
    sortable?: boolean;
    filterable?: boolean;
    sortDirection?: 'asc' | 'desc' | null;
    onSort?: (direction: 'asc' | 'desc' | null) => void;
    selectedFilters?: string[];
    onFilter?: (values: string[]) => void;
    options?: string[]; // Unique values for filtering
}

export function TableColumnHeader({
    title,
    sortable = true,
    filterable = true,
    sortDirection,
    onSort,
    selectedFilters = [],
    onFilter,
    options = []
}: TableColumnHeaderProps) {
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const filterRef = useRef<HTMLDivElement>(null);
    const [filterSearch, setFilterSearch] = useState('');

    // Handle click outside to close filter dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setIsFilterOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleSort = () => {
        if (!onSort) return;
        if (sortDirection === 'asc') onSort('desc');
        else if (sortDirection === 'desc') onSort(null);
        else onSort('asc');
    };

    const toggleFilterOption = (option: string) => {
        if (!onFilter) return;
        const newFilters = selectedFilters.includes(option)
            ? selectedFilters.filter(f => f !== option)
            : [...selectedFilters, option];
        onFilter(newFilters);
    };

    const clearFilters = () => {
        if (onFilter) onFilter([]);
    };

    const filteredOptions = options.filter(opt =>
        opt.toLowerCase().includes(filterSearch.toLowerCase())
    );

    return (
        <div className="flex items-center gap-2 select-none group" ref={filterRef}>
            <div
                className={cn(
                    "flex items-center gap-1 cursor-pointer hover:text-[var(--primary)] transition-colors",
                    sortDirection && "text-[var(--primary)] font-semibold"
                )}
                onClick={sortable ? toggleSort : undefined}
            >
                <span>{title}</span>
                {sortable && (
                    <span className="text-muted-foreground/50">
                        {sortDirection === 'asc' && <ArrowUp size={14} className="text-[var(--primary)]" />}
                        {sortDirection === 'desc' && <ArrowDown size={14} className="text-[var(--primary)]" />}
                        {!sortDirection && <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />}
                    </span>
                )}
            </div>

            {filterable && options.length > 0 && (
                <div className="relative">
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                            "h-6 w-6 p-0 hover:bg-[var(--surface-sunken)]",
                            selectedFilters.length > 0 && "text-[var(--primary)] bg-[var(--surface-sunken)]"
                        )}
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsFilterOpen(!isFilterOpen);
                        }}
                    >
                        <Filter size={12} strokeWidth={selectedFilters.length > 0 ? 2.5 : 2} />
                    </Button>

                    {isFilterOpen && (
                        <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-xl border border-[var(--border)] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                            <div className="p-2 border-b border-[var(--border)]">
                                <Input
                                    placeholder="Search..."
                                    className="h-8 text-xs"
                                    value={filterSearch}
                                    onChange={(e) => setFilterSearch(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div className="max-h-48 overflow-y-auto p-1 py-2 space-y-0.5">
                                {filteredOptions.length > 0 ? (
                                    filteredOptions.map(option => (
                                        <div
                                            key={option}
                                            className="flex items-center gap-2 px-2 py-1.5 hover:bg-[var(--surface-sunken)] rounded cursor-pointer text-sm"
                                            onClick={() => toggleFilterOption(option)}
                                        >
                                            <div className={cn(
                                                "w-4 h-4 rounded border border-[var(--border)] flex items-center justify-center transition-colors",
                                                selectedFilters.includes(option) && "bg-[var(--primary)] border-[var(--primary)] text-white"
                                            )}>
                                                {selectedFilters.includes(option) && <Check size={10} />}
                                            </div>
                                            <span className="truncate">{option}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="px-2 py-2 text-xs text-muted-foreground text-center">
                                        No options found
                                    </div>
                                )}
                            </div>
                            <div className="p-2 border-t border-[var(--border)] bg-[var(--surface-sunken)]/50 flex justify-between items-center">
                                <span className="text-xs text-muted-foreground">{selectedFilters.length} selected</span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-xs hover:text-red-500"
                                    onClick={clearFilters}
                                    disabled={selectedFilters.length === 0}
                                >
                                    Clear
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
