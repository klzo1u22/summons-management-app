'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    User, FileText, Calendar, MessageSquare, CheckCircle2,
    ChevronDown, ChevronUp, Lock, Check
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
type LifecycleStage = 'draft' | 'issue_service' | 'appearance' | 'statement' | 'closure';

interface StageConfig {
    id: LifecycleStage;
    label: string;
    icon: React.ReactNode;
    description: string;
}

const STAGES: StageConfig[] = [
    { id: 'draft', label: 'Draft', icon: <FileText size={18} />, description: 'Basic person and case details' },
    { id: 'issue_service', label: 'Issue & Service', icon: <Calendar size={18} />, description: 'Issue date, service mode, served date' },
    { id: 'appearance', label: 'Appearance', icon: <User size={18} />, description: 'Appearance and reschedule dates' },
    { id: 'statement', label: 'Statement', icon: <MessageSquare size={18} />, description: 'Statement recording dates' },
    { id: 'closure', label: 'Close', icon: <CheckCircle2 size={18} />, description: 'Follow-up and final notes' },
];

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

interface LifecycleSummonFormProps {
    onSubmit?: (data: LifecycleFormData) => Promise<void>;
    onCancel?: () => void;
    initialData?: Partial<Summons>;
    cases?: Case[];
    options?: Record<string, any[]>;
}

// ============ HELPER: Determine unlocked stages ============
function getUnlockedStages(data: Partial<LifecycleFormData>): Set<LifecycleStage> {
    const unlocked = new Set<LifecycleStage>(['draft']); // Always unlocked

    // Stage 2 unlocks if stage 1 has minimum required data
    if (data.person_name && data.case_id) {
        unlocked.add('issue_service');
    }

    // Stage 3 unlocks if stage 2 has served_date (or at least issue_date)
    if (data.served_date) {
        unlocked.add('appearance');
    }

    // Stage 4 unlocks if appearance exists or served
    if (data.appearance_date || data.served_date) {
        unlocked.add('statement');
    }

    // Stage 5 unlocks if any statement date exists
    if (data.date_of_1st_statement) {
        unlocked.add('closure');
    }

    return unlocked;
}

// ============ HELPER: Stage completion check ============
function isStageComplete(stage: LifecycleStage, data: Partial<LifecycleFormData>): boolean {
    switch (stage) {
        case 'draft':
            return !!(data.person_name && data.case_id);
        case 'issue_service':
            return !!(data.issue_date && data.served_date);
        case 'appearance':
            return !!(data.appearance_date);
        case 'statement':
            return !!(data.date_of_1st_statement);
        case 'closure':
            return data.followup_required !== undefined;
        default:
            return false;
    }
}

