
const { createClient } = require('@libsql/client');

const url = 'libsql://summondb-klzo1u22.aws-ap-south-1.turso.io';
const authToken = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzAxODAyOTUsImlkIjoiY2QyYjVmYjctNjQ0ZC00MzA5LWEzNGEtMmFhNzk0M2QzYmJkIiwicmlkIjoiMGI2MGNhOTEtNGJkZi00Y2IxLTk3MjQtYjYzODI5YWU1NjQ3In0.TXfi7w0vwAftYsFH1YdvtE68RCCuGY2WLRm-kjIveSmI5iPzOdpcVCEIJ1Sm1ycA5feJlL-yFzHFahsrJgjwDg';

const db = createClient({
    url: url,
    authToken: authToken,
});

async function main() {
    console.log(`Connecting to Turso: ${url}`);
    try {
        // 1. Simple connection test
        const result = await db.execute("SELECT 1 as connected");
        console.log("Connection successful!");
        console.log("Test Query Result:", result.rows);

        // 2. Check for existing tables
        const tableResult = await db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='summons'");
        if (tableResult.rows.length > 0) {
            console.log("Table 'summons' ALREADY exists.");
        } else {
            console.log("Table 'summons' does NOT exist (Expected for fresh DB).");
            console.log("The application will create tables automatically on first run.");
        }

    } catch (e) {
        console.error("Connection failed:", e);
        process.exit(1);
    }
}

main();
