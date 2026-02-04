import * as dotenv from 'dotenv';
import path from 'path';

// Load env vars
const envPath = path.join(process.cwd(), '.env.local');
console.log("Loading .env from:", envPath);
dotenv.config({ path: envPath });

async function inspectSummonsProperties() {
    console.log("Inspecting Notion SUMMONS Properties with Fetch...");

    // Debug environment variables
    const keys = Object.keys(process.env).filter(k => k.includes('NOTION'));

    const apiKeyKey = keys.find(k => k.trim() === 'NOTION_API_KEY');
    const summonsIdKey = keys.find(k => k.trim() === 'NOTION_SUMMONS_DATABASE_ID');

    const notionKey = apiKeyKey ? process.env[apiKeyKey] : undefined;
    const summonsId = summonsIdKey ? process.env[summonsIdKey] : undefined;

    if (!notionKey || !summonsId) {
        console.error("Missing Env Vars");
        return;
    }

    try {
        const response = await fetch(`https://api.notion.com/v1/databases/${summonsId.trim()}/query`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${notionKey.trim()}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ page_size: 1 }),
        });

        if (!response.ok) {
            throw new Error(`Notion API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log("Query Response received.");

        if (data.results.length === 0) {
            console.log("Database is empty, cannot infer properties.");
            return;
        }

        const page = data.results[0];
        console.log("Sample Page ID:", page.id);

        if (!page.properties) {
            console.error("ERROR: 'properties' field is missing from page!");
            return;
        }

        const propertyDetails = Object.entries(page.properties).map(([key, value]: [string, any]) => ({
            name: key,
            type: value.type,
            id: value.id
        }));

        console.table(propertyDetails);

        const caseProp = propertyDetails.find((p: any) => p.type === 'relation');
        console.log("RELATION PROPERTIES:", propertyDetails.filter((p: any) => p.type === 'relation').map(p => p.name));

    } catch (e: any) {
        console.error("Fetch Error:", e.message);
    }
}

inspectSummonsProperties();
