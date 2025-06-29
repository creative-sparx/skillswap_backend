

import admin from 'firebase-admin';
import logger from './logger.js';

try {
  let serviceAccount;

  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    // Decode base64-encoded service account key from env
    serviceAccount = JSON.parse(
      Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf8')
    );
    logger.info('✅ Firebase Admin SDK initialized from FIREBASE_SERVICE_ACCOUNT_KEY');
  } else if (process.env.FIREBASE_PRIVATE_KEY) {
    // Use individual environment variables
    serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') // Handle newline characters
    };
    logger.info('✅ Firebase Admin SDK initialized from environment variables');
  } else {
    throw new Error('Firebase credentials not found in environment variables.');
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    logger.info('✅ Firebase Admin SDK initialized successfully');
  }
} catch (error) {
  logger.error(`⚠️  Firebase Admin SDK not initialized: ${error.message}`);
  logger.warn('⚠️  Firebase features will be disabled.');
}
export default admin;
