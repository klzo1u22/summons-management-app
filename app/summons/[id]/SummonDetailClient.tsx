'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { LifecycleSummonForm, LifecycleSummonFormRef } from '@/components/forms/LifecycleSummonForm';
import { Summons, Case } from '@/lib/types';
import { updateSummonsAction } from '@/app/actions';
import { ArrowLeft, CheckCircle, Pencil, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface SummonDetailClientProps {
    summon: Summons;
    cases: Case[];
    options: Record<string, { id: string; option_value: string }[]>;
}

export default function SummonDetailClient({ summon, cases, options }: SummonDetailClientProps) {
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const formRef = useRef<LifecycleSummonFormRef>(null);

    const handleSubmit = async (data: Partial<Summons>) => {
        setIsSaving(true);
        try {
            await updateSummonsAction(summon.id, data);
            setShowSuccess(true);
            setIsEditing(false);
            setTimeout(() => {
                setShowSuccess(false);
                router.refresh();
            }, 1500);
        } catch (error) {
            console.error('Failed to update summons:', error);
            alert('Failed to update summons. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveClick = () => {
        if (formRef.current) {
            formRef.current.submitForm();
        }
    };

    const handleCancelClick = () => {
        setIsEditing(false);
        // Reset form by refreshing (simplest way to revert unsaved changes)
        router.refresh();
    };

    return (
        <div className="min-h-screen bg-[var(--background)]">
            <div className="max-w-6xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="w-10 h-10 rounded-xl bg-[var(--background-elevated)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-all group"
                        >
                            <ArrowLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                                {summon.person_name}
                            </h1>
                            <p className="text-sm text-[var(--text-muted)] flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] font-medium">
                                    {summon.case_id}
                                </span>
                                • {isEditing ? 'Editing Record' : 'View Record'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {showSuccess && (
                            <div className="flex items-center gap-2 text-emerald-600 font-medium animate-in fade-in slide-in-from-right-4 mr-4">
                                <CheckCircle size={20} />
                                <span>Saved!</span>
                            </div>
                        )}

                        {isEditing ? (
                            <>
                                <Button
                                    variant="ghost"
                                    onClick={handleCancelClick}
                                    className="h-10 w-10 p-0 rounded-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    title="Cancel"
                                >
                                    <X size={20} />
                                </Button>
                                <Button
                                    onClick={handleSaveClick}
                                    disabled={isSaving}
                                    className="h-10 min-w-[100px] bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white shadow-lg shadow-[var(--primary)]/20 px-4 gap-2"
                                >
                                    {isSaving ? (
                                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                                    ) : (
                                        <Check size={18} />
                                    )}
                                    <span className="font-medium">Save</span>
                                </Button>
                            </>
                        ) : (
                            <Button
                                onClick={() => setIsEditing(true)}
                                className="h-10 min-w-[100px] bg-[var(--background-elevated)] border border-[var(--border)] hover:border-[var(--primary)] text-[var(--text-primary)] px-4 gap-2 group"
                            >
                                <Pencil size={16} className="text-[var(--text-secondary)] group-hover:text-[var(--primary)] transition-colors" />
                                <span className="font-medium">Edit</span>
                            </Button>
                        )}
                    </div>
                </div>

                <div className="bg-[var(--background-elevated)] rounded-2xl border border-[var(--border)] shadow-xl overflow-hidden p-6 transition-all duration-300">
                    <LifecycleSummonForm
                        ref={formRef}
                        initialData={summon}
                        cases={cases}
                        options={options as any}
                        onSubmit={handleSubmit}
                        onCancel={handleCancelClick}
                        readOnly={!isEditing}
                    />
                </div>
            </div>
        </div>
    );
}
