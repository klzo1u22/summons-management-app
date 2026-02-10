import { getCasesAction } from '@/app/actions';
import { getOptionsAction } from '@/app/settings-actions';
import AddSummonClient from '@/app/summons/new/AddSummonClient';

export default async function NewSummonsPage() {
    const cases = await getCasesAction();

    // Fetch property options for the form
    const properties = [
        'person_role', 'priority', 'tone', 'purpose',
        'mode_of_service', 'statement_status', 'summons_response'
    ];

    const optionsMap: Record<string, { id: string; option_value: string }[]> = {};
    await Promise.all(properties.map(async (prop) => {
        optionsMap[prop] = await getOptionsAction(prop);
    }));

    return <AddSummonClient cases={cases} options={optionsMap} />;
}
