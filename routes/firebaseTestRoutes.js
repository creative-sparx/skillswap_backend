import express from 'express';
import firebaseService from '../services/firebaseService.js';
import { verifyFirebaseToken } from '../middleware/firebaseAuth.js';
import { auth, firestore } from '../config/firebase.js';

const router = express.Router();

// Test Firebase connection
router.get('/test-connection', async (req, res) => {
  try {
    // Test Firebase Auth
    const authTest = await auth.listUsers(1);
    
    // Test Firestore
    const firestoreTest = await firestore.collection('test').limit(1).get();
    
    res.json({
      success: true,
      message: 'Firebase services are connected successfully',
      tests: {
        auth: authTest ? 'Connected' : 'Failed',
        firestore: firestoreTest ? 'Connected' : 'Failed'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Firebase connection test failed',
      error: error.message
    });
  }
});

// Test token verification
router.post('/verify-token', async (req, res) => {
  try {
    const { idToken } = req.body;
    
    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'ID token is required'
      });
    }

    const result = await firebaseService.verifyUserToken(idToken);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Token verified successfully',
        user: {
          uid: result.user.uid,
          email: result.user.email,
          email_verified: result.user.email_verified,
          firebase: result.user.firebase
        }
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Token verification failed',
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Token verification error',
      error: error.message
    });
  }
});

// Test creating a custom token (admin only)
router.post('/create-custom-token', verifyFirebaseToken, async (req, res) => {
  try {
    const { uid, claims } = req.body;
    
    if (!uid) {
      return res.status(400).json({
        success: false,
        message: 'UID is required'
      });
    }

    const result = await firebaseService.createUserCustomToken(uid, claims || {});
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Custom token created successfully',
        token: result.token
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Custom token creation failed',
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Custom token creation error',
      error: error.message
    });
  }
});

// Test Firestore operations
router.post('/test-firestore', async (req, res) => {
  try {
    const testData = {
      message: 'Firebase Firestore test',
      timestamp: new Date(),
      source: 'skillswap-backend-test'
    };

    // Create a test document
    const docRef = firestore.collection('tests').doc();
    await docRef.set(testData);

    // Read the document back
    const doc = await docRef.get();
    
    if (doc.exists) {
      // Clean up - delete the test document
      await docRef.delete();
      
      res.json({
        success: true,
        message: 'Firestore test completed successfully',
        data: doc.data()
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to read test document from Firestore'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Firestore test failed',
      error: error.message
    });
  }
});

// Test user profile operations
router.post('/test-user-profile', verifyFirebaseToken, async (req, res) => {
  try {
    const uid = req.firebaseUid;
    const testProfile = {
      firstName: 'Test',
      lastName: 'User',
      skills: ['JavaScript', 'Node.js'],
      bio: 'This is a test profile'
    };

    // Create profile
    const createResult = await firebaseService.createUserProfile(uid, testProfile);
    
    if (!createResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create test profile',
        error: createResult.error
      });
    }

    // Read profile
    const readResult = await firebaseService.getUserProfile(uid);
    
    if (!readResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to read test profile',
        error: readResult.error
      });
    }

    // Update profile
    const updateResult = await firebaseService.updateUserProfile(uid, {
      bio: 'Updated test profile'
    });

    if (!updateResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update test profile',
        error: updateResult.error
      });
    }

    res.json({
      success: true,
      message: 'User profile test completed successfully',
      operations: {
        create: 'Success',
        read: 'Success',
        update: 'Success'
      },
      profile: readResult.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'User profile test failed',
      error: error.message
    });
  }
});

// Test push notification (requires FCM token)
router.post('/test-notification', async (req, res) => {
  try {
    const { token, title, body } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'FCM token is required'
      });
    }

    const notification = {
      title: title || 'Test Notification',
      body: body || 'This is a test notification from SkillSwap backend'
    };

    const result = await firebaseService.sendPushNotification(
      token,
      notification,
      { test: true }
    );

    if (result.success) {
      res.json({
        success: true,
        message: 'Test notification sent successfully',
        messageId: result.messageId
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send test notification',
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Notification test failed',
      error: error.message
    });
  }
});

// Get Firebase project info
router.get('/project-info', async (req, res) => {
  try {
    // Get project ID from Firebase app
    const app = auth.app;
    const projectId = app.options.projectId;

    res.json({
      success: true,
      projectId: projectId,
      message: 'Firebase project information retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get project information',
      error: error.message
    });
  }
});

export default router;
