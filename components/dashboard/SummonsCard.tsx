import { Badge } from "@/components/ui/Badge";
import { GlassCard } from "@/components/ui/GlassCard";
import { Summons } from "@/types";
import { format } from "date-fns";
import { Calendar, Clock, AlertCircle } from "lucide-react";

interface SummonsCardProps {
    summons: Summons;
    onClick?: () => void;
}

export function SummonsCard({ summons, onClick }: SummonsCardProps) {
    const statusVariant = {
        'Draft': 'secondary',
        'Issued and being served': 'info',
        'Served': 'success',
        'Requested Rescheduling': 'warning',
        'Rescheduled and communicated': 'warning',
        'No response': 'destructive',
        'Service Failed': 'destructive'
    } as const;

    const priorityColor = {
        'High': 'text-red-400',
        'Medium': 'text-amber-400',
        'Low': 'text-blue-400',
    };

    return (
        <GlassCard
            onClick={onClick}
            hoverEffect={true}
            className="flex flex-col gap-3 group border-l-4 border-l-transparent hover:border-l-primary"
        >
            <div className="flex justify-between items-start">
                <div className="flex flex-col">
                    <h3 className="font-semibold text-lg text-white group-hover:text-primary transition-colors">
                        {summons.person_name}
                    </h3>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <AlertCircle className={`w-3 h-3 ${priorityColor[summons.priority]}`} />
                        {summons.priority} Priority
                    </span>
                </div>
                <Badge variant={statusVariant[summons.status] || 'default'}>
                    {summons.status}
                </Badge>
            </div>

            <div className="space-y-1">
                {summons.issue_date && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>Issue: {format(new Date(summons.issue_date), 'MMM d, yyyy')}</span>
                    </div>
                )}
                {summons.appearance_date && (
                    <div className="flex items-center gap-2 text-sm text-white">
                        <Clock className="w-4 h-4 text-primary" />
                        <span>Appears: {format(new Date(summons.appearance_date), 'MMM d, yyyy h:mm a')}</span>
                    </div>
                )}
            </div>

            {summons.purpose && (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                    {summons.purpose}
                </p>
            )}
        </GlassCard>
    );
}
