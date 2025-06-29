import { 
  auth, 
  firestore, 
  messaging,
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
  sendMulticastNotification
} from '../config/firebase.js';

/**
 * Firebase Service - High-level operations for SkillSwap app
 */
class FirebaseService {
  
  /**
   * User Management
   */
  
  // Create a new Firebase user
  async createFirebaseUser(userData) {
    try {
      const result = await createUser({
        email: userData.email,
        password: userData.password,
        displayName: userData.displayName || `${userData.firstName} ${userData.lastName}`,
        emailVerified: false,
        disabled: false
      });

      if (result.success) {
        // Set custom claims if provided
        if (userData.role) {
          await this.setUserRole(result.user.uid, userData.role);
        }

        return {
          success: true,
          user: result.user,
          firebaseUid: result.user.uid
        };
      }

      return result;
    } catch (error) {
      console.error('Create Firebase user error:', error);
      return { success: false, error: error.message };
    }
  }

  // Update Firebase user
  async updateFirebaseUser(uid, updateData) {
    try {
      const result = await updateUser(uid, updateData);
      return result;
    } catch (error) {
      console.error('Update Firebase user error:', error);
      return { success: false, error: error.message };
    }
  }

  // Delete Firebase user
  async deleteFirebaseUser(uid) {
    try {
      const result = await deleteUser(uid);
      return result;
    } catch (error) {
      console.error('Delete Firebase user error:', error);
      return { success: false, error: error.message };
    }
  }

  // Set user role/claims
  async setUserRole(uid, role) {
    try {
      const customClaims = { role };
      
      // Add specific claims based on role
      if (role === 'admin') {
        customClaims.admin = true;
      } else if (role === 'moderator') {
        customClaims.moderator = true;
      }

      await auth.setCustomUserClaims(uid, customClaims);
      
      return { success: true };
    } catch (error) {
      console.error('Set user role error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get user by email
  async getFirebaseUserByEmail(email) {
    try {
      const result = await getUserByEmail(email);
      return result;
    } catch (error) {
      console.error('Get Firebase user by email error:', error);
      return { success: false, error: error.message };
    }
  }

  // Verify ID token
  async verifyUserToken(idToken) {
    try {
      const result = await verifyIdToken(idToken);
      return result;
    } catch (error) {
      console.error('Verify user token error:', error);
      return { success: false, error: error.message };
    }
  }

  // Create custom token
  async createUserCustomToken(uid, additionalClaims = {}) {
    try {
      const result = await createCustomToken(uid, additionalClaims);
      return result;
    } catch (error) {
      console.error('Create custom token error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Firestore Operations
   */

  // User profile operations
  async createUserProfile(uid, profileData) {
    try {
      const result = await setDocument('users', uid, {
        ...profileData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      return result;
    } catch (error) {
      console.error('Create user profile error:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserProfile(uid) {
    try {
      const result = await getDocument('users', uid);
      return result;
    } catch (error) {
      console.error('Get user profile error:', error);
      return { success: false, error: error.message };
    }
  }

  async updateUserProfile(uid, updateData) {
    try {
      const result = await updateDocument('users', uid, {
        ...updateData,
        updatedAt: new Date()
      });
      return result;
    } catch (error) {
      console.error('Update user profile error:', error);
      return { success: false, error: error.message };
    }
  }

  // Skill swap operations
  async createSwapRequest(swapData) {
    try {
      const swapDoc = firestore.collection('swaps').doc();
      const result = await setDocument('swaps', swapDoc.id, {
        ...swapData,
        id: swapDoc.id,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      if (result.success) {
        return { success: true, swapId: swapDoc.id };
      }
      
      return result;
    } catch (error) {
      console.error('Create swap request error:', error);
      return { success: false, error: error.message };
    }
  }

  async updateSwapStatus(swapId, status, additionalData = {}) {
    try {
      const result = await updateDocument('swaps', swapId, {
        status,
        ...additionalData,
        updatedAt: new Date()
      });
      return result;
    } catch (error) {
      console.error('Update swap status error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Push Notifications
   */

  // Send notification to a single user
  async sendPushNotification(userToken, notification, data = {}) {
    try {
      const result = await sendNotification(userToken, notification, data);
      return result;
    } catch (error) {
      console.error('Send push notification error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send notification to multiple users
  async sendBulkNotification(userTokens, notification, data = {}) {
    try {
      const result = await sendMulticastNotification(userTokens, notification, data);
      return result;
    } catch (error) {
      console.error('Send bulk notification error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send notification about skill swap updates
  async notifySwapUpdate(recipientToken, swapDetails, status) {
    const notifications = {
      accepted: {
        title: '🎉 Skill Swap Accepted!',
        body: `Your skill swap request for "${swapDetails.skill}" has been accepted!`
      },
      declined: {
        title: '❌ Skill Swap Declined',
        body: `Your skill swap request for "${swapDetails.skill}" was declined.`
      },
      completed: {
        title: '✅ Skill Swap Completed',
        body: `Skill swap for "${swapDetails.skill}" has been completed!`
      },
      new_request: {
        title: '🔔 New Skill Swap Request',
        body: `Someone wants to learn "${swapDetails.skill}" from you!`
      }
    };

    const notification = notifications[status] || {
      title: 'Skill Swap Update',
      body: 'Your skill swap has been updated.'
    };

    return await this.sendPushNotification(
      recipientToken,
      notification,
      {
        type: 'skill_swap',
        swapId: swapDetails.id,
        status: status
      }
    );
  }

  // Send welcome notification
  async sendWelcomeNotification(userToken, userName) {
    const notification = {
      title: '🎓 Welcome to SkillSwap!',
      body: `Hi ${userName}! Start your skill exchange journey today.`
    };

    return await this.sendPushNotification(
      userToken,
      notification,
      {
        type: 'welcome',
        action: 'explore_skills'
      }
    );
  }

  /**
   * Analytics and Logging
   */

  // Log user activity
  async logUserActivity(uid, activity, metadata = {}) {
    try {
      const activityDoc = firestore.collection('user_activities').doc();
      const result = await setDocument('user_activities', activityDoc.id, {
        userId: uid,
        activity,
        metadata,
        timestamp: new Date()
      });
      
      return result;
    } catch (error) {
      console.error('Log user activity error:', error);
      return { success: false, error: error.message };
    }
  }

  // Log skill swap events
  async logSwapEvent(swapId, event, metadata = {}) {
    try {
      const eventDoc = firestore.collection('swap_events').doc();
      const result = await setDocument('swap_events', eventDoc.id, {
        swapId,
        event,
        metadata,
        timestamp: new Date()
      });
      
      return result;
    } catch (error) {
      console.error('Log swap event error:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new FirebaseService();
