import express from 'express';
import { sendMessage, markMessagesAsRead, getMessagesForSwap } from '../controllers/messageController.js'; // Import new functions
import { protect } from '../middlewares/authMiddleware.js'; // Assuming you have auth middleware

const router = express.Router();

// Define the route for sending a message within a specific swap
// POST /api/swaps/:swapId/messages
router.post('/:swapId/messages', protect, sendMessage);

// Define the route for marking messages as read within a specific swap
// PUT /api/swaps/:swapId/messages/read
router.put('/:swapId/messages/read', protect, markMessagesAsRead);

// Define the route for getting messages within a specific swap
// GET /api/swaps/:swapId/messages
router.get('/:swapId/messages', protect, getMessagesForSwap);

// You can add other swap-related routes here, e.g., for creating or getting swaps.
// router.post('/', protect, createSwap);

export default router;