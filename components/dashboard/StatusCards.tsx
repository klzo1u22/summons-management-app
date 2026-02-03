"use client";

import { cn } from "@/lib/utils";
import { getStats } from "@/lib/logic";
import { Summons } from "@/lib/types";
import { AlertCircle, CheckCircle2, Clock, FileWarning, Mail } from "lucide-react";
import { useMemo } from "react";

interface StatusCardProps {
    title: string;
    count: number;
    icon: React.ElementType;
    colorClass: string;
    onClick?: () => void;
}

function StatusCard({ title, count, icon: Icon, colorClass, onClick }: StatusCardProps) {
    return (
        <div
            onClick={onClick}
            className="bg-white rounded-xl p-5 shadow-sm border border-border/50 cursor-pointer transition-all hover:shadow-md hover:border-border flex flex-col justify-between h-[110px]"
        >
            <div className="flex justify-between items-start">
                <span className="text-muted-foreground text-sm font-medium">{title}</span>
                <div className={cn("p-2 rounded-lg bg-opacity-10", colorClass)}>
                    <Icon className={cn("w-5 h-5", colorClass.replace("bg-", "text-"))} />
                </div>
            </div>
            <span className="text-3xl font-bold text-foreground">{count}</span>
        </div>
    );
}

interface StatusCardsProps {
    summons: Summons[];
    onFilterClick?: (view: string) => void;
}

export function StatusCards({ summons, onFilterClick }: StatusCardsProps) {
    const stats = useMemo(() => getStats(summons), [summons]);

    return (
        <div className="grid grid-cols-5 gap-4 mb-8">
            <StatusCard
                title="Not Issued"
                count={stats.notIssued}
                icon={Mail}
                colorClass="bg-blue-500 text-blue-600"
                onClick={() => onFilterClick?.("Not Issued")}
            />
            <StatusCard
                title="Not Served"
                count={stats.notServed}
                icon={AlertCircle}
                colorClass="bg-amber-500 text-amber-600"
                onClick={() => onFilterClick?.("Issued but Not Served")}
            />
            <StatusCard
                title="Reschedule Pending"
                count={stats.reschedulePending}
                icon={Clock}
                colorClass="bg-purple-500 text-purple-600"
                onClick={() => onFilterClick?.("Reschedule Pending")}
            />
            <StatusCard
                title="Ongoing Statements"
                count={stats.ongoingStatements}
                icon={FileWarning}
                colorClass="bg-indigo-500 text-indigo-600"
                onClick={() => onFilterClick?.("Ongoing Statements")}
            />
            <StatusCard
                title="Upcoming 7 Days"
                count={stats.upcoming7Days}
                icon={CheckCircle2}
                colorClass="bg-emerald-500 text-emerald-600"
                onClick={() => onFilterClick?.("Upcoming 7 Days")}
            />
        </div>
    );
}
