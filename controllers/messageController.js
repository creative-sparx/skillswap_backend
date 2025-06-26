import { Message } from '../models/Message.js'; // Corrected to named import (path relative to new controllers directory)
import SkillSwap from '../models/SkillSwap.js';
import { io } from '../server.js'; // Import the Socket.IO instance
import { sendPushNotification } from '../services/notificationService.js';

/**
 * @desc    Send a new message within a skill swap
 * @route   POST /api/swaps/:swapId/messages
 * @access  Private
 */
export const sendMessage = async (req, res) => {
  const { content, repliedToMessageId } = req.body;
  const { swapId } = req.params;
  const senderId = req.user.id;

  if (!content) {
    return res.status(400).json({ message: 'Message content cannot be empty.' });
  }

  try {
    const swap = await SkillSwap.findById(swapId).populate('participants', 'username fcmTokens');
    if (!swap) return res.status(404).json({ message: 'Skill swap not found.' });

    const recipient = swap.participants.find(p => p._id.toString() !== senderId);
    if (!recipient) return res.status(404).json({ message: 'Recipient not found.' });

    const newMessage = new Message({
      swap: swapId,
      sender: senderId,
      recipient: recipient._id,
      content: content,
      repliedToMessageId: repliedToMessageId, // Add reply support
    });
    await newMessage.save();

    // Populate for real-time and push notification
    await newMessage.populate([
      { path: 'sender', select: 'username avatar' },
      { path: 'recipient', select: 'username avatar' },
      { path: 'repliedToSender', select: 'username' }
    ]);

    // Emit real-time message
    io.to(swapId).emit('new_message_realtime', newMessage);

    // Send push notification
    if (recipient.fcmTokens && recipient.fcmTokens.length > 0) {
      const notificationTitle = `New message from ${newMessage.sender.username}`;
      const notificationBody = content.length > 100 ? `${content.substring(0, 97)}...` : content;
      await sendPushNotification(recipient.fcmTokens, notificationTitle, notificationBody, { type: 'new_message', swapId: swapId });
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Server error while sending message.' });
  }
};

/**
 * @desc    Get all messages for a specific swap
 * @route   GET /api/swaps/:swapId/messages
 * @access  Private
 */
export const getMessagesForSwap = async (req, res) => {
  const { swapId } = req.params;
  try {
    const messages = await Message.find({ swap: swapId })
      .populate('sender', 'username avatar')
      .populate('recipient', 'username avatar')
      .populate('repliedToSender', 'username')
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching messages.' });
  }
};

/**
 * @desc    Mark messages in a swap as read for the current user
 * @route   PUT /api/swaps/:swapId/messages/read
 * @access  Private
 */
export const markMessagesAsRead = async (req, res) => {
  const { swapId } = req.params;
  const userId = req.user.id;
  try {
    await Message.updateMany(
      { swap: swapId, recipient: userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );
    res.status(200).json({ message: 'Messages marked as read.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error marking messages as read.' });
  }
};
