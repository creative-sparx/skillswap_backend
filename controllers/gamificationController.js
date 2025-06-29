import User from '../models/User.js';
import { validationResult } from 'express-validator';

// Add XP points for a user activity
export const addXP = async (req, res) => {
  const { userId, points, reason } = req.body;
  if (!userId || !points) {return res.status(400).json({ error: 'userId and points required' });}
  const user = await User.findById(userId);
  if (!user) {return res.status(404).json({ error: 'User not found' });}
  await user.addPoints(points, reason);
  res.json({ points: user.points, level: user.level });
};

// Unlock a badge for a user
export const unlockBadge = async (req, res) => {
  const { userId, name, description, icon } = req.body;
  if (!userId || !name) {return res.status(400).json({ error: 'userId and badge name required' });}
  const user = await User.findById(userId);
  if (!user) {return res.status(404).json({ error: 'User not found' });}
  user.badges.push({ name, description, icon });
  await user.save();
  res.json({ badges: user.badges });
};

// Get leaderboard (top users by points)
export const getLeaderboard = async (req, res) => {
  const { limit } = req.query;
  const topUsers = await User.getLeaderboard(Number(limit) || 10);
  res.json(topUsers);
};
