import admin from '../config/firebaseAdmin.js';

/**
 * Sends a push notification to the specified device tokens.
 * @param {Array<string>} targetTokens - Array of FCM registration tokens.
 * @param {string} title - Notification title.
 * @param {string} body - Notification body.
 * @param {Object} [data={}] - Optional data payload.
 * @returns {Promise<Object>} - A Promise that resolves with the FCM response.
 */
export const sendPushNotification = async (targetTokens, title, body, data = {}) => {
  if (!targetTokens || targetTokens.length === 0) {
    console.log('No target tokens provided for notification.');
    return;
  }

  // Check if Firebase is initialized
  if (!admin.isInitialized()) {
    console.warn('Firebase Admin SDK not initialized. Push notification skipped.');
    return { success: false, message: 'Firebase not initialized' };
  }

  const message = {
    notification: {
      title: title,
      body: body
    },
    data: {
      ...data,
      click_action: 'FLUTTER_NOTIFICATION_CLICK' // Required for Flutter to handle the notification tap
    },
    tokens: targetTokens
  };

  try {
    const response = await admin.messaging().sendMulticast(message);
    console.log('Successfully sent message:', response.successCount);
    if (response.failureCount > 0) {
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.error(`Failed to send message to token ${targetTokens[idx]}:`, resp.error);
          // You might want to handle invalid tokens (e.g., remove them from the database)
        }
      });
    }
    return response;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};
