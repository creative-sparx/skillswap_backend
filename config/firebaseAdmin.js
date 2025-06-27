import admin from 'firebase-admin';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin SDK
let firebaseInitialized = false;

try {
  // Check if we have Firebase service account credentials from environment variables
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    // Parse the service account from environment variable (for production)
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase Admin SDK initialized successfully from environment variable.');
    firebaseInitialized = true;
  } else {
    // Try to load from file (for local development)
    const serviceAccountPath = path.resolve(__dirname, process.env.FIREBASE_SERVICE_ACCOUNT_KEY_FILE || '../../firebase-adminsdk.json');
    
    if (fs.existsSync(serviceAccountPath)) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccountPath)
      });
      console.log('✅ Firebase Admin SDK initialized successfully from file.');
      firebaseInitialized = true;
    } else {
      console.warn('⚠️  Firebase Admin SDK not initialized: Service account file not found and FIREBASE_SERVICE_ACCOUNT_KEY environment variable not set.');
      console.warn('⚠️  Firebase features will be disabled.');
    }
  }
} catch (error) {
  console.error('❌ Firebase Admin SDK initialization failed:', error.message);
  console.warn('⚠️  Firebase features will be disabled.');
}

// Export a wrapper that checks if Firebase is initialized
const firebaseAdmin = {
  ...admin,
  isInitialized: () => firebaseInitialized
};

export default firebaseAdmin;
