import { createClient } from '@libsql/client';
import path from 'path';

const isProduction = process.env.NODE_ENV === 'production';

// Configuration for Turso (Remote) or Local SQLite
const url = process.env.TURSO_DATABASE_URL || `file:${path.join(process.cwd(), 'summons.db')}`;
const authToken = process.env.TURSO_AUTH_TOKEN;

const db = createClient({
  url: url,
  authToken: authToken,
});


let isInitialized = false;

/**
 * Initialize the database schema.
 * This should be called once on server startup or during deployment.
 * For Turso, you can also run these commands manually in their shell.
 */
export async function initDatabase() {
  if (isInitialized) return;

  try {
    await db.execute(`
            CREATE TABLE IF NOT EXISTS summons (
                id TEXT PRIMARY KEY,
                case_id TEXT NOT NULL,
                person_name TEXT NOT NULL,
                person_role TEXT,
                contact_number TEXT,
                email TEXT,
                officer_assigned_id TEXT,
                created_at TEXT,
                issue_date TEXT,
                appearance_date TEXT,
                rescheduled_date TEXT,
                appearance_time TEXT,
                status TEXT,
                statement_status TEXT,
                priority TEXT,
                mode_of_service TEXT,
                tone TEXT,
                purpose TEXT,
                notes TEXT,
                is_issued INTEGER DEFAULT 0,
                is_served INTEGER DEFAULT 0,
                requests_reschedule INTEGER DEFAULT 0,
                statement_ongoing INTEGER DEFAULT 0,
                statement_recorded INTEGER DEFAULT 0,
                summons_response TEXT,
                date_of_1st_statement TEXT,
                date_of_2nd_statement TEXT,
                date_of_3rd_statement TEXT,
                rescheduled_date_communicated INTEGER DEFAULT 0,
                followup_required INTEGER DEFAULT 0,
                previous_summon_id TEXT,
                served_date TEXT,
                synced_at TEXT
            )
        `);

    await db.execute(`
            CREATE TABLE IF NOT EXISTS cases (
                id TEXT PRIMARY KEY,
                name TEXT,
                ecir_no TEXT,
                date_of_ecir TEXT,
                status TEXT,
                assigned_officer TEXT,
                activity TEXT,
                pao_amount TEXT,
                pao_date TEXT,
                active INTEGER DEFAULT 1,
                whether_pc_filed INTEGER DEFAULT 0,
                date_of_pc_filed TEXT,
                court_cognizance_date TEXT,
                poc_in_cr TEXT,
                created_at TEXT,
                last_edited TEXT,
                synced_at TEXT
            )
        `);

    await db.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                first_name TEXT,
                last_name TEXT,
                role TEXT DEFAULT 'user',
                status TEXT DEFAULT 'pending',
                created_at TEXT NOT NULL
            )
        `);

    await db.execute(`
            CREATE TABLE IF NOT EXISTS activity_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                summons_id TEXT NOT NULL,
                user_id TEXT,
                action TEXT NOT NULL,
                field_name TEXT,
                old_value TEXT,
                new_value TEXT,
                description TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (summons_id) REFERENCES summons(id) ON DELETE CASCADE
            )
        `);

    await db.execute(`
            CREATE TABLE IF NOT EXISTS app_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                description TEXT,
                updated_at TEXT NOT NULL
            )
        `);

    await db.execute(`
            CREATE TABLE IF NOT EXISTS property_options (
                id TEXT PRIMARY KEY,
                property_name TEXT NOT NULL,
                option_value TEXT NOT NULL,
                is_default INTEGER DEFAULT 0,
                display_order INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                UNIQUE(property_name, option_value)
            )
        `);

    // Migrations
    try {
      await db.execute('ALTER TABLE summons ADD COLUMN served_date TEXT');
    } catch (e) { /* ignore if already exists */ }

    try {
      await db.execute('ALTER TABLE activity_logs ADD COLUMN user_id TEXT');
    } catch (e) { /* ignore if already exists */ }

    try {
      await db.execute('ALTER TABLE users ADD COLUMN role TEXT DEFAULT "user"');
    } catch (e) { /* ignore if already exists */ }

    try {
      await db.execute('ALTER TABLE users ADD COLUMN status TEXT DEFAULT "pending"');
    } catch (e) { /* ignore if already exists */ }

    isInitialized = true;
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

export default db;
