"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { addSummonsAction, updateSummonsAction } from "@/app/actions";

import { useState } from "react";
import { ChevronDown, User, FileText, Calendar, Shield, Activity, Info, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { MultiSelect } from "@/components/ui/MultiSelect";
import {
    Summons,
    PERSON_ROLE_OPTIONS,
    PRIORITY_OPTIONS,
    TONE_OPTIONS,
    PURPOSE_OPTIONS,
    MODE_OF_SERVICE_OPTIONS,
    STATEMENT_STATUS_OPTIONS,
    SUMMONS_RESPONSE_OPTIONS,
    Case,
} from "@/lib/types";

// Schema with refined validation
const addSummonSchema = z.object({
    person_name: z.string().min(2, "Name is required"),
    person_role: z.string().optional(),
    case_id: z.string().min(1, "Case is required"),
    issue_date: z.string().optional(),
    appearance_date: z.string().optional(),
    rescheduled_date: z.string().optional(),
    priority: z.string().optional(),
    tone: z.string().optional(),
    mode_of_service: z.array(z.string()).optional(),
    purpose: z.array(z.string()).optional(),
    statement_status: z.string().optional(),
    summons_response: z.string().optional(),
    contact_number: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    notes: z.string().optional(),
    // Checkbox fields
    is_issued: z.boolean().optional(),
    is_served: z.boolean().optional(),
    requests_reschedule: z.boolean().optional(),
    statement_ongoing: z.boolean().optional(),
    statement_recorded: z.boolean().optional(),
    rescheduled_date_communicated: z.boolean().optional(),
    followup_required: z.boolean().optional(),
    // Statement dates
    date_of_1st_statement: z.string().optional(),
    date_of_2nd_statement: z.string().optional(),
    date_of_3rd_statement: z.string().optional(),
    served_date: z.string().optional(),
}).superRefine((data, ctx) => {
    // 1. IS ISSUED requires ISSUE DATE
    if (data.is_issued && !data.issue_date) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Issue Date is required when marked as Issued",
            path: ["issue_date"],
        });
    }

    // 2. IS SERVED requires IS ISSUED
    if (data.is_served && !data.is_issued) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Must be issued before it can be served",
            path: ["is_issued"],
        });
    }

    // 3. IS SERVED requires SERVED DATE
    if (data.is_served && !data.served_date) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Served Date is required when marked as Served",
            path: ["served_date"],
        });
    }

    // 4. IS SERVED requires MODE OF SERVICE
    if (data.is_served && (!data.mode_of_service || data.mode_of_service.length === 0)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Mode of Service is required when marked as Served",
            path: ["mode_of_service"],
        });
    }

    // 5. RESCHEDULE REQUESTED requires IS SERVED
    if (data.requests_reschedule && !data.is_served) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Cannot request reschedule if not served yet",
            path: ["requests_reschedule"],
        });
    }

    // 6. RESCHEDULE COMMUNICATED requires RESCHEDULED DATE
    if (data.rescheduled_date_communicated && !data.rescheduled_date) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Rescheduled Date must be set if communicated",
            path: ["rescheduled_date"],
        });
    }
});

export type AddSummonFormData = z.infer<typeof addSummonSchema>;

interface AddSummonFormProps {
    onSubmit?: (data: AddSummonFormData) => void;
    onCancel?: () => void;
    initialData?: Summons;
    cases?: Case[];
}

