import asyncHandler from '../utils/asyncHandler.js';
import User from '../models/User.js';
import Badge from '../models/Badge.js';

/**
 * @desc    Add XP to a user and handle level progression
 * @route   POST /api/gamification/xp
 * @access  Private
 */
export const addXP = asyncHandler(async (req, res) => {
  const { userId, points, reason } = req.body;
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  // Increment XP
  user.xp = (user.xp || 0) + Number(points);

  // Recalculate level: e.g., every 1000 XP = 1 level
  const newLevel = Math.floor(user.xp / 1000) + 1;
  if (newLevel > user.level) {
    user.level = newLevel;
  }

  await user.save();
  res.json({ success: true, xp: user.xp, level: user.level, message: 'XP added' });
});

/**
 * @desc    Unlock a badge for a user
 * @route   POST /api/gamification/badge
 * @access  Private
 */
export const unlockBadge = asyncHandler(async (req, res) => {
  const { userId, name, description, icon } = req.body;
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  // Find or create badge by name
  let badge = await Badge.findOne({ name });
  if (!badge) {
    badge = await Badge.create({ name, description, icon });
  }

  // Avoid duplicates
  if (!user.badges.includes(badge._id)) {
    user.badges.push(badge._id);
    await user.save();
  }

  res.json({ success: true, badges: user.badges, message: 'Badge unlocked' });
});

/**
 * @desc    Get leaderboard of top users by XP
 * @route   GET /api/gamification/leaderboard
 * @access  Public
 */
export const getLeaderboard = asyncHandler(async (req, res) => {
  const limit = Number(req.query.limit) || 10;
  // Use static method defined on User model
  const users = await User.getLeaderboard(limit);
  res.json({ success: true, users });
});

/**
 * @desc    Get all badges
 * @route   GET /api/gamification/badges
 * @access  Public
 */
export const getBadges = asyncHandler(async (req, res) => {
  const badges = await Badge.find().sort({ xpThreshold: 1 });
  res.json({ success: true, badges });
});