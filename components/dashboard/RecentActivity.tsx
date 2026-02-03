"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Clock, FileText, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

interface ActivityItem {
    id: string;
    type: "case" | "summons";
    title: string;
    status: string;
    timestamp: string;
    officer?: string;
    caseId?: string;
}

interface RecentActivityProps {
    activities: ActivityItem[];
}

export function RecentActivity({ activities }: RecentActivityProps) {
    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            "Active": "bg-green-500/20 text-green-400 border-green-500/30",
            "To Do": "bg-blue-500/20 text-blue-400 border-blue-500/30",
            "Pending": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
            "Trial": "bg-purple-500/20 text-purple-400 border-purple-500/30",
            "Closed": "bg-gray-500/20 text-gray-400 border-gray-500/30",
            "Done": "bg-gray-500/20 text-gray-400 border-gray-500/30",
        };
        return colors[status] || "bg-gray-500/20 text-gray-400 border-gray-500/30";
    };

    const getHref = (item: ActivityItem) => {
        if (item.type === "case") {
            return `/cases/${item.id}`;
        }
        return item.caseId ? `/cases/${item.caseId}` : "/";
    };

    return (
        <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold text-foreground">Recent Activity</h2>
            </div>

            {activities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    No recent activity
                </div>
            ) : (
                <div className="space-y-3">
                    {activities.slice(0, 5).map((activity) => (
                        <Link
                            key={`${activity.type}-${activity.id}`}
                            href={getHref(activity)}
                            className="block"
                        >
                            <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors border border-white/5">
                                <div className="mt-1">
                                    {activity.type === "case" ? (
                                        <FileText className="w-4 h-4 text-primary" />
                                    ) : (
                                        <User className="w-4 h-4 text-blue-400" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="text-sm font-medium text-foreground truncate">
                                            {activity.title}
                                        </p>
                                        <Badge className={`text-xs ${getStatusColor(activity.status)}`}>
                                            {activity.status}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        <span className="capitalize">{activity.type}</span>
                                        {activity.officer && (
                                            <>
                                                <span>•</span>
                                                <span>{activity.officer}</span>
                                            </>
                                        )}
                                        <span>•</span>
                                        <span>{formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}</span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </GlassCard>
    );
}