export function AddSummonForm({ onSubmit: propsOnSubmit, onCancel, initialData, cases = [] }: AddSummonFormProps) {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<AddSummonFormData>({
        resolver: zodResolver(addSummonSchema),
        defaultValues: initialData ? {
            person_name: initialData.person_name || '',
            person_role: initialData.person_role || '',
            case_id: initialData.case_id || '',
            issue_date: initialData.issue_date || '',
            appearance_date: initialData.appearance_date || '',
            rescheduled_date: initialData.rescheduled_date || '',
            mode_of_service: initialData.mode_of_service || [],
            purpose: initialData.purpose || [],
            tone: initialData.tone || '',
            priority: initialData.priority || 'Medium',
            statement_status: initialData.statement_status || '',
            summons_response: initialData.summons_response || '',
            contact_number: initialData.contact_number || '',
            email: initialData.email || '',
            notes: initialData.notes || '',
            is_issued: !!initialData.is_issued,
            is_served: !!initialData.is_served,
            requests_reschedule: !!initialData.requests_reschedule,
            statement_ongoing: !!initialData.statement_ongoing,
            statement_recorded: !!initialData.statement_recorded,
            rescheduled_date_communicated: !!initialData.rescheduled_date_communicated,
            followup_required: !!initialData.followup_required,
            date_of_1st_statement: initialData.date_of_1st_statement || '',
            date_of_2nd_statement: initialData.date_of_2nd_statement || '',
            date_of_3rd_statement: initialData.date_of_3rd_statement || '',
            served_date: initialData.served_date || '',
        } : {
            person_name: '',
            person_role: '',
            case_id: '',
            issue_date: '',
            appearance_date: '',
            rescheduled_date: '',
            priority: 'Medium',
            tone: '',
            mode_of_service: [],
            purpose: [],
            statement_status: '',
            summons_response: '',
            contact_number: '',
            email: '',
            notes: '',
            is_issued: false,
            is_served: false,
            requests_reschedule: false,
            statement_ongoing: false,
            statement_recorded: false,
            rescheduled_date_communicated: false,
            followup_required: false,
            date_of_1st_statement: '',
            date_of_2nd_statement: '',
            date_of_3rd_statement: '',
            served_date: '',
        }
    });

    const onSubmit = async (data: AddSummonFormData) => {
        try {
            if (propsOnSubmit) {
                await propsOnSubmit(data);
                return;
            }

            if (initialData) {
                await updateSummonsAction(initialData.id, data as Partial<Summons>);
            } else {
                const newSummon: Summons = {
                    ...data,
                    // eslint-disable-next-line react-hooks/purity
                    id: `sum-${Date.now()}`,
                    // eslint-disable-next-line react-hooks/purity
                    created_at: new Date().toISOString(),
                    status: 'Draft',
                } as Summons;
                await addSummonsAction(newSummon);
            }
            router.push('/summons');
            router.refresh();
        } catch (error: any) {
            console.error("Failed to save summons:", error);
        }
    };

    const handleCancel = () => {
        if (onCancel) {
            onCancel();
        } else {
            router.back();
        }
    };

    const modeOfServiceValue = watch('mode_of_service') || [];
    const purposeValue = watch('purpose') || [];

    const nextStep = () => setStep(s => Math.min(3, s + 1));
    const prevStep = () => setStep(s => Math.max(1, s - 1));

    const steps = [
        { id: 1, name: "Core Details", icon: <User size={16} /> },
        { id: 2, name: "Timeline", icon: <Calendar size={16} /> },
        { id: 3, name: "Finalize", icon: <Shield size={16} /> }
    ];

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pb-40 text-foreground">
            {/* Step Indicator */}
            <div className="flex items-center justify-between mb-8 bg-card p-2 rounded-2xl border border-border shadow-sm">
                {steps.map((s, i) => (
                    <div key={s.id} className="flex-1 flex items-center group">
                        <button
                            type="button"
                            onClick={() => setStep(s.id)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all w-full justify-center focus:outline-none focus:ring-2 focus:ring-primary/20",
                                step === s.id
                                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                                    : "text-muted-foreground hover:bg-muted/50"
                            )}
                        >
                            <span className={cn(
                                "w-6 h-6 rounded-lg flex items-center justify-center text-xs transition-colors",
                                step === s.id ? "bg-white/20" : "bg-muted group-hover:bg-border"
                            )}>
                                {s.id}
                            </span>
                            {s.name}
                        </button>
                        {i < steps.length - 1 && (
                            <div className="w-8 flex justify-center text-border">
                                <ChevronDown size={14} className="-rotate-90 text-muted-foreground" />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {step === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="rounded-xl border border-border bg-card shadow-sm p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                <User size={18} />
                            </div>
                            <h3 className="text-lg font-semibold tracking-tight">Person Information</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="person_name" className="text-muted-foreground">Name of Person *</Label>
                                <Input id="person_name" {...register('person_name')} placeholder="Full Name" className="bg-background" />
                                {errors.person_name && <p className="text-destructive text-xs mt-1">{errors.person_name.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="person_role" className="text-muted-foreground">Person Role</Label>
                                <Select id="person_role" {...register('person_role')} className="bg-background">
                                    <option value="">Select Role</option>
                                    {PERSON_ROLE_OPTIONS.map(role => (
                                        <option key={role} value={role}>{role}</option>
                                    ))}
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="contact_number" className="text-muted-foreground">Contact Number</Label>
                                <Input id="contact_number" {...register('contact_number')} placeholder="+91 XXXXX XXXXX" className="bg-background" />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-muted-foreground">Email</Label>
                                <Input type="email" id="email" {...register('email')} placeholder="email@example.com" className="bg-background" />
                                {errors.email && <p className="text-destructive text-xs mt-1">{errors.email.message}</p>}
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-border bg-card shadow-sm p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">
                                <FileText size={18} />
                            </div>
                            <h3 className="text-lg font-semibold tracking-tight">Case & Summons Details</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="case_id" className="text-muted-foreground">Case Reference *</Label>
                                <Select id="case_id" {...register('case_id')} className="bg-background">
                                    <option value="">Select Case</option>
                                    {cases.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} ({c.ecir_no})</option>
                                    ))}
                                </Select>
                                {errors.case_id && <p className="text-destructive text-xs mt-1">{errors.case_id.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="priority" className="text-muted-foreground">Priority</Label>
                                <Select id="priority" {...register('priority')} className="bg-background">
                                    {PRIORITY_OPTIONS.map(p => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="tone" className="text-muted-foreground">Tone Required</Label>
                                <Select id="tone" {...register('tone')} className="bg-background">
                                    <option value="">Select Tone</option>
                                    {TONE_OPTIONS.map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="summons_response" className="text-muted-foreground">Summons Response</Label>
                                <Select id="summons_response" {...register('summons_response')} className="bg-background">
                                    <option value="">Select Response</option>
                                    {SUMMONS_RESPONSE_OPTIONS.map(r => (
                                        <option key={r} value={r}>{r}</option>
                                    ))}
                                </Select>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="rounded-xl border border-border bg-card shadow-sm p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                                <Calendar size={18} />
                            </div>
                            <h3 className="text-lg font-semibold tracking-tight">Scheduling Details</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="issue_date" className="text-muted-foreground">Date of Summon Issue</Label>
                                <Input type="date" id="issue_date" {...register('issue_date')} className="bg-background" />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="appearance_date" className="text-muted-foreground">Scheduled Appearance Date</Label>
                                <Input type="date" id="appearance_date" {...register('appearance_date')} className="bg-background" />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="rescheduled_date" className="text-muted-foreground">Rescheduled Date</Label>
                                <Input type="date" id="rescheduled_date" {...register('rescheduled_date')} className="bg-background" />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-border bg-card shadow-sm p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500">
                                <Activity size={18} />
                            </div>
                            <h3 className="text-lg font-semibold tracking-tight">Statement Information</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="statement_status" className="text-muted-foreground">Statement Status</Label>
                                <Select id="statement_status" {...register('statement_status')} className="bg-background">
                                    <option value="">Select Status</option>
                                    {STATEMENT_STATUS_OPTIONS.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </Select>
                            </div>
                            <div></div>

                            <div className="space-y-2">
                                <Label htmlFor="date_of_1st_statement" className="text-muted-foreground">Date of 1st Statement</Label>
                                <Input type="date" id="date_of_1st_statement" {...register('date_of_1st_statement')} className="bg-background" />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="date_of_2nd_statement" className="text-muted-foreground">Date of 2nd Statement</Label>
                                <Input type="date" id="date_of_2nd_statement" {...register('date_of_2nd_statement')} className="bg-background" />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="date_of_3rd_statement" className="text-muted-foreground">Date of 3rd Statement</Label>
                                <Input type="date" id="date_of_3rd_statement" {...register('date_of_3rd_statement')} className="bg-background" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="rounded-xl border border-border bg-card shadow-sm p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                                <Shield size={18} />
                            </div>
                            <h3 className="text-lg font-semibold tracking-tight">Service & Purpose</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <MultiSelect
                                label="Mode of Service"
                                options={MODE_OF_SERVICE_OPTIONS}
                                selected={modeOfServiceValue}
                                onChange={(vals) => setValue('mode_of_service', vals, { shouldValidate: true })}
                            />
                            <MultiSelect
                                label="Purpose of Summons"
                                options={PURPOSE_OPTIONS}
                                selected={purposeValue}
                                onChange={(vals) => setValue('purpose', vals, { shouldValidate: true })}
                            />
                        </div>
                    </div>

                    <div className="rounded-xl border border-border bg-card shadow-sm p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500">
                                <Activity size={18} />
                            </div>
                            <h3 className="text-lg font-semibold tracking-tight">Status Flags</h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-6">
                            {[
                                { id: 'is_issued', label: 'Summon Issued' },
                                { id: 'is_served', label: 'Summon Served' },
                                { id: 'requests_reschedule', label: 'Reschedule Requested' },
                                { id: 'rescheduled_date_communicated', label: 'Date Communicated' },
                                { id: 'statement_ongoing', label: 'Statement Ongoing' },
                                { id: 'statement_recorded', label: 'Statement Recorded' },
                                { id: 'followup_required', label: 'Follow-up Required' },
                            ].map(flag => (
                                <div key={flag.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20 hover:border-primary/50 hover:bg-muted/40 transition-colors group cursor-pointer" onClick={() => setValue(flag.id as any, !watch(flag.id as any))}>
                                    <input
                                        type="checkbox"
                                        id={flag.id}
                                        {...register(flag.id as any)}
                                        className="w-5 h-5 accent-primary cursor-pointer rounded border-border"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                    <Label htmlFor={flag.id} className="mb-0 cursor-pointer text-foreground font-medium group-hover:text-primary transition-colors text-sm">{flag.label}</Label>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-xl border border-border bg-card shadow-sm p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 rounded-lg bg-slate-500/10 flex items-center justify-center text-slate-500">
                                <Info size={18} />
                            </div>
                            <h3 className="text-lg font-semibold tracking-tight">Notes</h3>
                        </div>
                        <textarea
                            id="notes"
                            {...register('notes')}
                            placeholder="Additional notes about this summons..."
                            className="w-full bg-background border border-border rounded-xl p-4 text-sm text-foreground min-h-[120px] resize-y focus:border-primary focus:ring-1 focus:ring-primary outline-none shadow-sm placeholder:text-muted-foreground"
                        />
                    </div>
                </div>
            )}

            {/* Form Actions */}
            <div className="fixed bottom-0 left-[var(--sidebar-width)] right-0 bg-background/95 backdrop-blur-md px-10 py-5 border-t border-border z-50 flex items-center justify-between gap-4 transition-all shadow-lg">
                <div className="flex flex-col gap-1">
                    <p className="text-xs text-muted-foreground italic">
                        * All changes are automatically synchronized with Notion.
                    </p>
                    <div className="flex gap-1">
                        {steps.map(s => (
                            <div key={s.id} className={cn("h-1 rounded-full transition-all", step === s.id ? "w-6 bg-primary" : "w-2 bg-border")} />
                        ))}
                    </div>
                </div>
                <div className="flex gap-4">
                    {step === 1 ? (
                        <Button type="button" variant="outline" onClick={handleCancel} className="h-11 px-6 rounded-xl border-border hover:bg-muted text-muted-foreground">
                            Cancel
                        </Button>
                    ) : (
                        <Button type="button" variant="outline" onClick={prevStep} className="h-11 px-6 rounded-xl border-border hover:bg-muted text-muted-foreground">
                            Back
                        </Button>
                    )}

                    {step < 3 ? (
                        <Button
                            type="button"
                            onClick={nextStep}
                            className="h-11 px-8 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md shadow-primary/20 active:scale-95 transition-all"
                        >
                            Continue
                        </Button>
                    ) : (
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="h-11 px-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20 transition-all transform active:scale-95 disabled:scale-100 disabled:opacity-70"
                        >
                            {isSubmitting ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="animate-spin h-4 w-4" />
                                    Saving...
                                </span>
                            ) : (
                                initialData ? 'Update Summons' : 'Create Summons'
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </form>
    );
}
