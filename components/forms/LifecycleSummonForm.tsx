'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    User, Calendar, CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { MultiSelect } from '@/components/ui/MultiSelect';
import {
    Case, Summons,
    PERSON_ROLE_OPTIONS, PRIORITY_OPTIONS, TONE_OPTIONS,
    MODE_OF_SERVICE_OPTIONS, PURPOSE_OPTIONS, STATEMENT_STATUS_OPTIONS,
    SUMMONS_RESPONSE_OPTIONS
} from '@/lib/types';
import { deriveStatusFromData } from '@/lib/summons-state-machine';

// ============ TYPES ============


// ============ SCHEMA ============
const lifecycleSchema = z.object({
    // Stage 1: Draft
    person_name: z.string().min(2, "Person name required"),
    person_role: z.string().optional(),
    case_id: z.string().min(1, "Case is required"),
    contact_number: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    priority: z.string().optional(),
    tone: z.string().optional(),
    purpose: z.array(z.string()).optional(),
    notes: z.string().optional(),

    // Stage 2: Issue & Service
    issue_date: z.string().optional(),
    mode_of_service: z.array(z.string()).optional(),
    served_date: z.string().optional(),

    // Stage 3: Appearance
    appearance_date: z.string().optional(),
    appearance_time: z.string().optional(),
    rescheduled_date: z.string().optional(),
    rescheduled_date_communicated: z.boolean().optional(),

    // Stage 4: Statement
    statement_status: z.string().optional(),
    date_of_1st_statement: z.string().optional(),
    date_of_2nd_statement: z.string().optional(),
    date_of_3rd_statement: z.string().optional(),

    // Stage 5: Closure
    followup_required: z.boolean().optional(),
    summons_response: z.string().optional(),
}).superRefine((data, ctx) => {
    // Helper to compare dates
    const parseDate = (d: string | undefined) => d ? new Date(d) : null;

    const issueDate = parseDate(data.issue_date);
    const servedDate = parseDate(data.served_date);
    const appearanceDate = parseDate(data.appearance_date);
    const statementDate = parseDate(data.date_of_1st_statement);

    // Issue & Service validation
    if (data.served_date && !data.issue_date) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Cannot have served date without issue date",
            path: ["served_date"],
        });
    }

    // Served date cannot be prior to issue date
    if (servedDate && issueDate && servedDate < issueDate) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Served date cannot be before issue date",
            path: ["served_date"],
        });
    }

    // Appearance validation  
    if (data.appearance_date && !data.served_date) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Cannot set appearance date without being served",
            path: ["appearance_date"],
        });
    }

    // Appearance date cannot be before serving date
    if (appearanceDate && servedDate && appearanceDate < servedDate) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Appearance date cannot be before served date",
            path: ["appearance_date"],
        });
    }

    if (data.rescheduled_date && !data.appearance_date) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Cannot reschedule without an original appearance date",
            path: ["rescheduled_date"],
        });
    }

    // Statement validation - must have appearance first
    if (data.date_of_1st_statement && !data.appearance_date) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Cannot record statement without appearance date",
            path: ["date_of_1st_statement"],
        });
    }

    // Statement date cannot be before appearance date
    if (statementDate && appearanceDate && statementDate < appearanceDate) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Statement cannot be recorded before appearance",
            path: ["date_of_1st_statement"],
        });
    }
});

type LifecycleFormData = z.infer<typeof lifecycleSchema>;

import { forwardRef, useImperativeHandle } from 'react';

// ... existing imports

interface LifecycleSummonFormProps {
    onSubmit?: (data: LifecycleFormData) => Promise<void>;
    onCancel?: () => void;
    initialData?: Partial<Summons>;
    cases?: Case[];
    options?: Record<string, any[]>;
    readOnly?: boolean;
}

export interface LifecycleSummonFormRef {
    submitForm: () => Promise<void>;
}

