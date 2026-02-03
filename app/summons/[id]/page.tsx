import { getSummonByIdAction, getCasesAction } from '@/app/actions';
import { notFound } from 'next/navigation';
import SummonDetailClient from './SummonDetailClient';

export default async function SummonDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const [summon, cases] = await Promise.all([
        getSummonByIdAction(id),
        getCasesAction()
    ]);

    if (!summon) {
        notFound();
    }

    return <SummonDetailClient summon={summon} cases={cases} />;
}
