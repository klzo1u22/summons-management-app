"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Calendar, Clock } from "lucide-react";
import { format, formatDistanceToNow, isBefore, addDays } from "date-fns";
import Link from "next/link";
import { Summons } from "@/lib/types";

interface UpcomingSummonsProps {
    summons: Summons[];
}

export function UpcomingSummons({ summons }: UpcomingSummonsProps) {
    // Filter for upcoming summons (next 7 days)
    const now = new Date();
    const weekFromNow = addDays(now, 7);

    const upcoming = summons
        .filter(s => {
            const appearanceDate = s.rescheduled_date || s.appearance_date;
            if (!appearanceDate) return false;
            const date = new Date(appearanceDate);
            return date >= now && date <= weekFromNow && s.status !== "Closed";
        })
        .sort((a, b) => {
            const dateA = new Date(a.rescheduled_date || a.appearance_date || "");
            const dateB = new Date(b.rescheduled_date || b.appearance_date || "");
            return dateA.getTime() - dateB.getTime();
        });

    const getUrgencyColor = (dateStr: string) => {
        const date = new Date(dateStr);
        const tomorrow = addDays(now, 1);
        const threeDays = addDays(now, 3);

        if (date < tomorrow) {
            return "bg-red-500/20 text-red-400 border-red-500/30";
        } else if (date < threeDays) {
            return "bg-orange-500/20 text-orange-400 border-orange-500/30";
        }
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    };

    const getPriorityColor = (priority: string) => {
        const colors: Record<string, string> = {
            "P0": "bg-red-500/20 text-red-400 border-red-500/30",
            "P1": "bg-orange-500/20 text-orange-400 border-orange-500/30",
            "P2": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
            "P3": "bg-blue-500/20 text-blue-400 border-blue-500/30",
        };
        return colors[priority] || "bg-gray-500/20 text-gray-400 border-gray-500/30";
    };

    return (
        <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold text-foreground">Upcoming Summons</h2>
                <Badge className="ml-auto bg-primary/20 text-primary border-primary/30">
                    {upcoming.length}
                </Badge>
            </div>

            {upcoming.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    No upcoming summons in the next 7 days
                </div>
            ) : (
                <div className="space-y-3">
                    {upcoming.slice(0, 5).map((summon) => {
                        const appearanceDate = summon.rescheduled_date || summon.appearance_date || "";
                        return (
                            <Link
                                key={summon.id}
                                href={summon.case_id ? `/cases/${summon.case_id}` : "/"}
                                className="block"
                            >
                                <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors border border-white/5">
                                    <div className="mt-1">
                                        <Clock className="w-4 h-4 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="text-sm font-medium text-foreground truncate">
                                                {summon.person_name}
                                            </p>
                                            {summon.priority && (
                                                <Badge className={`text-xs ${getPriorityColor(summon.priority)}`}>
                                                    {summon.priority}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="text-xs text-muted-foreground mb-1">
                                            {summon.person_role}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge className={`text-xs ${getUrgencyColor(appearanceDate)}`}>
                                                {format(new Date(appearanceDate), "MMM dd, yyyy")}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">
                                                {formatDistanceToNow(new Date(appearanceDate), { addSuffix: true })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </GlassCard>
    );
}
