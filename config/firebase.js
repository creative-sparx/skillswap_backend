import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin SDK
let firebaseApp;

try {
  // Path to service account key
  const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account-key.json');
  
  // Read service account key
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
  
  // Initialize Firebase Admin
  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
  
  console.log('✅ Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
  
  // Fallback: Try to initialize with environment variables
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    try {
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        }),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
      console.log('✅ Firebase Admin SDK initialized with environment variables');
    } catch (envError) {
      console.error('❌ Failed to initialize Firebase with environment variables:', envError.message);
    }
  }
}

// Export Firebase services
export const auth = admin.auth();
export const firestore = admin.firestore();
export const messaging = admin.messaging();
export const storage = admin.storage();

// Export the app instance
export { firebaseApp };

// Helper functions for common Firebase operations
export const verifyIdToken = async (idToken) => {
  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    return { success: true, user: decodedToken };
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return { success: false, error: error.message };
  }
};

export const createCustomToken = async (uid, additionalClaims = {}) => {
  try {
    const customToken = await auth.createCustomToken(uid, additionalClaims);
    return { success: true, token: customToken };
  } catch (error) {
    console.error('Custom token creation failed:', error.message);
    return { success: false, error: error.message };
  }
};

export const getUserByEmail = async (email) => {
  try {
    const userRecord = await auth.getUserByEmail(email);
    return { success: true, user: userRecord };
  } catch (error) {
    console.error('Get user by email failed:', error.message);
    return { success: false, error: error.message };
  }
};

export const createUser = async (userData) => {
  try {
    const userRecord = await auth.createUser(userData);
    return { success: true, user: userRecord };
  } catch (error) {
    console.error('Create user failed:', error.message);
    return { success: false, error: error.message };
  }
};

export const updateUser = async (uid, userData) => {
  try {
    const userRecord = await auth.updateUser(uid, userData);
    return { success: true, user: userRecord };
  } catch (error) {
    console.error('Update user failed:', error.message);
    return { success: false, error: error.message };
  }
};

export const deleteUser = async (uid) => {
  try {
    await auth.deleteUser(uid);
    return { success: true };
  } catch (error) {
    console.error('Delete user failed:', error.message);
    return { success: false, error: error.message };
  }
};

// Firestore helper functions
export const getDocument = async (collection, docId) => {
  try {
    const doc = await firestore.collection(collection).doc(docId).get();
    if (doc.exists) {
      return { success: true, data: { id: doc.id, ...doc.data() } };
    } else {
      return { success: false, error: 'Document not found' };
    }
  } catch (error) {
    console.error('Get document failed:', error.message);
    return { success: false, error: error.message };
  }
};

export const setDocument = async (collection, docId, data) => {
  try {
    await firestore.collection(collection).doc(docId).set(data);
    return { success: true };
  } catch (error) {
    console.error('Set document failed:', error.message);
    return { success: false, error: error.message };
  }
};

export const updateDocument = async (collection, docId, data) => {
  try {
    await firestore.collection(collection).doc(docId).update(data);
    return { success: true };
  } catch (error) {
    console.error('Update document failed:', error.message);
    return { success: false, error: error.message };
  }
};

export const deleteDocument = async (collection, docId) => {
  try {
    await firestore.collection(collection).doc(docId).delete();
    return { success: true };
  } catch (error) {
    console.error('Delete document failed:', error.message);
    return { success: false, error: error.message };
  }
};

// Send push notification
export const sendNotification = async (token, notification, data = {}) => {
  try {
    const message = {
      token,
      notification,
      data,
    };
    
    const response = await messaging.send(message);
    return { success: true, messageId: response };
  } catch (error) {
    console.error('Send notification failed:', error.message);
    return { success: false, error: error.message };
  }
};

// Send notification to multiple devices
export const sendMulticastNotification = async (tokens, notification, data = {}) => {
  try {
    const message = {
      tokens,
      notification,
      data,
    };
    
    const response = await messaging.sendMulticast(message);
    return { success: true, response };
  } catch (error) {
    console.error('Send multicast notification failed:', error.message);
    return { success: false, error: error.message };
  }
};

export default {
  auth,
  firestore,
  messaging,
  storage,
  verifyIdToken,
  createCustomToken,
  getUserByEmail,
  createUser,
  updateUser,
  deleteUser,
  getDocument,
  setDocument,
  updateDocument,
  deleteDocument,
  sendNotification,
  sendMulticastNotification,
};
