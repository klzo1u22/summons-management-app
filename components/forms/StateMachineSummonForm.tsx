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
import {
    ChevronRight, User, FileText, Calendar,
    Loader2, CheckCircle2, AlertTriangle, Lock, ArrowRight,
    AlertCircle, XCircle
} from "lucide-react";
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
    Case,
} from "@/lib/types";
import {
    SummonsStatus,
    SUMMONS_STATUSES,
    getNextStatuses,
    getEditableFields,
    isFieldEditable,
    STATUS_META,
    deriveCheckboxesFromStatus,
    validateTransition,
    getRequiredFieldsForTransition,
} from "@/lib/summons-state-machine";

// ==========================================
// SCHEMA (simplified - validation is status-driven)
// ==========================================
const stateMachineSchema = z.object({
    person_name: z.string().min(2, "Name is required"),
    person_role: z.string().optional(),
    case_id: z.string().min(1, "Case is required"),
    issue_date: z.string().optional(),
    appearance_date: z.string().optional(),
    appearance_time: z.string().optional(),
    rescheduled_date: z.string().optional(),
    priority: z.string().optional(),
    tone: z.string().optional(),
    mode_of_service: z.array(z.string()).optional(),
    purpose: z.array(z.string()).optional(),
    statement_status: z.string().optional(),
    contact_number: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    notes: z.string().optional(),
    served_date: z.string().optional(),
    date_of_1st_statement: z.string().optional(),
    date_of_2nd_statement: z.string().optional(),
    date_of_3rd_statement: z.string().optional(),
    rescheduled_date_communicated: z.boolean().optional(),
    followup_required: z.boolean().optional(),
});

export type StateMachineFormData = z.infer<typeof stateMachineSchema>;

interface StateMachineSummonFormProps {
    onSubmit?: (data: StateMachineFormData, newStatus?: SummonsStatus) => void;
    onCancel?: () => void;
    initialData?: Summons;
    cases?: Case[];
}

