import asyncHandler from '../middleware/asyncHandler.js';

// @desc    Chat with AI Assistant
// @route   POST /api/ai/chat
// @access  Private
export const chatWithAi = asyncHandler(async (req, res) => {
  const { message, context } = req.body;

  if (!message) {
    return res.status(400).json({ success: false, message: 'Message is required.' });
  }

  // Simulate a context-aware response
  let reply = "I'm sorry, I'm not sure how to help with that. Can you try asking something else?";

  switch (context) {
    case 'home':
      reply = "Welcome to SkillSwap! I can help you find courses, skill exchanges, or navigate the community forum. What are you looking for today?";
      break;
    case 'courses':
      reply = "Great! We have a wide range of courses. Are you interested in a specific topic like 'Programming' or 'Design'?";
      break;
    case 'skill_exchange':
      reply = "Skill exchanges are a great way to learn! Are you looking to offer a skill or request one?";
      break;
  }

  res.status(200).json({ success: true, reply });
});