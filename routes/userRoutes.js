import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import User from '../models/User.js';

const router = express.Router();

// Route to handle FCM token updates for a user
router.put('/:id/fcm-token', authenticate, async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ message: 'FCM token is required' });
  }

  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update the user's FCM tokens, ensuring uniqueness
    if (!user.fcmTokens.includes(token)) {
      user.fcmTokens.push(token);
      await user.save();
    }

    res.status(200).json({ message: 'FCM token updated successfully' });
  } catch (error) {
    console.error('Error updating FCM token:', error);
    res.status(500).json({ message: 'Server error' });
  }
});













export default router;