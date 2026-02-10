'use client';

import { useRouter } from 'next/navigation';
import { LifecycleSummonForm } from '@/components/forms/LifecycleSummonForm';
import { Summons, Case } from '@/lib/types';
import { addSummonsAction } from '@/app/actions';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';

interface AddSummonClientProps {
    cases: Case[];
    options: Record<string, { id: string; option_value: string }[]>;
}

export default function AddSummonClient({ cases, options }: AddSummonClientProps) {
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (data: Partial<Summons>) => {
        setIsSaving(true);
        try {
            // Derive status from the form data
            const status = data.served_date ? 'Served' : data.issue_date ? 'Issued' : 'Draft';

            const newSummons: Summons = {
                id: `sum-${Date.now()}`,
                ...data,
                status,
                created_at: new Date().toISOString(),
                is_issued: !!data.issue_date,
                is_served: !!data.served_date,
                requests_reschedule: !!data.rescheduled_date,
                statement_ongoing: !!data.date_of_1st_statement && data.statement_status !== 'Recorded',
                statement_recorded: data.statement_status === 'Recorded',
            } as Summons;

            await addSummonsAction(newSummons);
            router.push('/');
        } catch (error) {
            console.error('Failed to add summons:', error);
            alert('Failed to create summons. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    // Use isSaving for visual feedback
    const saveButtonLabel = isSaving ? 'Creating...' : 'Create Summons';

    return (
        <div className="min-h-screen bg-[var(--background)] flex flex-col items-center">
            <div className="w-full max-w-7xl px-20 py-16" style={{ paddingLeft: '80px', paddingRight: '80px', paddingTop: '64px' }}>
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
                                New Summons
                            </h1>
                            <p className="text-sm text-[var(--text-muted)]">
                                Create a new summons record
                            </p>
                        </div>
                    </div>
                </div>

                <LifecycleSummonForm
                    cases={cases}
                    options={options as any} // Cast because form expects more generic any[]
                    onSubmit={handleSubmit}
                    onCancel={() => router.back()}
                />
            </div>
        </div>
    );
}
