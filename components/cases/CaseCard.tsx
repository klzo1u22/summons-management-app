import { Case } from "@/lib/types";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Users, FileText, AlertCircle, Clock } from "lucide-react";
import Link from "next/link";

interface CaseCardProps {
    data: Case;
}

export function CaseCard({ data }: CaseCardProps) {
    const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
        "Doing": "default",
        "To Do": "secondary",
        "On Hold": "outline",
        "Done": "outline" // Maybe green if I had it
    };

    return (
        <Link href={`/cases/${data.id}`}>
            <GlassCard className="h-full hover:scale-[1.02] transition-transform cursor-pointer group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <FileText className="w-24 h-24" />
                </div>

                <div className="flex justify-between items-start mb-4">
                    <Badge variant="outline" className="font-mono text-xs text-muted-foreground">
                        {data.ecir_no || 'NO ECIR'}
                    </Badge>
                    <Badge variant={statusColors[data.status] || "default"}>
                        {data.status}
                    </Badge>
                </div>

                <h3 className="text-xl font-bold mb-2 line-clamp-1 group-hover:text-primary transition-colors">
                    {data.name}
                </h3>

                <div className="space-y-3 mt-4">
                    {/* Stats Row */}
                    <div className="flex gap-4 text-sm">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                            <FileText className="w-4 h-4" />
                            <span>{data.total_summons || 0} Summons</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-amber-500/80">
                            <AlertCircle className="w-4 h-4" />
                            <span>{data.active_summons || 0} Active</span>
                        </div>
                    </div>

                    {/* Officers */}
                    {data.assigned_officer && data.assigned_officer.length > 0 && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                            <Users className="w-3.5 h-3.5" />
                            <span className="truncate">
                                {data.assigned_officer.join(", ")}
                            </span>
                        </div>
                    )}

                    {/* Footer Date */}
                    <div className="pt-4 mt-2 border-t border-white/5 flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Updated {new Date(data.last_edited).toLocaleDateString()}</span>
                    </div>
                </div>
            </GlassCard>
        </Link>
    );
}
