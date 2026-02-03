
const { syncSummons } = require('./lib/sync');

async function runSync() {
    console.log('Running summons sync...');
    const result = await syncSummons();
    console.log('Sync result:', JSON.stringify(result, null, 2));
}

runSync();
