"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Label } from "@/components/ui/Label";
import { Case, CASE_STATUS_OPTIONS, ASSIGNED_OFFICER_OPTIONS, ACTIVITY_OPTIONS } from "@/lib/types";
import { updateCaseAction } from "@/app/actions";
import { Loader2 } from "lucide-react";

interface EditCaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    caseData: Case | null;
    onSuccess: () => void;
}

export function EditCaseModal({ isOpen, onClose, caseData, onSuccess }: EditCaseModalProps) {
    const [loading, setLoading] = useState(false);
    const { register, handleSubmit, reset, setValue, watch } = useForm();

    // Initialize form with case data
    useEffect(() => {
        if (caseData) {
            setValue("name", caseData.name);
            setValue("ecir_no", caseData.ecir_no || "");
            setValue("date_of_ecir", caseData.date_of_ecir || "");
            setValue("status", caseData.status);
            setValue("pao_amount", caseData.pao_amount || "");
            setValue("pao_date", caseData.pao_date || "");
            setValue("assigned_officer", caseData.assigned_officer || []);
            setValue("activity", caseData.activity || []);
            // New fields
            setValue("active", caseData.active ?? true);
            setValue("whether_pc_filed", caseData.whether_pc_filed ?? false);
            setValue("date_of_pc_filed", caseData.date_of_pc_filed || "");
            setValue("court_cognizance_date", caseData.court_cognizance_date || "");
            setValue("poc_in_cr", caseData.poc_in_cr || "");
        }
    }, [caseData, setValue]);

    const onSubmit = async (data: any) => {
        if (!caseData) return;

        setLoading(true);
        try {
            await updateCaseAction(caseData.id, {
                ...data,
                assigned_officer: data.assigned_officer || [],
                activity: data.activity || [],
            });
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Failed to update case:", error);
            alert("Failed to update case. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleMultiSelectChange = (field: string, value: string, checked: boolean) => {
        const currentValues = watch(field) || [];
        if (checked) {
            setValue(field, [...currentValues, value]);
        } else {
            setValue(field, currentValues.filter((v: string) => v !== value));
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Case Details" className="max-w-2xl">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-white/80 border-b border-white/10 pb-2">
                        Basic Information
                    </h3>

                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-white">Case Name / Title</Label>
                        <Input
                            id="name"
                            {...register("name", { required: true })}
                            placeholder="e.g. Investigation against XYZ"
                            className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="ecir_no" className="text-white">ECIR No.</Label>
                            <Input
                                id="ecir_no"
                                {...register("ecir_no")}
                                placeholder="ECIR/..."
                                className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="date_of_ecir" className="text-white">Date of ECIR</Label>
                            <Input
                                id="date_of_ecir"
                                type="date"
                                {...register("date_of_ecir")}
                                className="bg-white/10 border-white/20 text-white"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="status" className="text-white">Status</Label>
                        <Select
                            {...register("status")}
                            defaultValue={caseData?.status || "Doing"}
                            className="bg-white/10 border-white/20 text-white"
                        >
                            {CASE_STATUS_OPTIONS.map(opt => (
                                <option key={opt} value={opt} className="text-black">{opt}</option>
                            ))}
                        </Select>
                    </div>
                </div>

                {/* Activity & Assignment */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-white/80 border-b border-white/10 pb-2">
                        Activity & Assignment
                    </h3>

                    <div className="space-y-2">
                        <Label className="text-white">Activity (Multi-select)</Label>
                        <div className="grid grid-cols-2 gap-2 p-3 bg-white/5 rounded-lg border border-white/10">
                            {ACTIVITY_OPTIONS.map((activity) => (
                                <label key={activity} className="flex items-center gap-2 text-sm text-white/80 cursor-pointer hover:text-white">
                                    <input
                                        type="checkbox"
                                        checked={(watch("activity") || []).includes(activity)}
                                        onChange={(e) => handleMultiSelectChange("activity", activity, e.target.checked)}
                                        className="rounded border-white/20 bg-white/10 text-primary focus:ring-primary/50"
                                    />
                                    {activity}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-white">Assigned Officer (Multi-select)</Label>
                        <div className="grid grid-cols-2 gap-2 p-3 bg-white/5 rounded-lg border border-white/10">
                            {ASSIGNED_OFFICER_OPTIONS.map((officer) => (
                                <label key={officer} className="flex items-center gap-2 text-sm text-white/80 cursor-pointer hover:text-white">
                                    <input
                                        type="checkbox"
                                        checked={(watch("assigned_officer") || []).includes(officer)}
                                        onChange={(e) => handleMultiSelectChange("assigned_officer", officer, e.target.checked)}
                                        className="rounded border-white/20 bg-white/10 text-primary focus:ring-primary/50"
                                    />
                                    {officer}
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {/* PAO Information */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-white/80 border-b border-white/10 pb-2">
                        PAO Information
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="pao_amount" className="text-white">PAO Amount</Label>
                            <Input
                                id="pao_amount"
                                {...register("pao_amount")}
                                placeholder="₹ Amount"
                                className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="pao_date" className="text-white">PAO Date</Label>
                            <Input
                                id="pao_date"
                                type="date"
                                {...register("pao_date")}
                                className="bg-white/10 border-white/20 text-white"
                            />
                        </div>
                    </div>
                </div>

                {/* Prosecution & Court Details */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-white/80 border-b border-white/10 pb-2">
                        Prosecution & Court Details
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="date_of_pc_filed" className="text-white">Date of PC Filed</Label>
                            <Input
                                id="date_of_pc_filed"
                                type="date"
                                {...register("date_of_pc_filed")}
                                className="bg-white/10 border-white/20 text-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="court_cognizance_date" className="text-white">Court Cognizance Date</Label>
                            <Input
                                id="court_cognizance_date"
                                type="date"
                                {...register("court_cognizance_date")}
                                className="bg-white/10 border-white/20 text-white"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="poc_in_cr" className="text-white">POC in Cr</Label>
                        <Input
                            id="poc_in_cr"
                            {...register("poc_in_cr")}
                            placeholder="POC details..."
                            className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                        />
                    </div>

                    <div className="flex gap-6 p-3 bg-white/5 rounded-lg border border-white/10">
                        <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer hover:text-white">
                            <input
                                type="checkbox"
                                {...register("active")}
                                className="rounded border-white/20 bg-white/10 text-primary focus:ring-primary/50"
                            />
                            Case Active
                        </label>
                        <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer hover:text-white">
                            <input
                                type="checkbox"
                                {...register("whether_pc_filed")}
                                className="rounded border-white/20 bg-white/10 text-primary focus:ring-primary/50"
                            />
                            Whether PC Filed
                        </label>
                    </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onClose}
                        disabled={loading}
                        className="text-white hover:bg-white/10"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={loading}
                        className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        Save Changes
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
