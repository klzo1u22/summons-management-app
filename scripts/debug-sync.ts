
import * as dotenv from 'dotenv';
import path from 'path';

// Load env vars BEFORE importing libraries that use them
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
    console.log("Starting Debug Sync (Fixed)...");

    try {
        // Dynamic import to ensure process.env is populated
        const { syncCases } = await import('../lib/sync-cases');
        console.log("Testing syncCases...");
        const casesResult = await syncCases();
        console.log("syncCases Result:", casesResult);
    } catch (e) {
        console.error("syncCases CRASHED:", e);
    }

    try {
        const { syncSummons } = await import('../lib/sync');
        console.log("Testing syncSummons...");
        const summonsResult = await syncSummons();
        console.log("syncSummons Result:", summonsResult);
    } catch (e) {
        console.error("syncSummons CRASHED:", e);
    }
}

main().catch(console.error);
