
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else {
    console.warn('.env.local not found!');
}

import db from '../lib/db';
import { randomUUID } from 'crypto';

async function testReverseSync() {
    // Dynamic import to ensure env vars are loaded first
    const { pushToNotion } = await import('../lib/notion-write');

    const testId = randomUUID();
    console.log(`Creating test case with ID: ${testId}`);

    // 1. Insert local mockup data
    const now = new Date().toISOString();
    db.prepare(`
        INSERT INTO cases (id, name, ecir_no, status, created_at, last_edited)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(testId, 'Test Case Auto-Sync', 'ECIR/TEST/001', 'To Do', now, now);

    console.log('Local case inserted. Triggering pushToNotion...');

    // 2. Trigger Sync
    const result = await pushToNotion('case', testId);

    if (result.success) {
        console.log('✅ Push Success!');

        // 3. Check for ID update (if it was a new creation)
        const updatedRow = db.prepare('SELECT id, synced_at FROM cases WHERE name = ?').get('Test Case Auto-Sync') as any;
        console.log('Updated Row Sync Status:', updatedRow);

        if (updatedRow.id !== testId) {
            console.log(`✅ ID updated from ${testId} to ${updatedRow.id} (Notion ID)`);
        } else {
            console.log('ℹ️ ID remained same (Likely updated existing or Notion accepted UUID)');
        }
    } else {
        console.error('❌ Push Failed:', result.error);
    }
}

testReverseSync();
