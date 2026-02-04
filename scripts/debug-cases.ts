import * as dotenv from 'dotenv';
import path from 'path';

// Load env vars
const envPath = path.join(process.cwd(), '.env.local');
console.log("Loading .env from:", envPath);
dotenv.config({ path: envPath });

async function inspectNotionProperties() {
    console.log("Inspecting Notion Case Properties with Fetch...");

    // Debug environment variables
    const keys = Object.keys(process.env).filter(k => k.includes('NOTION'));

    const apiKeyKey = keys.find(k => k.trim() === 'NOTION_API_KEY');
    const casesIdKey = keys.find(k => k.trim() === 'NOTION_CASES_DATABASE_ID');

    const notionKey = apiKeyKey ? process.env[apiKeyKey] : undefined;
    const casesId = casesIdKey ? process.env[casesIdKey] : undefined;

    if (!notionKey || !casesId) {
        console.error("Missing Env Vars");
        return;
    }

    try {
        const response = await fetch(`https://api.notion.com/v1/databases/${casesId.trim()}/query`, {
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
            console.log("Full Page Dump:", JSON.stringify(page, null, 2));
            return;
        }

        const propertyDetails = Object.entries(page.properties).map(([key, value]: [string, any]) => ({
            name: key,
            type: value.type,
            id: value.id
        }));

        console.table(propertyDetails);

        const titleProp = propertyDetails.find((p: any) => p.type === 'title');
        console.log("TITLE PROPERTY FOUND:", titleProp ? titleProp.name : "NONE");

    } catch (e: any) {
        console.error("Fetch Error:", e.message);
    }
}

inspectNotionProperties();
