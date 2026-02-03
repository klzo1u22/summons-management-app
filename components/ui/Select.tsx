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
                    className={cn('input', className)}
                    style={{
                        appearance: 'none',
                        width: '100%',
                        paddingRight: 'var(--space-10)',
                        backgroundColor: 'var(--background-elevated)',
                        color: 'var(--text)',
                        borderColor: 'var(--border)',
                    }}
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
