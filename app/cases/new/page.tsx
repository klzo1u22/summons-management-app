"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addCaseAction } from "@/app/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { GlassCard } from "@/components/ui/GlassCard";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import Link from "next/link";
import { Case } from "@/lib/types";

export default function NewCasePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        ecir_no: "",
        date_of_ecir: "",
        status: "To Do",
        assigned_officer: "", // Split by comma
        pao_amount: "",
        pao_date: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) return;

        setLoading(true);
        try {
            const id = crypto.randomUUID();
            const now = new Date().toISOString();

            const newCase: Case = {
                id,
                name: formData.name,
                ecir_no: formData.ecir_no,
                date_of_ecir: formData.date_of_ecir,
                status: formData.status,
                assigned_officer: formData.assigned_officer.split(",").map(s => s.trim()).filter(Boolean),
                activity: [],
                pao_amount: formData.pao_amount,
                pao_date: formData.pao_date,
                created_at: now,
                last_edited: now,
                total_summons: 0,
                active_summons: 0
            };

            await addCaseAction(newCase);
            router.push(`/cases/${id}`);
        } catch (error) {
            console.error("Failed to create case:", error);
            alert("Failed to create case. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background pb-20 font-sans">
            <div className="container px-6 py-8 max-w-2xl mx-auto">
                <Link href="/cases" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mb-6 transition-colors w-fit">
                    <ArrowLeft className="w-3 h-3" /> Back to Cases
                </Link>

                <div className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                        Create New Case
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Enter the details for the new case below.
                    </p>
                </div>

                <GlassCard className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Case Name</label>
                            <Input
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="e.g. ECIR vs XYZ Company"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">ECIR Number</label>
                                <Input
                                    name="ecir_no"
                                    value={formData.ecir_no}
                                    onChange={handleChange}
                                    placeholder="ECIR/..."
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">Date of ECIR</label>
                                <Input
                                    type="date"
                                    name="date_of_ecir"
                                    value={formData.date_of_ecir}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Status</label>
                            <Select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                            >
                                <option value="To Do">To Do</option>
                                <option value="Doing">Doing</option>
                                <option value="On Hold">On Hold</option>
                                <option value="Done">Done</option>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Assigned Officers (comma separated)</label>
                            <Input
                                name="assigned_officer"
                                value={formData.assigned_officer}
                                onChange={handleChange}
                                placeholder="Officer A, Officer B"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">PAO Amount</label>
                                <Input
                                    name="pao_amount"
                                    value={formData.pao_amount}
                                    onChange={handleChange}
                                    placeholder="Amount"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">PAO Date</label>
                                <Input
                                    type="date"
                                    name="pao_date"
                                    value={formData.pao_date}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <Button type="submit" disabled={loading} className="gap-2 min-w-[120px]">
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {loading ? "Creating..." : "Create Case"}
                            </Button>
                        </div>
                    </form>
                </GlassCard>
            </div>
        </div>
    );
}
