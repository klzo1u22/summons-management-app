'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { useRouter } from 'next/navigation';
import { useState, CSSProperties } from 'react';
import {
    User, Calendar, Shield, FileText, Clock, Activity,
    ChevronRight, CheckCircle2, Loader2, AlertCircle,
    ArrowLeft, ArrowRight, Sparkles
} from 'lucide-react';

// Constants
const MODE_OF_SERVICE_OPTIONS = [
    'In Person', 'By Mail', 'Electronic', 'Substituted Service', 'Posted'
];

const PURPOSE_OPTIONS = [
    'Court Appearance', 'Deposition', 'Document Production', 'Witness Testimony', 'Other'
];

const STATEMENT_STATUS_OPTIONS = [
    'Pending', 'Scheduled', 'Completed', 'Cancelled', 'Rescheduled'
];

// Schema
const addSummonSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    case_id: z.string().optional(),
    date_of_summon_issue: z.string().optional(),
    rescheduled_date: z.string().optional(),
    served_date: z.string().optional(),
    statement_status: z.string().optional(),
    date_of_1st_statement: z.string().optional(),
    date_of_2nd_statement: z.string().optional(),
    date_of_3rd_statement: z.string().optional(),
    mode_of_service: z.array(z.string()).optional(),
    purpose: z.array(z.string()).optional(),
    is_issued: z.boolean().optional(),
    is_served: z.boolean().optional(),
    requests_reschedule: z.boolean().optional(),
    rescheduled_date_communicated: z.boolean().optional(),
    statement_ongoing: z.boolean().optional(),
    statement_recorded: z.boolean().optional(),
    followup_required: z.boolean().optional(),
    notes: z.string().optional(),
}).refine(data => {
    if (data.is_served && !data.is_issued) return false;
    return true;
}, { message: "Summon must be issued before it can be served", path: ["is_issued"] })
    .refine(data => {
        if (data.requests_reschedule && !data.rescheduled_date) return false;
        return true;
    }, { message: "Rescheduled date is required when reschedule is requested", path: ["requests_reschedule"] });

export type AddSummonFormData = z.infer<typeof addSummonSchema>;

interface CaseOption {
    id: string;
    name: string;
}

// Allow null values in initialData (from database) which we'll convert to undefined
type NullablePartial<T> = { [P in keyof T]?: T[P] | null };

interface AddSummonFormProps {
    onSubmit?: (data: AddSummonFormData) => void;
    onCancel?: () => void;
    initialData?: NullablePartial<AddSummonFormData> & { id?: string };
    cases?: CaseOption[];
}

