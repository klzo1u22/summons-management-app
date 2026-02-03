import { db } from '../lib/firebase-admin';

async function verifyFirestore() {
    console.log('Starting Firestore verification...');
    const testCollection = 'verification_test';
    const testId = 'test_doc_' + Date.now();
    const testData = {
        message: 'Hello Firestore',
        timestamp: new Date().toISOString()
    };

    try {
        // 1. Write
        console.log(`Writing to ${testCollection}/${testId}...`);
        await db.collection(testCollection).doc(testId).set(testData);
        console.log('Write successful.');

        // 2. Read
        console.log(`Reading from ${testCollection}/${testId}...`);
        const doc = await db.collection(testCollection).doc(testId).get();
        if (!doc.exists) {
            throw new Error('Document not found after write!');
        }
        const data = doc.data();
        console.log('Read successful. Data:', data);

        if (data?.message !== testData.message) {
            throw new Error('Data mismatch!');
        }

        // 3. Delete
        console.log(`Deleting ${testCollection}/${testId}...`);
        await db.collection(testCollection).doc(testId).delete();
        console.log('Delete successful.');

        console.log('✅ Firestore verification passed!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Firestore verification failed:', error);
        process.exit(1);
    }
}

verifyFirestore();
