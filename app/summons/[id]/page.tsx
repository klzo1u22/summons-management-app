import { getSummonByIdAction, getCasesAction } from '@/app/actions';
import { getOptionsAction } from '@/app/settings-actions';
import { notFound } from 'next/navigation';
import SummonDetailClient from '@/app/summons/[id]/SummonDetailClient';

export default async function SummonDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const [summon, cases] = await Promise.all([
        getSummonByIdAction(id),
        getCasesAction()
    ]);

    if (!summon) {
        notFound();
    }

    // Fetch property options for the form
    const properties = [
        'person_role', 'priority', 'tone', 'purpose',
        'mode_of_service', 'statement_status', 'summons_response'
    ];

    const optionsMap: Record<string, { id: string; option_value: string }[]> = {};
    await Promise.all(properties.map(async (prop) => {
        optionsMap[prop] = await getOptionsAction(prop);
    }));

    return <SummonDetailClient summon={summon} cases={cases} options={optionsMap} />;
}
