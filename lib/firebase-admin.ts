import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';


let serviceAccount;

try {
    // Try loading from file
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    serviceAccount = require('../service-account.json');
} catch (e) {
    // Fallback to Env Var
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        try {
            serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        } catch (e) {
            console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY", e);
        }
    }
}

const firebaseAdminConfig = serviceAccount
    ? { credential: cert(serviceAccount) }
    : { projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID };

if (!getApps().length) {
    initializeApp(firebaseAdminConfig);
}


const db = getFirestore();

export { db };
