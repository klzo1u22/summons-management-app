const { createClient } = require('@libsql/client');
const path = require('path');
const dotenv = require('dotenv');

// Load env vars from .env.local
dotenv.config({ path: '.env.local' });

const url = process.env.TURSO_DATABASE_URL || `file:${path.join(process.cwd(), 'summons.db')}`;
const authToken = process.env.TURSO_AUTH_TOKEN;

const db = createClient({
    url: url,
    authToken: authToken,
});

async function main() {
    try {
        const result = await db.execute("SELECT name FROM sqlite_master WHERE type='table'");
        const tables = result.rows;
        console.log('Tables:', tables.map(t => t.name));

        for (const table of tables) {
            const schemaRs = await db.execute({
                sql: "SELECT sql FROM sqlite_master WHERE type='table' AND name = ?",
                args: [table.name]
            });
            const schema = schemaRs.rows[0];
            console.log(`\nSchema for ${table.name}:`);
            console.log(schema.sql);
        }
    } catch (e) {
        console.error('Error dumping schema:', e);
    }
}

main();

