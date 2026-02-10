"use client";

import { useEffect, useState } from "react";
import { getCaseDetailsAction, updateSummonsAction } from "@/app/actions";
import { Case, Summons } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, FileText, Calendar, Users, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { SummonsTable } from "@/components/dashboard/SummonsTable"; // Reuse table
import { useParams } from "next/navigation";

export default function CaseDetailsPage() {
    const params = useParams();
    const id = params?.id as string;

    const [caseData, setCaseData] = useState<Case | null>(null);
    const [summons, setSummons] = useState<Summons[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) loadData();
    }, [id]);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await getCaseDetailsAction(id);
            if (data) {
                setCaseData(data.case);
                setSummons(data.summons);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleInlineUpdate = async (id: string, updates: Partial<Summons>) => {
        try {
            await updateSummonsAction(id, updates);
            await loadData();
        } catch (error) {
            console.error("Failed to update summons:", error);
            alert("Failed to update record.");
        }
    };

    if (loading) return <div className="p-10 text-center">Loading case details...</div>;
    if (!caseData) return <div className="p-10 text-center">Case not found.</div>;

    const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
        "Doing": "default",
        "To Do": "secondary",
        "On Hold": "outline",
        "Done": "outline"
    };

    return (
        <div className="min-h-screen bg-background pb-20 font-sans">
            <div className="container-xl px-6 py-8">
                {/* Back Link */}
                <Link href="/cases" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mb-6 transition-colors w-fit">
                    <ArrowLeft className="w-3 h-3" /> Back to Cases
                </Link>

                {/* Header Card */}
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8 mb-8 shadow-xl">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <Badge variant="outline" className="font-mono">{caseData.ecir_no || 'NO ECIR'}</Badge>
                                <Badge variant={statusColors[caseData.status] || "default"}>{caseData.status}</Badge>
                            </div>
                            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                                {caseData.name}
                            </h1>
                        </div>
                        <div className="flex gap-2">
                            {/* Future: Edit/Delete Actions */}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                        <div className="space-y-1">
                            <h4 className="text-muted-foreground flex items-center gap-2">
                                <Users className="w-4 h-4" /> Assigned Officers
                            </h4>
                            <div className="font-medium">
                                {caseData.assigned_officer?.length ? caseData.assigned_officer.join(", ") : "Unassigned"}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-muted-foreground flex items-center gap-2">
                                <Calendar className="w-4 h-4" /> Created Date
                            </h4>
                            <div className="font-medium">
                                {new Date(caseData.created_at).toLocaleDateString()}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-muted-foreground flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" /> Last Activity
                            </h4>
                            <div className="font-medium">
                                {new Date(caseData.last_edited).toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Summons Section */}
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" />
                            Related Summons ({summons.length})
                        </h2>
                    </div>

                    {/* Reuse SummonsTable but hide case column if possible, or just standard view */}
                    <div className="bg-background border border-border rounded-xl overflow-hidden shadow-sm">
                        <SummonsTable
                            summons={summons as any}
                            currentTab="All Summons"
                            onTabChange={() => { }}
                            searchTerm=""
                            onSearchChange={() => { }}
                            onView={(id) => window.open(`/summons/${id}`, '_blank')}
                            onEdit={() => { }}
                            onDelete={() => { }}
                            hideControls={true}
                            onExportCSV={() => { }}
                            onExportPDF={() => { }}
                            onInlineUpdate={handleInlineUpdate}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
