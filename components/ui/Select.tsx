import { cn } from "@/lib/utils";
import { SelectHTMLAttributes } from 'react';
import { ChevronDown } from "lucide-react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
}

export function Select({ label, className, children, ...props }: SelectProps) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', width: '100%' }}>
            {label && <label className="label" style={{ fontSize: '0.8125rem' }}>{label}</label>}
            <div style={{ position: 'relative' }}>
                <select
                    className={cn(
                        "flex h-10 w-full appearance-none rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1 pr-8 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50 text-[var(--text-primary)]",
                        className
                    )}
                    {...props}
                >
                    {children}
                </select>
                <ChevronDown
                    size={16}
                    style={{
                        position: 'absolute',
                        right: 'var(--space-3)',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        pointerEvents: 'none',
                        color: 'var(--text-muted)',
                    }}
                />
            </div>
        </div>
    );
}
Select.displayName = "Select";