// ============ COMPONENT ============
export function LifecycleSummonForm({
    onSubmit: propsOnSubmit,
    onCancel,
    initialData,
    cases = [],
    options = {}
}: LifecycleSummonFormProps) {
    const router = useRouter();
    const [expandedStages, setExpandedStages] = useState<Set<LifecycleStage>>(new Set(['draft']));

    const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<LifecycleFormData>({
        resolver: zodResolver(lifecycleSchema),
        defaultValues: {
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

    // Watch specific fields to avoid broad re-renders
    const watchPersonName = watch('person_name');
    const watchCaseId = watch('case_id');
    const watchIssueDate = watch('issue_date');
    const watchServedDate = watch('served_date');
    const watchAppearanceDate = watch('appearance_date');
    const watchRescheduledDate = watch('rescheduled_date');
    const watch1stStatementDate = watch('date_of_1st_statement');
    const watchStatementStatus = watch('statement_status');
    const watchFollowupRequired = watch('followup_required');

    const unlockedStages = useMemo(() => {
        return getUnlockedStages({
            person_name: watchPersonName,
            case_id: watchCaseId,
            served_date: watchServedDate,
            appearance_date: watchAppearanceDate,
            date_of_1st_statement: watch1stStatementDate
        });
    }, [watchPersonName, watchCaseId, watchServedDate, watchAppearanceDate, watch1stStatementDate]);

    // Derive current status from data
    const currentStatus = useMemo(() => {
        return deriveStatusFromData({
            issue_date: watchIssueDate,
            served_date: watchServedDate,
            appearance_date: watchAppearanceDate,
            rescheduled_date: watchRescheduledDate,
            date_of_1st_statement: watch1stStatementDate,
            statement_status: watchStatementStatus,
            followup_required: watchFollowupRequired,
        });
    }, [watchIssueDate, watchServedDate, watchAppearanceDate, watchRescheduledDate, watch1stStatementDate, watchStatementStatus, watchFollowupRequired]);

    const formData = watch(); // Needed for stage completion checks in render

    // Toggle stage expansion
    const toggleStage = (stageId: LifecycleStage) => {
        if (!unlockedStages.has(stageId)) return; // Can't expand locked stages

        setExpandedStages(prev => {
            const next = new Set(prev);
            if (next.has(stageId)) {
                next.delete(stageId);
            } else {
                next.add(stageId);
            }
            return next;
        });
    };

    // Auto-expand current stage when it unlocks
    useEffect(() => {
        const lastUnlockedIndex = STAGES.reduce((acc, stage, idx) => {
            return unlockedStages.has(stage.id) ? idx : acc;
        }, 0);

        if (lastUnlockedIndex >= 0) {
            const currentStage = STAGES[lastUnlockedIndex];
            setExpandedStages(prev => {
                if (prev.has(currentStage.id)) return prev;
                const next = new Set(prev);
                next.add(currentStage.id);
                return next;
            });
        }
    }, [unlockedStages]);

    // Form submission
    const onSubmit = async (data: LifecycleFormData): Promise<void> => {
        if (propsOnSubmit) {
            await propsOnSubmit(data);
        }
        router.refresh();
        onCancel?.();
    };

    // Multi-select values
    const modeOfServiceValue = watch('mode_of_service') || [];
    const purposeValue = watch('purpose') || [];

    // ============ RENDER ============
    return (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
            {/* Status Badge */}
            <div className="px-6 py-3 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-[var(--text-secondary)]">Current Status:</span>
                    <span className="px-2 py-1 rounded text-xs font-medium bg-[var(--accent-primary)] text-white">
                        {currentStatus}
                    </span>
                </div>
            </div>

            {/* Stage Tracker (horizontal) */}
            <div className="px-6 py-4 border-b border-[var(--border-primary)]">
                <div className="flex items-center justify-between">
                    {STAGES.map((stage, idx) => {
                        const isUnlocked = unlockedStages.has(stage.id);
                        const isComplete = isStageComplete(stage.id, formData);

                        return (
                            <React.Fragment key={stage.id}>
                                <div className="flex flex-col items-center gap-1">
                                    <div
                                        className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-sm
                      transition-all duration-200
                      ${isComplete
                                                ? 'bg-green-500 text-white'
                                                : isUnlocked
                                                    ? 'bg-[var(--accent-primary)] text-white'
                                                    : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
                                            }
                    `}
                                    >
                                        {isComplete ? <Check size={14} /> : isUnlocked ? idx + 1 : <Lock size={12} />}
                                    </div>
                                    <span className={`text-xs ${isUnlocked ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                                        {stage.label}
                                    </span>
                                </div>
                                {idx < STAGES.length - 1 && (
                                    <div className={`flex-1 h-0.5 mx-2 ${isComplete ? 'bg-green-500' : 'bg-[var(--border-primary)]'}`} />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>

            {/* Scrollable Stages Area */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                {STAGES.map((stage) => {
                    const isUnlocked = unlockedStages.has(stage.id);
                    const isExpanded = expandedStages.has(stage.id);
                    const isComplete = isStageComplete(stage.id, formData);

                    return (
                        <div
                            key={stage.id}
                            className={`
                border rounded-lg transition-all duration-200
                ${isUnlocked
                                    ? 'border-[var(--border-primary)] bg-[var(--bg-primary)]'
                                    : 'border-[var(--border-secondary)] bg-[var(--bg-tertiary)] opacity-60'
                                }
              `}
                        >
                            {/* Stage Header */}
                            <button
                                type="button"
                                onClick={() => toggleStage(stage.id)}
                                disabled={!isUnlocked}
                                className={`
                  w-full px-4 py-3 flex items-center justify-between
                  ${isUnlocked ? 'cursor-pointer hover:bg-[var(--bg-secondary)]' : 'cursor-not-allowed'}
                  rounded-t-lg transition-colors
                `}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`
                    p-1.5 rounded
                    ${isComplete ? 'bg-green-500/20 text-green-500' : isUnlocked ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'}
                  `}>
                                        {isComplete ? <Check size={18} /> : stage.icon}
                                    </div>
                                    <div className="text-left">
                                        <div className="font-medium text-[var(--text-primary)]">{stage.label}</div>
                                        <div className="text-xs text-[var(--text-secondary)]">{stage.description}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {!isUnlocked && <Lock size={14} className="text-[var(--text-muted)]" />}
                                    {isUnlocked && (isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />)}
                                </div>
                            </button>

                            {/* Stage Content */}
                            {isUnlocked && isExpanded && (
                                <div className="px-4 pb-4 space-y-4 border-t border-[var(--border-secondary)]">
                                    {stage.id === 'draft' && (
                                        <div className="pt-4 grid grid-cols-2 gap-4">
                                            <div className="col-span-2">
                                                <Label htmlFor="person_name">Person Name <span className="text-red-500">*</span></Label>
                                                <Input
                                                    id="person_name"
                                                    {...register('person_name')}
                                                    placeholder="Full name of the person"
                                                />
                                                {errors.person_name && <p className="text-red-500 text-xs mt-1">{errors.person_name.message}</p>}
                                            </div>

                                            <div>
                                                <Label htmlFor="person_role">Role</Label>
                                                <Select
                                                    id="person_role"
                                                    value={watch('person_role') || ''}
                                                    onChange={(e) => setValue('person_role', e.target.value)}
                                                >
                                                    <option value="">Select role...</option>
                                                    {options.person_role ? options.person_role.map((o: any) => (
                                                        <option key={o.id} value={o.option_value}>{o.option_value}</option>
                                                    )) : PERSON_ROLE_OPTIONS.map((o: string) => (
                                                        <option key={o} value={o}>{o}</option>
                                                    ))}
                                                </Select>
                                            </div>

                                            <div>
                                                <Label htmlFor="case_id">Case <span className="text-red-500">*</span></Label>
                                                <Select
                                                    id="case_id"
                                                    value={watch('case_id') || ''}
                                                    onChange={(e) => setValue('case_id', e.target.value)}
                                                >
                                                    <option value="">Select case...</option>
                                                    {cases.map((c: any) => (
                                                        <option key={c.id} value={c.id}>{c.name}</option>
                                                    ))}
                                                </Select>
                                                {errors.case_id && <p className="text-red-500 text-xs mt-1">{errors.case_id.message}</p>}
                                            </div>

                                            <div>
                                                <Label htmlFor="contact_number">Contact Number</Label>
                                                <Input id="contact_number" {...register('contact_number')} placeholder="+91..." />
                                            </div>

                                            <div>
                                                <Label htmlFor="email">Email</Label>
                                                <Input id="email" type="email" {...register('email')} placeholder="email@example.com" />
                                                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                                            </div>

                                            <div>
                                                <Label htmlFor="priority">Priority</Label>
                                                <Select
                                                    id="priority"
                                                    value={watch('priority') || 'Medium'}
                                                    onChange={(e) => setValue('priority', e.target.value)}
                                                >
                                                    {options.priority ? options.priority.map((o: any) => (
                                                        <option key={o.id} value={o.option_value}>{o.option_value}</option>
                                                    )) : PRIORITY_OPTIONS.map((o: string) => (
                                                        <option key={o} value={o}>{o}</option>
                                                    ))}
                                                </Select>
                                            </div>

                                            <div>
                                                <Label htmlFor="tone">Tone</Label>
                                                <Select
                                                    id="tone"
                                                    value={watch('tone') || ''}
                                                    onChange={(e) => setValue('tone', e.target.value)}
                                                >
                                                    <option value="">Select tone...</option>
                                                    {options.tone ? options.tone.map((o: any) => (
                                                        <option key={o.id} value={o.option_value}>{o.option_value}</option>
                                                    )) : TONE_OPTIONS.map((o: string) => (
                                                        <option key={o} value={o}>{o}</option>
                                                    ))}
                                                </Select>
                                            </div>

                                            <div className="col-span-2">
                                                <MultiSelect
                                                    label="Purpose"
                                                    options={options.purpose ? options.purpose.map((o: any) => o.option_value) : PURPOSE_OPTIONS}
                                                    selected={purposeValue}
                                                    onChange={(val) => setValue('purpose', val)}
                                                    placeholder="Select purpose(s)..."
                                                />
                                            </div>

                                            <div className="col-span-2">
                                                <Label htmlFor="notes">Notes</Label>
                                                <textarea
                                                    id="notes"
                                                    {...register('notes')}
                                                    rows={2}
                                                    className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                                                    placeholder="Additional notes..."
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {stage.id === 'issue_service' && (
                                        <div className="pt-4 space-y-4">
                                            <div className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-secondary)]">
                                                <p className="text-sm text-[var(--text-secondary)]">
                                                    Fill in the issue date first, then select service mode and served date.
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <Label htmlFor="issue_date">Issue Date</Label>
                                                    <Input id="issue_date" type="date" {...register('issue_date')} />
                                                </div>

                                                <div>
                                                    <Label htmlFor="served_date">Served Date</Label>
                                                    <Input
                                                        id="served_date"
                                                        type="date"
                                                        {...register('served_date')}
                                                        disabled={!formData.issue_date}
                                                    />
                                                    {errors.served_date && <p className="text-red-500 text-xs mt-1">{errors.served_date.message}</p>}
                                                </div>

                                                <div className="col-span-2">
                                                    <MultiSelect
                                                        label="Mode of Service"
                                                        options={options.mode_of_service ? options.mode_of_service.map((o: any) => o.option_value) : MODE_OF_SERVICE_OPTIONS}
                                                        selected={modeOfServiceValue}
                                                        onChange={(val) => setValue('mode_of_service', val)}
                                                        placeholder="Select mode(s)..."
                                                    />
                                                </div>

                                                <div>
                                                    <Label htmlFor="summons_response">Summons Response</Label>
                                                    <Select
                                                        id="summons_response"
                                                        value={watch('summons_response') || ''}
                                                        onChange={(e) => setValue('summons_response', e.target.value)}
                                                    >
                                                        <option value="">Select response...</option>
                                                        {options.summons_response ? options.summons_response.map((o: any) => (
                                                            <option key={o.id} value={o.option_value}>{o.option_value}</option>
                                                        )) : SUMMONS_RESPONSE_OPTIONS.map((o: string) => (
                                                            <option key={o} value={o}>{o}</option>
                                                        ))}
                                                    </Select>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {stage.id === 'appearance' && (
                                        <div className="pt-4 grid grid-cols-2 gap-4">
                                            <div>
                                                <Label htmlFor="appearance_date">Appearance Date</Label>
                                                <Input id="appearance_date" type="date" {...register('appearance_date')} />
                                                {errors.appearance_date && <p className="text-red-500 text-xs mt-1">{errors.appearance_date.message}</p>}
                                            </div>

                                            <div>
                                                <Label htmlFor="appearance_time">Appearance Time</Label>
                                                <Input id="appearance_time" type="time" {...register('appearance_time')} />
                                            </div>

                                            <div>
                                                <Label htmlFor="rescheduled_date">Rescheduled Date</Label>
                                                <Input
                                                    id="rescheduled_date"
                                                    type="date"
                                                    {...register('rescheduled_date')}
                                                    disabled={!formData.appearance_date}
                                                />
                                                {errors.rescheduled_date && <p className="text-red-500 text-xs mt-1">{errors.rescheduled_date.message}</p>}
                                            </div>

                                            <div className="flex items-center gap-2 pt-6">
                                                <input
                                                    type="checkbox"
                                                    id="rescheduled_date_communicated"
                                                    {...register('rescheduled_date_communicated')}
                                                    disabled={!formData.rescheduled_date}
                                                    className="w-4 h-4 accent-[var(--accent-primary)]"
                                                />
                                                <Label htmlFor="rescheduled_date_communicated" className="mb-0 cursor-pointer">
                                                    Reschedule Communicated
                                                </Label>
                                            </div>
                                        </div>
                                    )}

                                    {stage.id === 'statement' && (
                                        <div className="pt-4 space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="col-span-2">
                                                    <Label htmlFor="statement_status">Statement Status</Label>
                                                    <Select
                                                        id="statement_status"
                                                        value={watch('statement_status') || ''}
                                                        onChange={(e) => setValue('statement_status', e.target.value)}
                                                    >
                                                        <option value="">Select status...</option>
                                                        {options.statement_status ? options.statement_status.map((o: any) => (
                                                            <option key={o.id} value={o.option_value}>{o.option_value}</option>
                                                        )) : STATEMENT_STATUS_OPTIONS.map((o: string) => (
                                                            <option key={o} value={o}>{o}</option>
                                                        ))}
                                                    </Select>
                                                </div>

                                                <div>
                                                    <Label htmlFor="date_of_1st_statement">1st Statement Date</Label>
                                                    <Input id="date_of_1st_statement" type="date" {...register('date_of_1st_statement')} />
                                                    {errors.date_of_1st_statement && <p className="text-red-500 text-xs mt-1">{errors.date_of_1st_statement.message}</p>}
                                                </div>

                                                <div>
                                                    <Label htmlFor="date_of_2nd_statement">2nd Statement Date</Label>
                                                    <Input
                                                        id="date_of_2nd_statement"
                                                        type="date"
                                                        {...register('date_of_2nd_statement')}
                                                        disabled={!formData.date_of_1st_statement}
                                                    />
                                                </div>

                                                <div>
                                                    <Label htmlFor="date_of_3rd_statement">3rd Statement Date</Label>
                                                    <Input
                                                        id="date_of_3rd_statement"
                                                        type="date"
                                                        {...register('date_of_3rd_statement')}
                                                        disabled={!formData.date_of_2nd_statement}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {stage.id === 'closure' && (
                                        <div className="pt-4 space-y-4">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    id="followup_required"
                                                    {...register('followup_required')}
                                                    className="w-4 h-4 accent-[var(--accent-primary)]"
                                                />
                                                <Label htmlFor="followup_required" className="mb-0 cursor-pointer">
                                                    Follow-up Required
                                                </Label>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)] flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : initialData?.id ? 'Update Summons' : 'Create Summons'}
                </Button>
            </div>
        </form>
    );
}

export default LifecycleSummonForm;
