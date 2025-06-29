import asyncHandler from '../utils/asyncHandler.js'; // Use only the correct path
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
 
dotenv.config();

// @desc    Chat with AI Assistant
// Access your API key as an environment variable (see .env file)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// For text-only input, use the gemini-pro model
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

// Helper function to generate context-aware prompts
const generateContextPrompt = (message, context) => {
  let prompt = `User message: "${message}"\n\n`;
  switch (context) {
  case 'home':
    prompt += 'The user is currently viewing the home screen of SkillSwap, a platform for sharing and learning skills. They may want to discover available courses, participate in skill exchanges, or use community options. As an AI assistant for SkillSwap, help guide them to relevant features or answer their questions based on their message.';
    break;
  case 'courses':
    prompt += 'The user is browsing courses on SkillSwap. They might be asking about specific topics, recommendations, or course details. Respond as a helpful AI assistant for SkillSwap, focusing on course-related information.';
    break;
  case 'skill_exchange':
    prompt += 'The user is interested in skill exchanges on SkillSwap. They might be asking how it works, how to offer a skill, or how to request one. Respond as a helpful AI assistant for SkillSwap, focusing on skill exchange processes.';
    break;
  default:
    prompt += 'The user is interacting with a general AI assistant in a skill-sharing app called SkillSwap. Provide a helpful and relevant response based on their message, keeping the app\'s purpose in mind.';
  }
  return prompt;
};

// @desc    Chat with Gemini AI Assistant
// @route   POST /api/ai/chat
// @access  Private
export const chatWithAi = asyncHandler(async (req, res) => {
  const { message, context } = req.body;

  if (!message) {
    return res.status(400).json({ success: false, message: 'Message is required.' }); // 400 Bad Request
  }

  try {
    const prompt = generateContextPrompt(message, context);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const reply = response.text();
    res.status(200).json({ success: true, reply }); // 200 OK
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error communicating with Gemini API:', error);
    }
    res.status(500).json({ success: false, message: 'Failed to get a response from AI. Please try again later.' }); // 500 Internal Server Error
  }
});