// Design System Styles
const styles = {
    // Base form container
    form: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '2rem',
        paddingBottom: '8rem',
        maxWidth: '1000px',
        margin: '0 auto',
    },

    // Step indicator container
    stepIndicator: {
        display: 'flex',
        justifyContent: 'center',
        gap: '0.5rem',
        padding: '1.5rem',
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(99, 102, 241, 0.02) 100%)',
        borderRadius: '1rem',
        border: '1px solid var(--border)',
    },

    stepItem: (isActive: boolean, isComplete: boolean) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.75rem 1.25rem',
        borderRadius: '0.75rem',
        background: isActive
            ? 'linear-gradient(135deg, var(--primary) 0%, rgba(99, 102, 241, 0.8) 100%)'
            : isComplete
                ? 'rgba(34, 197, 94, 0.15)'
                : 'var(--surface)',
        border: `1px solid ${isActive ? 'var(--primary)' : isComplete ? 'rgba(34, 197, 94, 0.3)' : 'var(--border)'}`,
        color: isActive ? '#fff' : 'var(--text-primary)',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        boxShadow: isActive ? '0 4px 20px rgba(99, 102, 241, 0.3)' : 'none',
    } as CSSProperties),

    stepNumber: (isActive: boolean, isComplete: boolean) => ({
        width: '2rem',
        height: '2rem',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.875rem',
        fontWeight: '600',
        background: isActive
            ? 'rgba(255, 255, 255, 0.2)'
            : isComplete
                ? 'rgba(34, 197, 94, 0.2)'
                : 'var(--surface-hover)',
        color: isComplete ? 'rgb(34, 197, 94)' : 'inherit',
    } as CSSProperties),

    stepLabel: {
        fontWeight: '500',
        fontSize: '0.9rem',
    },

    stepConnector: (isComplete: boolean) => ({
        width: '2rem',
        height: '2px',
        background: isComplete
            ? 'linear-gradient(90deg, rgb(34, 197, 94), rgba(34, 197, 94, 0.3))'
            : 'var(--border)',
        borderRadius: '2px',
        alignSelf: 'center' as const,
    }),

    // Card styles
    card: {
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '1rem',
        overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.1)',
    },

    cardHeader: (gradient: string) => ({
        padding: '1.25rem 1.5rem',
        background: gradient,
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
    } as CSSProperties),

    cardIconWrapper: (color: string) => ({
        width: '2.75rem',
        height: '2.75rem',
        borderRadius: '0.75rem',
        background: `${color}20`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: color,
    } as CSSProperties),

    cardTitle: {
        fontSize: '1.125rem',
        fontWeight: '600',
        color: 'var(--text-primary)',
        letterSpacing: '-0.01em',
    },

    cardSubtitle: {
        fontSize: '0.875rem',
        color: 'var(--text-secondary)',
        marginTop: '0.125rem',
    },

    cardBody: {
        padding: '1.5rem',
    },

    // Grid layouts
    grid2: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '1.25rem',
    },

    grid3: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1.25rem',
    },

    // Form field wrapper
    fieldWrapper: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '0.5rem',
    },

    // Label style
    label: {
        fontSize: '0.875rem',
        fontWeight: '500',
        color: 'var(--text-primary)',
    },

    // Input style
    input: {
        height: '2.75rem',
        background: 'var(--background)',
        border: '1px solid var(--border)',
        borderRadius: '0.5rem',
        padding: '0 1rem',
        fontSize: '0.9375rem',
        color: 'var(--text-primary)',
        outline: 'none',
        transition: 'all 0.2s ease',
        width: '100%',
    },

    // Select style
    select: {
        height: '2.75rem',
        background: 'var(--background)',
        border: '1px solid var(--border)',
        borderRadius: '0.5rem',
        padding: '0 1rem',
        fontSize: '0.9375rem',
        color: 'var(--text-primary)',
        outline: 'none',
        width: '100%',
        cursor: 'pointer',
    },

    // Textarea style
    textarea: {
        background: 'var(--background)',
        border: '1px solid var(--border)',
        borderRadius: '0.75rem',
        padding: '1rem',
        fontSize: '0.9375rem',
        color: 'var(--text-primary)',
        outline: 'none',
        resize: 'vertical' as const,
        minHeight: '8rem',
        width: '100%',
        fontFamily: 'inherit',
    },

    // Toggle switch container
    toggleCard: (isActive: boolean) => ({
        padding: '1rem 1.25rem',
        background: isActive ? 'rgba(99, 102, 241, 0.1)' : 'var(--background)',
        border: `1px solid ${isActive ? 'var(--primary)' : 'var(--border)'}`,
        borderRadius: '0.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    } as CSSProperties),

    toggleLabel: {
        fontWeight: '500',
        fontSize: '0.9375rem',
        color: 'var(--text-primary)',
    },

    toggleDescription: {
        fontSize: '0.8125rem',
        color: 'var(--text-secondary)',
        marginTop: '0.25rem',
    },

    toggleSwitch: (isActive: boolean) => ({
        width: '3rem',
        height: '1.625rem',
        borderRadius: '1rem',
        background: isActive ? 'var(--primary)' : 'var(--surface-hover)',
        position: 'relative' as const,
        transition: 'all 0.2s ease',
        flexShrink: 0,
    }),

    toggleKnob: (isActive: boolean) => ({
        width: '1.25rem',
        height: '1.25rem',
        borderRadius: '50%',
        background: '#fff',
        position: 'absolute' as const,
        top: '0.1875rem',
        left: isActive ? 'calc(100% - 1.4375rem)' : '0.1875rem',
        transition: 'all 0.2s ease',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
    }),

    // Error message
    error: {
        fontSize: '0.8125rem',
        color: 'var(--error)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.375rem',
    },

    // Footer
    footer: {
        position: 'fixed' as const,
        bottom: 0,
        left: 'var(--sidebar-width, 0)',
        right: 0,
        background: 'var(--background)',
        borderTop: '1px solid var(--border)',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backdropFilter: 'blur(12px)',
        zIndex: 50,
    },

    footerProgress: {
        display: 'flex',
        gap: '0.375rem',
    },

    footerDot: (isActive: boolean, isComplete: boolean) => ({
        width: isActive ? '1.5rem' : '0.5rem',
        height: '0.5rem',
        borderRadius: '0.25rem',
        background: isActive ? 'var(--primary)' : isComplete ? 'rgba(99, 102, 241, 0.5)' : 'var(--border)',
        transition: 'all 0.3s ease',
    }),

    footerButtons: {
        display: 'flex',
        gap: '0.75rem',
    },

    buttonOutline: {
        height: '2.75rem',
        padding: '0 1.5rem',
        borderRadius: '0.75rem',
        border: '1px solid var(--border)',
        background: 'transparent',
        color: 'var(--text-primary)',
        fontSize: '0.9375rem',
        fontWeight: '500',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        transition: 'all 0.2s ease',
    },

    buttonPrimary: {
        height: '2.75rem',
        padding: '0 1.75rem',
        borderRadius: '0.75rem',
        border: 'none',
        background: 'linear-gradient(135deg, var(--primary) 0%, rgba(99, 102, 241, 0.85) 100%)',
        color: '#fff',
        fontSize: '0.9375rem',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        transition: 'all 0.2s ease',
        boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)',
    },
};

