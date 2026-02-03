import db from '../lib/db';

try {
    console.log('Migrating database...');

    // Add synced_at to cases
    try {
        db.exec('ALTER TABLE cases ADD COLUMN synced_at TEXT');
        console.log('Added synced_at to cases');
    } catch (e: any) {
        if (e.message.includes('duplicate column')) {
            console.log('cases.synced_at already exists');
        } else {
            console.error('Error adding synced_at to cases:', e);
        }
    }

    // Add synced_at to summons
    try {
        db.exec('ALTER TABLE summons ADD COLUMN synced_at TEXT');
        console.log('Added synced_at to summons');
    } catch (e: any) {
        if (e.message.includes('duplicate column')) {
            console.log('summons.synced_at already exists');
        } else {
            console.error('Error adding synced_at to summons:', e);
        }
    }

    console.log('Migration complete.');
} catch (error) {
    console.error('Migration failed:', error);
}