export function StateMachineSummonForm({
    onSubmit: propsOnSubmit,
    onCancel,
    initialData,
    cases = []
}: StateMachineSummonFormProps) {
    const router = useRouter();
    const [currentStatus, setCurrentStatus] = useState<SummonsStatus>(
        initialData?.status ?? 'Draft'
    );
    const [pendingTransition, setPendingTransition] = useState<SummonsStatus | null>(null);
    const [transitionErrors, setTransitionErrors] = useState<string[]>([]);

    const { register, handleSubmit, setValue, watch, getValues, formState: { errors, isSubmitting } } = useForm<StateMachineFormData>({
        resolver: zodResolver(stateMachineSchema),
        defaultValues: initialData ? {
            person_name: initialData.person_name,
            person_role: initialData.person_role ?? '',
            case_id: initialData.case_id,
            issue_date: initialData.issue_date ?? '',
            appearance_date: initialData.appearance_date ?? '',
            appearance_time: initialData.appearance_time ?? '',
            rescheduled_date: initialData.rescheduled_date ?? '',
            priority: initialData.priority ?? 'Medium',
            tone: initialData.tone ?? '',
            mode_of_service: initialData.mode_of_service ?? [],
            purpose: initialData.purpose ?? [],
            statement_status: initialData.statement_status ?? '',
            contact_number: initialData.contact_number ?? '',
            email: initialData.email ?? '',
            notes: initialData.notes ?? '',
            served_date: initialData.served_date ?? '',
            date_of_1st_statement: initialData.date_of_1st_statement ?? '',
            date_of_2nd_statement: initialData.date_of_2nd_statement ?? '',
            date_of_3rd_statement: initialData.date_of_3rd_statement ?? '',
            rescheduled_date_communicated: !!initialData.rescheduled_date_communicated,
            followup_required: !!initialData.followup_required,
        } : {
            priority: 'Medium',
            mode_of_service: [],
            purpose: [],
        }
    });

    const editableFields = getEditableFields(currentStatus);
    const nextStatuses = getNextStatuses(currentStatus);
    const statusMeta = STATUS_META[currentStatus];

    const isEditable = (field: string) => editableFields.includes(field as any);

    const onSubmit = async (data: StateMachineFormData): Promise<void> => {
        try {
            const finalStatus = pendingTransition ?? currentStatus;

            // Validate transition if advancing
            if (pendingTransition) {
                const validation = validateTransition(currentStatus, pendingTransition, data);
                if (!validation.valid) {
                    setTransitionErrors(validation.errors);
                    return;
                }
            }

            const checkboxes = deriveCheckboxesFromStatus(finalStatus);

            if (propsOnSubmit) {
                await propsOnSubmit(data, finalStatus);
                return;
            }

            const summonData = {
                ...data,
                status: finalStatus,
                ...checkboxes,
            };

            if (initialData) {
                await updateSummonsAction(initialData.id, summonData as Partial<Summons>);
            } else {
                const newSummon: Summons = {
                    ...summonData,
                    id: `sum-${Date.now()}`,
                    created_at: new Date().toISOString(),
                } as Summons;
                await addSummonsAction(newSummon);
            }
            router.push('/');
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

    const handleAdvanceStatus = (nextStatus: SummonsStatus) => {
        // Clear previous errors
        setTransitionErrors([]);

        // Validate immediately for real-time feedback
        const currentData = getValues();
        const validation = validateTransition(currentStatus, nextStatus, currentData);

        if (!validation.valid) {
            setTransitionErrors(validation.errors);
            setPendingTransition(null);
            return;
        }

        setPendingTransition(prev => prev === nextStatus ? null : nextStatus);
    };

    const modeOfServiceValue = watch('mode_of_service') || [];
    const purposeValue = watch('purpose') || [];

    // Get case name for display
    const getCaseName = (caseId: string) => {
        const c = cases.find(c => c.id === caseId);
        return c ? c.name : caseId;
    };

    // ==========================================
    // FIELD RENDERER WITH DASHBOARD STYLING
    // ==========================================
    const renderField = (
        fieldName: string,
        label: string,
        type: 'text' | 'date' | 'email' | 'textarea' | 'select' | 'multiselect' | 'checkbox' = 'text',
        options?: readonly string[],
        currentValue?: string[] | boolean
    ) => {
        const editable = isEditable(fieldName);
        const fieldError = errors[fieldName as keyof StateMachineFormData];
        const requiredForNext = pendingTransition &&
            getRequiredFieldsForTransition(pendingTransition).includes(fieldName);

        return (
            <div className="input-group">
                <label htmlFor={fieldName} className="input-label" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    opacity: editable ? 1 : 0.5
                }}>
                    {label}
                    {requiredForNext && (
                        <span style={{
                            fontSize: '0.625rem',
                            color: 'var(--warning)',
                            padding: '2px 6px',
                            background: 'var(--warning-muted)',
                            borderRadius: 'var(--radius-full)'
                        }}>Required</span>
                    )}
                    {!editable && <Lock size={12} style={{ color: 'var(--text-muted)' }} />}
                </label>

                {type === 'textarea' ? (
                    <textarea
                        id={fieldName}
                        {...register(fieldName as any)}
                        disabled={!editable}
                        placeholder={editable ? `Enter ${label.toLowerCase()}...` : 'Locked at this stage'}
                        className="input"
                        style={{
                            minHeight: '100px',
                            resize: 'vertical',
                            cursor: editable ? 'text' : 'not-allowed',
                            opacity: editable ? 1 : 0.5
                        }}
                    />
                ) : type === 'select' ? (
                    <select
                        id={fieldName}
                        {...register(fieldName as any)}
                        disabled={!editable}
                        className="input"
                        style={{
                            cursor: editable ? 'pointer' : 'not-allowed',
                            opacity: editable ? 1 : 0.5
                        }}
                    >
                        <option value="">Select {label}</option>
                        {options?.map(opt => (
                            <option key={opt} value={opt}>{fieldName === 'case_id' ? getCaseName(opt) : opt}</option>
                        ))}
                    </select>
                ) : type === 'multiselect' ? (
                    <MultiSelect
                        options={options || []}
                        selected={(currentValue as string[]) || []}
                        onChange={(values) => setValue(fieldName as any, values)}
                        placeholder={editable ? `Select ${label}...` : 'Locked'}
                    />
                ) : type === 'checkbox' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <input
                            type="checkbox"
                            id={fieldName}
                            {...register(fieldName as any)}
                            disabled={!editable}
                            style={{
                                width: '20px',
                                height: '20px',
                                accentColor: 'var(--primary)',
                                cursor: editable ? 'pointer' : 'not-allowed'
                            }}
                        />
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                            {editable ? 'Toggle as needed' : 'Locked at this stage'}
                        </span>
                    </div>
                ) : (
                    <input
                        id={fieldName}
                        type={type}
                        {...register(fieldName as any)}
                        disabled={!editable}
                        placeholder={editable ? '' : 'Locked'}
                        className="input"
                        style={{
                            cursor: editable ? 'text' : 'not-allowed',
                            opacity: editable ? 1 : 0.5
                        }}
                    />
                )}

                {fieldError && (
                    <p style={{
                        fontSize: '0.75rem',
                        color: 'var(--error)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-1)'
                    }}>
                        <AlertTriangle size={12} />
                        {fieldError.message as string}
                    </p>
                )}
            </div>
        );
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-6)',
            padding: 'var(--space-6)'
        }}>
            {/* Status Header Card */}
            <div className="card" style={{
                background: 'linear-gradient(135deg, var(--surface) 0%, var(--surface-hover) 100%)',
                padding: 'var(--space-5)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: 'var(--radius-full)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.25rem',
                            fontWeight: 700,
                            color: 'white',
                            background: `linear-gradient(135deg, var(--primary), var(--secondary))`
                        }}>
                            {currentStatus[0]}
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>{currentStatus}</h3>
                            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{statusMeta.description}</p>
                        </div>
                    </div>

                    {pendingTransition && (
                        <div className="badge badge-warning" style={{
                            padding: 'var(--space-2) var(--space-4)',
                            fontSize: '0.8125rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-2)'
                        }}>
                            <ArrowRight size={16} />
                            <span>Will advance to: <strong>{pendingTransition}</strong></span>
                        </div>
                    )}
                </div>
            </div>

            {/* Progress Tracker */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-1)',
                overflowX: 'auto',
                padding: 'var(--space-2) 0',
                background: 'var(--surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)'
            }}>
                {SUMMONS_STATUSES.map((status, index) => {
                    const isCurrent = status === currentStatus;
                    const isPast = SUMMONS_STATUSES.indexOf(status) < SUMMONS_STATUSES.indexOf(currentStatus);
                    const isPending = status === pendingTransition;

                    return (
                        <div key={status} style={{ display: 'flex', alignItems: 'center' }}>
                            <div
                                className={cn(
                                    "badge",
                                    isCurrent && "badge-primary",
                                    isPast && "badge-success",
                                    isPending && "badge-warning",
                                    !isCurrent && !isPast && !isPending && "badge-neutral"
                                )}
                                style={{
                                    whiteSpace: 'nowrap',
                                    fontSize: '0.6875rem',
                                    padding: '4px 8px'
                                }}
                            >
                                {status}
                            </div>
                            {index < SUMMONS_STATUSES.length - 1 && (
                                <ChevronRight size={12} style={{ color: 'var(--text-muted)', margin: '0 2px' }} />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Validation Errors Alert */}
            {transitionErrors.length > 0 && (
                <div style={{
                    background: 'var(--error-muted)',
                    border: '1px solid var(--error)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--space-4)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-2)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--error)', fontWeight: 600 }}>
                        <XCircle size={18} />
                        Cannot Advance Status
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 'var(--space-5)', color: 'var(--error)', fontSize: '0.875rem' }}>
                        {transitionErrors.map((err, i) => (
                            <li key={i}>{err}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Form Fields Grid */}
            <div className="card" style={{ padding: 'var(--space-5)' }}>
                <div className="card-header" style={{ marginBottom: 'var(--space-4)' }}>
                    <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <User size={18} style={{ color: 'var(--primary)' }} />
                        Summons Details
                    </div>
                    <span className="card-description">
                        Fields available at <strong>{currentStatus}</strong> stage
                    </span>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: 'var(--space-5)'
                }}>
                    {renderField('person_name', 'Person Name')}
                    {renderField('case_id', 'Case', 'select', cases.map(c => c.id))}
                    {renderField('person_role', 'Role', 'select', PERSON_ROLE_OPTIONS)}
                    {renderField('priority', 'Priority', 'select', PRIORITY_OPTIONS)}
                    {renderField('tone', 'Tone', 'select', TONE_OPTIONS)}
                    {renderField('contact_number', 'Contact Number')}
                    {renderField('email', 'Email', 'email')}
                </div>
            </div>

            {/* Lifecycle Fields Card */}
            <div className="card" style={{ padding: 'var(--space-5)' }}>
                <div className="card-header" style={{ marginBottom: 'var(--space-4)' }}>
                    <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <Calendar size={18} style={{ color: 'var(--primary)' }} />
                        Lifecycle Information
                    </div>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: 'var(--space-5)'
                }}>
                    {renderField('issue_date', 'Issue Date', 'date')}
                    {renderField('mode_of_service', 'Mode of Service', 'multiselect', MODE_OF_SERVICE_OPTIONS, modeOfServiceValue)}
                    {renderField('served_date', 'Served Date', 'date')}
                    {renderField('appearance_date', 'Appearance Date', 'date')}
                    {renderField('appearance_time', 'Appearance Time')}
                    {renderField('purpose', 'Purpose', 'multiselect', PURPOSE_OPTIONS, purposeValue)}
                </div>
            </div>

            {/* Rescheduling & Statement Card */}
            <div className="card" style={{ padding: 'var(--space-5)' }}>
                <div className="card-header" style={{ marginBottom: 'var(--space-4)' }}>
                    <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <FileText size={18} style={{ color: 'var(--primary)' }} />
                        Rescheduling & Statements
                    </div>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: 'var(--space-5)'
                }}>
                    {renderField('rescheduled_date', 'Rescheduled Date', 'date')}
                    {renderField('rescheduled_date_communicated', 'Date Communicated?', 'checkbox')}
                    {renderField('statement_status', 'Statement Status', 'select', STATEMENT_STATUS_OPTIONS)}
                    {renderField('date_of_1st_statement', '1st Statement Date', 'date')}
                    {renderField('date_of_2nd_statement', '2nd Statement Date', 'date')}
                    {renderField('date_of_3rd_statement', '3rd Statement Date', 'date')}
                    {renderField('followup_required', 'Follow-up Required?', 'checkbox')}
                </div>
            </div>

            {/* Notes Card */}
            <div className="card" style={{ padding: 'var(--space-5)' }}>
                {renderField('notes', 'Notes', 'textarea')}
            </div>

            {/* Transition Actions */}
            {nextStatuses.length > 0 && (
                <div className="card" style={{
                    padding: 'var(--space-5)',
                    background: 'linear-gradient(135deg, var(--primary-muted) 0%, transparent 100%)',
                    borderColor: 'var(--primary)'
                }}>
                    <label className="input-label" style={{ marginBottom: 'var(--space-3)', display: 'block' }}>
                        Advance Status To:
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                        {nextStatuses.map((next) => {
                            const isSelected = pendingTransition === next;
                            const meta = STATUS_META[next];
                            return (
                                <button
                                    key={next}
                                    type="button"
                                    onClick={() => handleAdvanceStatus(next)}
                                    className={cn("btn", isSelected ? "btn-primary" : "btn-secondary")}
                                    style={{
                                        boxShadow: isSelected ? 'var(--shadow-glow)' : undefined
                                    }}
                                >
                                    <CheckCircle2 size={16} />
                                    {next}
                                </button>
                            );
                        })}
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Select a status to advance to when you save. Required fields will be validated.
                    </p>
                </div>
            )}

            {/* Form Actions */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 'var(--space-4)',
                paddingTop: 'var(--space-4)',
                borderTop: '1px solid var(--border)'
            }}>
                <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                    Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                            <Loader2 className="animate-spin" style={{ width: '16px', height: '16px' }} />
                            Saving...
                        </span>
                    ) : (
                        pendingTransition
                            ? `Save & Advance to ${pendingTransition}`
                            : (initialData ? 'Update Summons' : 'Create Summons')
                    )}
                </button>
            </div>
        </form>
    );
}