export const LifecycleSummonForm = forwardRef<LifecycleSummonFormRef, LifecycleSummonFormProps>(({
    onSubmit: propsOnSubmit,
    onCancel,
    initialData,
    cases = [],
    options = {},
    readOnly = false
}, ref) => {
    const router = useRouter();

    const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<LifecycleFormData>({
        // ... existing config
        resolver: zodResolver(lifecycleSchema),
        defaultValues: {
            // ... (same as before)
            person_name: initialData?.person_name ?? '',
            person_role: initialData?.person_role ?? '',
            case_id: initialData?.case_id ?? '',
            contact_number: initialData?.contact_number ?? '',
            email: initialData?.email ?? '',
            priority: initialData?.priority ?? 'Medium',
            tone: initialData?.tone ?? '',
            purpose: initialData?.purpose ?? [],
            notes: initialData?.notes ?? '',
            issue_date: initialData?.issue_date ?? '',
            mode_of_service: initialData?.mode_of_service ?? [],
            served_date: initialData?.served_date ?? '',
            appearance_date: initialData?.appearance_date ?? '',
            appearance_time: initialData?.appearance_time ?? '',
            rescheduled_date: initialData?.rescheduled_date ?? '',
            rescheduled_date_communicated: initialData?.rescheduled_date_communicated ?? false,
            statement_status: initialData?.statement_status ?? '',
            date_of_1st_statement: initialData?.date_of_1st_statement ?? '',
            date_of_2nd_statement: initialData?.date_of_2nd_statement ?? '',
            date_of_3rd_statement: initialData?.date_of_3rd_statement ?? '',
            followup_required: initialData?.followup_required ?? false,
            summons_response: initialData?.summons_response ?? '',
        }
    });

    const onSubmit = async (data: LifecycleFormData) => {
        try {
            if (propsOnSubmit) {
                await propsOnSubmit(data);
            }
            router.refresh();
            if (onCancel) {
                onCancel();
            }
        } catch (error) {
            console.error("Error submitting form:", error);
        }
    };

    useImperativeHandle(ref, () => ({
        submitForm: () => handleSubmit(onSubmit)()
    }));

    // Watched values for conditional rendering and derived state
    const modeOfServiceValue = watch('mode_of_service');
    const purposeValue = watch('purpose');
    const watchAppearanceDate = watch('appearance_date');
    const allValues = watch();

    // enhance validation status derived from current form state
    const currentStatus = useMemo(() => deriveStatusFromData(allValues as any), [allValues]);

    // Helper to render read-only text
    const ReadOnlyField = ({ value, fallback = '-' }: { value: string | number | undefined | null, fallback?: string }) => (
        <div className="min-h-[2.75rem] py-2 px-3 text-sm text-[var(--text-primary)] bg-transparent border-b border-[var(--border-subtle)]/50">
            {value || fallback}
        </div>
    );


    // ============ RENDER ============
    return (
        <form onSubmit={handleSubmit(onSubmit)} className="h-full flex flex-col gap-8 relative z-10 pb-20">
            {/* Sticky Action Bar */}
            <div className="sticky top-0 z-50 flex items-center justify-between bg-[var(--background)]/80 backdrop-blur-md p-4 -mx-4 px-8 border-b border-[var(--border)] transition-all duration-200">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Status</span>
                        <div className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${currentStatus === 'Closed' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                            currentStatus === 'Draft' ? 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' :
                                'bg-blue-500/10 text-blue-600 border-blue-500/20'
                            }`}>
                            {currentStatus.toUpperCase()}
                        </div>
                    </div>
                    {initialData?.id && (
                        <>
                            <div className="h-8 w-px bg-[var(--border)]" />
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Record ID</span>
                                <span className="text-sm font-mono text-[var(--text-primary)] mt-0.5">{initialData.id}</span>
                            </div>
                        </>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    {/* Only show Cancel/Save if NOT readOnly, OR if this is a new submisison */}
                    {!readOnly && (
                        <>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={onCancel}
                                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white shadow-lg shadow-[var(--primary)]/20 min-w-[120px]"
                            >
                                {isSubmitting ? 'Saving...' : 'Save Record'}
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Main Form Grid - Fluid Row-Based Flow */}
            <div className="grid grid-cols-12 gap-12 pb-12">

                {/* Section: Identity & Casework (Span 12 on mobile, 6 on md, 4 on xl) */}
                <div className="col-span-12 md:col-span-6 xl:col-span-4 flex flex-col gap-6">
                    <div className="flex items-center gap-2 pb-2 border-b border-[var(--border)]">
                        <User size={20} className="text-[var(--primary)]" />
                        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Identity Profile</h3>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="person_name" className="text-sm font-medium text-[var(--text-secondary)]">Target Individual <span className="text-red-500">*</span></Label>
                                {readOnly ? (
                                    <ReadOnlyField value={watch('person_name')} />
                                ) : (
                                    <>
                                        <Input
                                            id="person_name"
                                            {...register('person_name')}
                                            placeholder="Full Legal Name"
                                            className="h-11 bg-[var(--surface)] border-[var(--border-subtle)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] text-base"
                                        />
                                        {errors.person_name && <p className="text-xs text-red-500 mt-1">{errors.person_name.message}</p>}
                                    </>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="case_id" className="text-sm font-medium text-[var(--text-secondary)]">Case Ref <span className="text-red-500">*</span></Label>
                                    {readOnly ? (
                                        <ReadOnlyField value={cases.find(c => c.id === watch('case_id'))?.name || watch('case_id')} />
                                    ) : (
                                        <Select
                                            id="case_id"
                                            value={watch('case_id') || ''}
                                            onChange={(e) => setValue('case_id', e.target.value)}
                                            className="h-11 bg-[var(--surface)] border-[var(--border-subtle)]"
                                        >
                                            <option value="">Select...</option>
                                            {cases.map((c: any) => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </Select>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="person_role" className="text-sm font-medium text-[var(--text-secondary)]">Role</Label>
                                    {readOnly ? (
                                        <ReadOnlyField value={watch('person_role')} />
                                    ) : (
                                        <Select
                                            id="person_role"
                                            value={watch('person_role') || ''}
                                            onChange={(e) => setValue('person_role', e.target.value)}
                                            className="h-11 bg-[var(--surface)] border-[var(--border-subtle)]"
                                        >
                                            {PERSON_ROLE_OPTIONS.map((o: string) => (
                                                <option key={o} value={o}>{o}</option>
                                            ))}
                                        </Select>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border-subtle)]/50 pb-1">Contact Details</h4>
                            <div className="grid gap-4">
                                {readOnly ? (
                                    <>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-[var(--text-muted)]">Phone</Label>
                                            <ReadOnlyField value={watch('contact_number')} />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-[var(--text-muted)]">Email</Label>
                                            <ReadOnlyField value={watch('email')} />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <Input
                                            {...register('contact_number')}
                                            placeholder="Phone Number (+91...)"
                                            className="h-11 bg-[var(--surface)] border-[var(--border-subtle)]"
                                        />
                                        <Input
                                            {...register('email')}
                                            placeholder="Email Address"
                                            className="h-11 bg-[var(--surface)] border-[var(--border-subtle)]"
                                        />
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-[var(--text-secondary)]">Priority</Label>
                                {readOnly ? (
                                    <ReadOnlyField value={watch('priority')} />
                                ) : (
                                    <Select
                                        value={watch('priority') || 'Medium'}
                                        onChange={(e) => setValue('priority', e.target.value)}
                                        className="h-10 text-sm bg-[var(--surface)] border-[var(--border-subtle)]"
                                    >
                                        {PRIORITY_OPTIONS.map((o: string) => <option key={o} value={o}>{o}</option>)}
                                    </Select>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-[var(--text-secondary)]">Tone</Label>
                                {readOnly ? (
                                    <ReadOnlyField value={watch('tone')} />
                                ) : (
                                    <Select
                                        value={watch('tone') || ''}
                                        onChange={(e) => setValue('tone', e.target.value)}
                                        className="h-10 text-sm bg-[var(--surface)] border-[var(--border-subtle)]/60 text-[var(--text-secondary)]"
                                    >
                                        <option value="">Default</option>
                                        {TONE_OPTIONS.map((o: string) => <option key={o} value={o}>{o}</option>)}
                                    </Select>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-[var(--text-secondary)]">Context / Notes</Label>
                            {readOnly ? (
                                <div className="p-3 text-sm text-[var(--text-primary)] rounded-lg bg-[var(--surface-sunken)] min-h-[5rem] whitespace-pre-wrap">
                                    {watch('notes') || 'No notes available.'}
                                </div>
                            ) : (
                                <textarea
                                    {...register('notes')}
                                    rows={4}
                                    className="w-full p-3 text-sm rounded-lg bg-[var(--surface)] border border-[var(--border-subtle)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] resize-none transition-colors"
                                    placeholder="Add any relevant background info..."
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Section: Timeline & Logistics (Span 12 on mobile, 6 on md, 4 on xl) */}
                <div className="col-span-12 md:col-span-6 xl:col-span-4 flex flex-col gap-6">
                    <div className="flex items-center gap-2 pb-2 border-b border-[var(--border)]">
                        <Calendar size={20} className="text-indigo-500" />
                        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Timeline & Service</h3>
                    </div>

                    <div className="space-y-8">
                        {/* Issue & Service */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border-subtle)]/50 pb-1">Issuance</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-[var(--text-secondary)]">Issue Date</Label>
                                    {readOnly ? (
                                        <ReadOnlyField value={watch('issue_date')} />
                                    ) : (
                                        <Input type="date" {...register('issue_date')} className="h-11 bg-[var(--surface)] border-[var(--border-subtle)]" />
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-[var(--text-secondary)]">Served Date</Label>
                                    {readOnly ? (
                                        <ReadOnlyField value={watch('served_date')} />
                                    ) : (
                                        <Input type="date" {...register('served_date')} className="h-11 bg-[var(--surface)] border-[var(--border-subtle)]" />
                                    )}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-[var(--text-secondary)]">Mode of Service</Label>
                                {readOnly ? (
                                    <div className="flex flex-wrap gap-2 py-2">
                                        {modeOfServiceValue?.length ? modeOfServiceValue.map(m => (
                                            <span key={m} className="px-2 py-1 text-xs bg-[var(--surface-raised)] border border-[var(--border-subtle)] rounded-full text-[var(--text-secondary)]">
                                                {m}
                                            </span>
                                        )) : <span className="text-sm text-[var(--text-muted)]">-</span>}
                                    </div>
                                ) : (
                                    <MultiSelect
                                        options={MODE_OF_SERVICE_OPTIONS}
                                        selected={modeOfServiceValue || []}
                                        onChange={(val) => setValue('mode_of_service', val)}
                                        placeholder="Select modes..."
                                    />
                                )}
                            </div>
                        </div>

                        {/* Appearance */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border-subtle)]/50 pb-1">Appearance</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-[var(--text-secondary)]">Date</Label>
                                    {readOnly ? (
                                        <ReadOnlyField value={watch('appearance_date')} />
                                    ) : (
                                        <Input type="date" {...register('appearance_date')} className="h-11 bg-[var(--surface)] border-[var(--border-subtle)]" />
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-[var(--text-secondary)]">Time</Label>
                                    {readOnly ? (
                                        <ReadOnlyField value={watch('appearance_time')} />
                                    ) : (
                                        <Input type="time" {...register('appearance_time')} className="h-11 bg-[var(--surface)] border-[var(--border-subtle)]" />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Rescheduling */}
                        <div className={`space-y-4 transition-all duration-200 ${!watchAppearanceDate && !readOnly ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border-subtle)]/50 pb-1">Rescheduling</h4>
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-[var(--text-secondary)]">New Date</Label>
                                {readOnly ? (
                                    <ReadOnlyField value={watch('rescheduled_date')} />
                                ) : (
                                    <Input type="date" {...register('rescheduled_date')} className="h-11 bg-[var(--surface)] border-[var(--border-subtle)]" />
                                )}
                            </div>
                            <label className={"flex items-center gap-3 p-2 rounded-lg transition-colors " + (readOnly ? "" : "hover:bg-[var(--surface-sunken)] cursor-pointer")}>
                                <input
                                    type="checkbox"
                                    {...register('rescheduled_date_communicated')}
                                    disabled={readOnly}
                                    className="w-4 h-4 rounded border-gray-300 text-[var(--primary)] focus:ring-[var(--primary)]"
                                />
                                <span className="text-sm text-[var(--text-secondary)]">Date communicated to client?</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Section: Outcome & Closure (Span 12 on mobile, 12 on md (full width row), 4 on xl) */}
                <div className="col-span-12 md:col-span-12 xl:col-span-4 flex flex-col gap-6">
                    <div className="flex items-center gap-2 pb-2 border-b border-[var(--border)]">
                        <CheckCircle2 size={20} className="text-emerald-600" />
                        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Outcome & Closure</h3>
                    </div>

                    <div className="space-y-8">
                        {/* Statements */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border-subtle)]/50 pb-1">Statements</h4>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium text-[var(--text-muted)] w-12">1st</span>
                                    {readOnly ? (
                                        <ReadOnlyField value={watch('date_of_1st_statement')} />
                                    ) : (
                                        <Input type="date" {...register('date_of_1st_statement')} className="h-11 flex-1 bg-[var(--surface)] border-[var(--border-subtle)]" />
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium text-[var(--text-muted)] w-12">2nd</span>
                                    {readOnly ? (
                                        <ReadOnlyField value={watch('date_of_2nd_statement')} />
                                    ) : (
                                        <Input type="date" {...register('date_of_2nd_statement')} className="h-11 flex-1 bg-[var(--surface)] border-[var(--border-subtle)]" />
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium text-[var(--text-muted)] w-12">3rd</span>
                                    {readOnly ? (
                                        <ReadOnlyField value={watch('date_of_3rd_statement')} />
                                    ) : (
                                        <Input type="date" {...register('date_of_3rd_statement')} className="h-11 flex-1 bg-[var(--surface)] border-[var(--border-subtle)]" />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Status & Outcome */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border-subtle)]/50 pb-1">Result</h4>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-[var(--text-secondary)]">Statement Status</Label>
                                    {readOnly ? (
                                        <ReadOnlyField value={watch('statement_status')} />
                                    ) : (
                                        <Select
                                            value={watch('statement_status') || ''}
                                            onChange={(e) => setValue('statement_status', e.target.value)}
                                            className="h-11 bg-[var(--surface)] border-[var(--border-subtle)]"
                                        >
                                            <option value="">Select status...</option>
                                            {STATEMENT_STATUS_OPTIONS.map((o: string) => <option key={o} value={o}>{o}</option>)}
                                        </Select>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-[var(--text-secondary)]">Final Response</Label>
                                    {readOnly ? (
                                        <ReadOnlyField value={watch('summons_response')} />
                                    ) : (
                                        <Select
                                            value={watch('summons_response') || ''}
                                            onChange={(e) => setValue('summons_response', e.target.value)}
                                            className="h-11 bg-[var(--surface)] border-[var(--border-subtle)]"
                                        >
                                            <option value="">Select result...</option>
                                            {SUMMONS_RESPONSE_OPTIONS.map((o: string) => <option key={o} value={o}>{o}</option>)}
                                        </Select>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border-subtle)]/50 pb-1">Tags</h4>
                            {readOnly ? (
                                <div className="flex flex-wrap gap-2 py-2">
                                    {purposeValue?.length ? purposeValue.map(p => (
                                        <span key={p} className="px-2 py-1 text-xs bg-[var(--surface-raised)] border border-[var(--border-subtle)] rounded-full text-[var(--text-secondary)]">
                                            {p}
                                        </span>
                                    )) : <span className="text-sm text-[var(--text-muted)]">-</span>}
                                </div>
                            ) : (
                                <MultiSelect
                                    options={PURPOSE_OPTIONS}
                                    selected={purposeValue || []}
                                    onChange={(val) => setValue('purpose', val)}
                                    placeholder="Select purpose..."
                                />
                            )}
                        </div>

                        <div className="pt-2">
                            <label className={`flex items-start gap-3 p-3 rounded-lg ${readOnly ? '' : 'hover:bg-[var(--surface-sunken)] cursor-pointer'} transition-colors border border-transparent hover:border-[var(--border-subtle)]`}>
                                <input
                                    type="checkbox"
                                    {...register('followup_required')}
                                    disabled={readOnly}
                                    className="mt-0.5 w-5 h-5 rounded border-gray-300 text-[var(--primary)] focus:ring-[var(--primary)]"
                                />
                                <div>
                                    <span className="block text-sm font-medium text-[var(--text-primary)]">Follow-up Required</span>
                                    <span className="block text-xs text-[var(--text-secondary)] mt-0.5">Flag this case for further review.</span>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </form>
    );
});

export default LifecycleSummonForm;
