import User from '../models/User.js';

/**
 * @desc    Add or update a user's FCM token
 * @route   POST /api/users/fcm-token
 * @access  Private
 */
export const addFCMToken = async (req, res) => {
  const { token } = req.body;
  const userId = req.user.id;

  if (!token) {
    return res.status(400).json({ message: 'FCM token is required.' });
  }

  try {
    // Add the new token to the user's fcmTokens array, avoiding duplicates
    await User.findByIdAndUpdate(userId, {
      $addToSet: { fcmTokens: token },
    });

    res.status(200).json({ message: 'FCM token updated successfully.' });
  } catch (error) {
    console.error('Error updating FCM token:', error);
    res.status(500).json({ message: 'Server error while updating FCM token.' });
  }
};