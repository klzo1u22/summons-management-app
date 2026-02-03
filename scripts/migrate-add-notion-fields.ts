/**
 * Migration Script: Add Missing Notion Fields
 * 
 * Adds new columns to summons and cases tables to match Notion schema.
 * Run with: npx tsx scripts/migrate-add-notion-fields.ts
 */

import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'summons.db');
const db = new Database(dbPath);

console.log('=== MIGRATION: Add Notion Fields ===\n');

// Helper to check if column exists
function columnExists(table: string, column: string): boolean {
    const info = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
    return info.some(col => col.name === column);
}

// Helper to add column safely
function addColumn(table: string, column: string, type: string, defaultValue?: string) {
    if (columnExists(table, column)) {
        console.log(`  ⏭️  Column '${column}' already exists in '${table}'`);
        return false;
    }
    const defaultClause = defaultValue !== undefined ? ` DEFAULT ${defaultValue}` : '';
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}${defaultClause}`);
    console.log(`  ✅ Added column '${column}' to '${table}'`);
    return true;
}

try {
    // === SUMMONS TABLE MIGRATIONS ===
    console.log('📋 Migrating SUMMONS table...');

    // New select/text fields
    addColumn('summons', 'summons_response', 'TEXT');
    addColumn('summons', 'date_of_1st_statement', 'TEXT');
    addColumn('summons', 'date_of_2nd_statement', 'TEXT');
    addColumn('summons', 'date_of_3rd_statement', 'TEXT');
    addColumn('summons', 'previous_summon_id', 'TEXT');

    // New checkbox fields (INTEGER with DEFAULT 0)
    addColumn('summons', 'rescheduled_date_communicated', 'INTEGER', '0');
    addColumn('summons', 'followup_required', 'INTEGER', '0');

    console.log('');

    // === CASES TABLE MIGRATIONS ===
    console.log('📋 Migrating CASES table...');

    // New checkbox fields
    addColumn('cases', 'active', 'INTEGER', '1');
    addColumn('cases', 'whether_pc_filed', 'INTEGER', '0');

    // New text/date fields
    addColumn('cases', 'date_of_pc_filed', 'TEXT');
    addColumn('cases', 'court_cognizance_date', 'TEXT');
    addColumn('cases', 'poc_in_cr', 'TEXT');

    console.log('');
    console.log('=== MIGRATION COMPLETE ===');

    // Verify schema
    console.log('\n📊 Current SUMMONS columns:');
    const summonsInfo = db.prepare('PRAGMA table_info(summons)').all() as { name: string; type: string }[];
    summonsInfo.forEach(col => console.log(`   - ${col.name} (${col.type})`));

    console.log('\n📊 Current CASES columns:');
    const casesInfo = db.prepare('PRAGMA table_info(cases)').all() as { name: string; type: string }[];
    casesInfo.forEach(col => console.log(`   - ${col.name} (${col.type})`));

} catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
}

db.close();
console.log('\n✅ Database connection closed.');
