import { Client } from '@notionhq/client';

export const notion = new Client({
    auth: process.env.NOTION_API_KEY,
});

// Verified Database ID (Found via page parent check)
export const DATABASE_ID = process.env.NOTION_SUMMONS_DATABASE_ID || '';
// 'Summons Appearances' Data Source ID