// Custom Toggle Component
function Toggle({
    label,
    description,
    checked,
    onChange
}: {
    label: string;
    description: string;
    checked: boolean;
    onChange: (value: boolean) => void;
}) {
    return (
        <div
            style={styles.toggleCard(checked)}
            onClick={() => onChange(!checked)}
        >
            <div>
                <div style={styles.toggleLabel}>{label}</div>
                <div style={styles.toggleDescription}>{description}</div>
            </div>
            <div style={styles.toggleSwitch(checked)}>
                <div style={styles.toggleKnob(checked)} />
            </div>
        </div>
    );
}

export function AddSummonForm({ onSubmit: propsOnSubmit, onCancel, initialData, cases = [] }: AddSummonFormProps) {
    const router = useRouter();
    const [step, setStep] = useState(1);

    // Convert null values to undefined for form compatibility
    const cleanInitialData = initialData ? Object.fromEntries(
        Object.entries(initialData).map(([key, value]) => [key, value === null ? undefined : value])
    ) as Partial<AddSummonFormData> : {};

    const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<AddSummonFormData>({
        resolver: zodResolver(addSummonSchema),
        defaultValues: {
            name: '',
            case_id: '',
            is_issued: false,
            is_served: false,
            requests_reschedule: false,
            rescheduled_date_communicated: false,
            statement_ongoing: false,
            statement_recorded: false,
            followup_required: false,
            mode_of_service: [],
            purpose: [],
            ...cleanInitialData,
        },
    });

    const modeOfServiceValue = watch('mode_of_service') || [];
    const purposeValue = watch('purpose') || [];

    const onSubmit = async (data: AddSummonFormData) => {
        if (propsOnSubmit) {
            propsOnSubmit(data);
        }
    };

    const handleCancel = () => {
        if (onCancel) {
            onCancel();
        } else {
            router.back();
        }
    };

    const nextStep = () => setStep(s => Math.min(s + 1, 3));
    const prevStep = () => setStep(s => Math.max(s - 1, 1));

    const stepData = [
        { id: 1, label: 'Person & Case', icon: User },
        { id: 2, label: 'Timeline', icon: Calendar },
        { id: 3, label: 'Finalize', icon: Shield },
    ];

    return (
        <form onSubmit={handleSubmit(onSubmit)} style={styles.form}>
            {/* Step Indicator */}
            <div style={styles.stepIndicator}>
                {stepData.map((s, idx) => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center' }}>
                        <div
                            style={styles.stepItem(step === s.id, step > s.id)}
                            onClick={() => setStep(s.id)}
                        >
                            <div style={styles.stepNumber(step === s.id, step > s.id)}>
                                {step > s.id ? <CheckCircle2 size={16} /> : s.id}
                            </div>
                            <span style={styles.stepLabel}>{s.label}</span>
                        </div>
                        {idx < stepData.length - 1 && (
                            <div style={styles.stepConnector(step > s.id)} />
                        )}
                    </div>
                ))}
            </div>

            {/* Step 1: Person & Case */}
            {step === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Person Information Card */}
                    <div style={styles.card}>
                        <div style={styles.cardHeader('linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(99, 102, 241, 0.03) 100%)')}>
                            <div style={styles.cardIconWrapper('#6366f1')}>
                                <User size={20} />
                            </div>
                            <div>
                                <div style={styles.cardTitle}>Person Information</div>
                                <div style={styles.cardSubtitle}>Enter the details of the person being summoned</div>
                            </div>
                        </div>
                        <div style={styles.cardBody}>
                            <div style={styles.fieldWrapper}>
                                <label style={styles.label}>Full Name *</label>
                                <input
                                    type="text"
                                    {...register('name')}
                                    placeholder="Enter full legal name"
                                    style={styles.input}
                                />
                                {errors.name && (
                                    <div style={styles.error}>
                                        <AlertCircle size={14} />
                                        {errors.name.message}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Case Details Card */}
                    <div style={styles.card}>
                        <div style={styles.cardHeader('linear-gradient(135deg, rgba(168, 85, 247, 0.12) 0%, rgba(168, 85, 247, 0.03) 100%)')}>
                            <div style={styles.cardIconWrapper('#a855f7')}>
                                <FileText size={20} />
                            </div>
                            <div>
                                <div style={styles.cardTitle}>Case Details</div>
                                <div style={styles.cardSubtitle}>Link this summons to a case</div>
                            </div>
                        </div>
                        <div style={styles.cardBody}>
                            <div style={styles.fieldWrapper}>
                                <label style={styles.label}>Associated Case</label>
                                <select {...register('case_id')} style={styles.select}>
                                    <option value="">Select a case...</option>
                                    {cases.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 2: Timeline */}
            {step === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Important Dates Card */}
                    <div style={styles.card}>
                        <div style={styles.cardHeader('linear-gradient(135deg, rgba(14, 165, 233, 0.12) 0%, rgba(14, 165, 233, 0.03) 100%)')}>
                            <div style={styles.cardIconWrapper('#0ea5e9')}>
                                <Calendar size={20} />
                            </div>
                            <div>
                                <div style={styles.cardTitle}>Important Dates</div>
                                <div style={styles.cardSubtitle}>Track key milestones</div>
                            </div>
                        </div>
                        <div style={styles.cardBody}>
                            <div style={styles.grid3}>
                                <div style={styles.fieldWrapper}>
                                    <label style={styles.label}>Issue Date</label>
                                    <input
                                        type="date"
                                        {...register('date_of_summon_issue')}
                                        style={styles.input}
                                    />
                                </div>
                                <div style={styles.fieldWrapper}>
                                    <label style={styles.label}>Rescheduled Date</label>
                                    <input
                                        type="date"
                                        {...register('rescheduled_date')}
                                        style={styles.input}
                                    />
                                    {errors.rescheduled_date && (
                                        <div style={styles.error}>
                                            <AlertCircle size={14} />
                                            {errors.rescheduled_date.message}
                                        </div>
                                    )}
                                </div>
                                <div style={styles.fieldWrapper}>
                                    <label style={styles.label}>Served Date</label>
                                    <input
                                        type="date"
                                        {...register('served_date')}
                                        style={styles.input}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Statement Tracking Card */}
                    <div style={styles.card}>
                        <div style={styles.cardHeader('linear-gradient(135deg, rgba(168, 85, 247, 0.12) 0%, rgba(168, 85, 247, 0.03) 100%)')}>
                            <div style={styles.cardIconWrapper('#a855f7')}>
                                <Activity size={20} />
                            </div>
                            <div>
                                <div style={styles.cardTitle}>Statement Tracking</div>
                                <div style={styles.cardSubtitle}>Monitor statement progress</div>
                            </div>
                        </div>
                        <div style={styles.cardBody}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1.25rem' }}>
                                <div style={styles.fieldWrapper}>
                                    <label style={styles.label}>Status</label>
                                    <select {...register('statement_status')} style={styles.select}>
                                        <option value="">Select...</option>
                                        {STATEMENT_STATUS_OPTIONS.map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                                <div style={styles.fieldWrapper}>
                                    <label style={styles.label}>1st Statement</label>
                                    <input
                                        type="date"
                                        {...register('date_of_1st_statement')}
                                        style={styles.input}
                                    />
                                </div>
                                <div style={styles.fieldWrapper}>
                                    <label style={styles.label}>2nd Statement</label>
                                    <input
                                        type="date"
                                        {...register('date_of_2nd_statement')}
                                        style={styles.input}
                                    />
                                </div>
                                <div style={styles.fieldWrapper}>
                                    <label style={styles.label}>3rd Statement</label>
                                    <input
                                        type="date"
                                        {...register('date_of_3rd_statement')}
                                        style={styles.input}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 3: Finalize */}
            {step === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Service & Purpose Card */}
                    <div style={styles.card}>
                        <div style={styles.cardHeader('linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(34, 197, 94, 0.03) 100%)')}>
                            <div style={styles.cardIconWrapper('#22c55e')}>
                                <Shield size={20} />
                            </div>
                            <div>
                                <div style={styles.cardTitle}>Service & Purpose</div>
                                <div style={styles.cardSubtitle}>How and why the summons is being served</div>
                            </div>
                        </div>
                        <div style={styles.cardBody}>
                            <div style={styles.grid2}>
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
                    </div>

                    {/* Status Flags Card */}
                    <div style={styles.card}>
                        <div style={styles.cardHeader('linear-gradient(135deg, rgba(249, 115, 22, 0.12) 0%, rgba(249, 115, 22, 0.03) 100%)')}>
                            <div style={styles.cardIconWrapper('#f97316')}>
                                <Activity size={20} />
                            </div>
                            <div>
                                <div style={styles.cardTitle}>Status Flags</div>
                                <div style={styles.cardSubtitle}>Track the current state of this summons</div>
                            </div>
                        </div>
                        <div style={styles.cardBody}>
                            <div style={styles.grid3}>
                                <Toggle
                                    label="Summon Issued"
                                    description="Mark when officially issued"
                                    checked={!!watch('is_issued')}
                                    onChange={(val) => setValue('is_issued', val, { shouldValidate: true })}
                                />
                                <Toggle
                                    label="Summon Served"
                                    description="Mark when delivered"
                                    checked={!!watch('is_served')}
                                    onChange={(val) => setValue('is_served', val, { shouldValidate: true })}
                                />
                                <Toggle
                                    label="Reschedule Requested"
                                    description="New date requested"
                                    checked={!!watch('requests_reschedule')}
                                    onChange={(val) => setValue('requests_reschedule', val, { shouldValidate: true })}
                                />
                                <Toggle
                                    label="Date Communicated"
                                    description="New date shared"
                                    checked={!!watch('rescheduled_date_communicated')}
                                    onChange={(val) => setValue('rescheduled_date_communicated', val, { shouldValidate: true })}
                                />
                                <Toggle
                                    label="Statement Ongoing"
                                    description="Recording in progress"
                                    checked={!!watch('statement_ongoing')}
                                    onChange={(val) => setValue('statement_ongoing', val, { shouldValidate: true })}
                                />
                                <Toggle
                                    label="Statement Recorded"
                                    description="Fully recorded"
                                    checked={!!watch('statement_recorded')}
                                    onChange={(val) => setValue('statement_recorded', val, { shouldValidate: true })}
                                />
                                <Toggle
                                    label="Follow-up Required"
                                    description="Additional action needed"
                                    checked={!!watch('followup_required')}
                                    onChange={(val) => setValue('followup_required', val, { shouldValidate: true })}
                                />
                            </div>

                            {/* Validation Errors */}
                            {(errors.is_issued || errors.requests_reschedule) && (
                                <div style={{
                                    marginTop: '1rem',
                                    padding: '0.875rem',
                                    borderRadius: '0.5rem',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)'
                                }}>
                                    {errors.is_issued && (
                                        <div style={styles.error}>
                                            <AlertCircle size={14} />
                                            {errors.is_issued.message}
                                        </div>
                                    )}
                                    {errors.requests_reschedule && (
                                        <div style={styles.error}>
                                            <AlertCircle size={14} />
                                            {errors.requests_reschedule.message}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Notes Card */}
                    <div style={styles.card}>
                        <div style={styles.cardHeader('linear-gradient(135deg, rgba(100, 116, 139, 0.12) 0%, rgba(100, 116, 139, 0.03) 100%)')}>
                            <div style={styles.cardIconWrapper('#64748b')}>
                                <FileText size={20} />
                            </div>
                            <div>
                                <div style={styles.cardTitle}>Additional Notes</div>
                                <div style={styles.cardSubtitle}>Any other relevant information</div>
                            </div>
                        </div>
                        <div style={styles.cardBody}>
                            <textarea
                                {...register('notes')}
                                placeholder="Add any additional notes or context about this summons..."
                                style={styles.textarea}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Footer */}
            <div style={styles.footer}>
                <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                        All changes sync automatically with Notion
                    </div>
                    <div style={styles.footerProgress}>
                        {stepData.map(s => (
                            <div key={s.id} style={styles.footerDot(step === s.id, step > s.id)} />
                        ))}
                    </div>
                </div>
                <div style={styles.footerButtons}>
                    {step === 1 ? (
                        <button
                            type="button"
                            onClick={handleCancel}
                            style={styles.buttonOutline}
                        >
                            Cancel
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={prevStep}
                            style={styles.buttonOutline}
                        >
                            <ArrowLeft size={16} />
                            Back
                        </button>
                    )}

                    {step < 3 ? (
                        <button
                            type="button"
                            onClick={nextStep}
                            style={styles.buttonPrimary}
                        >
                            Continue
                            <ArrowRight size={16} />
                        </button>
                    ) : (
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            style={{
                                ...styles.buttonPrimary,
                                opacity: isSubmitting ? 0.7 : 1,
                                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Sparkles size={16} />
                                    {initialData ? 'Update Summons' : 'Create Summons'}
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </form>
    );
}
