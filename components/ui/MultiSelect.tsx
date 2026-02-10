"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, X } from "lucide-react";
import { Label } from "@/components/ui/Label";
import { cn } from "@/lib/utils";

interface MultiSelectProps {
    label?: string;
    options: readonly string[];
    selected: string[];
    onChange: (values: string[]) => void;
    placeholder?: string;
    className?: string;
}

export function MultiSelect({
    label,
    options,
    selected,
    onChange,
    placeholder = "Select options...",
    className
}: MultiSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleOption = (option: string) => {
        const newSelected = selected.includes(option)
            ? selected.filter(item => item !== option)
            : [...selected, option];
        onChange(newSelected);
    };

    return (
        <div className={cn("space-y-2 relative", className)} ref={containerRef}>
            {label && <Label className="text-[var(--text-secondary)]">{label}</Label>}
            <div
                className="min-h-[40px] w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-1.5 flex flex-wrap gap-2 cursor-pointer focus-within:ring-1 focus-within:ring-[var(--primary)] focus-within:border-[var(--primary)] transition-all shadow-sm hover:border-[var(--primary)]/50"
                onClick={() => setIsOpen(!isOpen)}
            >
                {selected.length === 0 ? (
                    <span className="text-[var(--text-muted)] text-sm">{placeholder}</span>
                ) : (
                    selected.map(item => (
                        <div key={item} className="bg-[var(--primary-muted)] text-[var(--primary)] text-xs font-medium px-2 py-1 rounded flex items-center gap-1 group animate-in zoom-in-95 duration-200">
                            {item}
                            <X
                                size={12}
                                className="cursor-pointer hover:text-[var(--error)] transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleOption(item);
                                }}
                            />
                        </div>
                    ))
                )}
                <ChevronDown size={16} className={cn("ml-auto text-[var(--text-muted)] transition-transform duration-200", isOpen && "rotate-180")} />
            </div>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-full bg-[var(--background-elevated)] border border-[var(--border)] rounded-lg shadow-xl py-1 max-h-60 overflow-y-auto scrollbar-thin animate-in fade-in slide-in-from-top-2 duration-200">
                    {options.map(option => (
                        <div
                            key={option}
                            className={cn(
                                "px-3 py-2 text-sm cursor-pointer flex items-center justify-between hover:bg-[var(--surface)] transition-colors",
                                selected.includes(option) && "text-[var(--primary)] bg-[var(--primary-muted)]/50 font-medium"
                            )}
                            onClick={() => toggleOption(option)}
                        >
                            {option}
                            {selected.includes(option) && <Check size={14} className="animate-in zoom-in duration-200" />}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
