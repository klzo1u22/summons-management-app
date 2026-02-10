"use client";

import { cn } from "@/lib/utils";

interface ToggleSwitchProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    label?: string;
    description?: string;
    id?: string;
}

export function ToggleSwitch({
    checked,
    onChange,
    disabled = false,
    label,
    description,
    id,
}: ToggleSwitchProps) {
    return (
        <div
            className={cn(
                "flex items-center justify-between gap-4 p-4 rounded-xl border transition-all duration-200 cursor-pointer group",
                checked
                    ? "bg-primary/5 border-primary/30 hover:border-primary/50"
                    : "bg-card border-border hover:border-primary/30",
                disabled && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => !disabled && onChange(!checked)}
        >
            <div className="flex flex-col gap-0.5">
                {label && (
                    <span className={cn(
                        "text-sm font-medium transition-colors",
                        checked ? "text-primary" : "text-foreground"
                    )}>
                        {label}
                    </span>
                )}
                {description && (
                    <span className="text-xs text-muted-foreground">
                        {description}
                    </span>
                )}
            </div>
            <button
                type="button"
                id={id}
                role="switch"
                aria-checked={checked}
                disabled={disabled}
                onClick={(e) => {
                    e.stopPropagation();
                    if (!disabled) onChange(!checked);
                }}
                className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    checked ? "bg-primary" : "bg-muted",
                    disabled && "cursor-not-allowed"
                )}
            >
                <span
                    className={cn(
                        "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out",
                        checked ? "translate-x-5" : "translate-x-0.5",
                        "mt-0.5"
                    )}
                />
            </button>
        </div>
    );
}
