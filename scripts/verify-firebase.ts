
import * as dotenv from 'dotenv';
import { cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';

dotenv.config({ path: '.env.local' });

// Mocking the initialization logic from lib/firebase-admin.ts to verify credentials
let serviceAccount;

try {
    // Try loading from file
    serviceAccount = require('../service-account.json');
    console.log("✅ Found service-account.json");
} catch (e) {
    console.log("⚠️ service-account.json not found, checking env var...");
}

if (!serviceAccount && process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        console.log("✅ FIREBASE_SERVICE_ACCOUNT_KEY parsed from env");
    } catch (e: any) {
        console.error("❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:", e.message);
    }
}

if (!serviceAccount) {
    console.error("❌ No credentials found (checked service-account.json and FIREBASE_SERVICE_ACCOUNT_KEY)");
    process.exit(1);
}

// Initialize a temporary app for verification
if (!admin.apps.length) {
    admin.initializeApp({
        credential: cert(serviceAccount)
    }, 'verify-app');
}

const db = getFirestore(admin.app('verify-app'));

async function verify() {
    console.log("Verifying Firebase Connection...");

    try {
        console.log("Attempting to list collections...");
        const collections = await db.listCollections();
        console.log(`✅ Connection success! Found ${collections.length} collections:`, collections.map(c => c.id));
    } catch (e: any) {
        console.error("❌ Read failed:", e.message);
        if (e.code) console.log("Code:", e.code);
    }
}

verify();
