'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout';
import { AddSummonForm } from '@/components/forms/AddSummonForm';
import { Summons, Case } from '@/lib/types';
import { updateSummonsAction } from '@/app/actions';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface SummonDetailClientProps {
    summon: Summons;
    cases: Case[];
}

export default function SummonDetailClient({ summon, cases }: SummonDetailClientProps) {
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const handleSubmit = async (data: any) => {
        setIsSaving(true);
        try {
            await updateSummonsAction(summon.id, data);
            setShowSuccess(true);
            setTimeout(() => {
                setShowSuccess(false);
                // We keep the tab open as requested (it opens in a new tab)
            }, 3000);
        } catch (error) {
            console.error('Failed to update summons:', error);
            alert('Failed to update summons. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--background)]">
            <div className="max-w-6xl mx-auto px-6 py-8">
                {/* Simplified Header */}
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
                                • Edit Summon record
                            </p>
                        </div>
                    </div>
                </div>

                <AddSummonForm
                    initialData={summon}
                    cases={cases}
                />
            </div>
        </div>
    );
}
