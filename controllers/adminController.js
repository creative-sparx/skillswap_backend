import User from '../models/User.js';
import Course from '../models/Course.js';
import SkillExchange from '../models/SkillExchange.js';
import CommunityForum from '../models/CommunityForum.js';
import mongoose from 'mongoose';

// --- USER MANAGEMENT ---
export const getAllUsers = async (req, res) => {
  const users = await User.find().select('-password');
  res.json(users);
};

export const banUser = async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { accountStatus: 'suspended' }, { new: true });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
};

export const unbanUser = async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { accountStatus: 'active' }, { new: true });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
};

export const promoteUser = async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
};

// --- COURSE, EXCHANGE, FORUM APPROVAL ---
export const approveCourse = async (req, res) => {
  const course = await Course.findByIdAndUpdate(req.params.id, { isPublished: true }, { new: true });
  if (!course) return res.status(404).json({ error: 'Course not found' });
  res.json(course);
};

export const rejectCourse = async (req, res) => {
  // A rejection will delete the course. A more advanced implementation could
  // add a 'status' field to the course model and set it to 'rejected'.
  const course = await Course.findByIdAndDelete(req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  res.json({ success: true, message: 'Course rejected and deleted successfully.' });
};

export const approveSkillExchange = async (req, res) => {
  const exchange = await SkillExchange.findByIdAndUpdate(req.params.id, { status: 'accepted' }, { new: true });
  if (!exchange) return res.status(404).json({ error: 'Skill exchange not found' });
  res.json(exchange);
};

export const rejectSkillExchange = async (req, res) => {
  const exchange = await SkillExchange.findByIdAndUpdate(req.params.id, { status: 'declined' }, { new: true });
  if (!exchange) return res.status(404).json({ error: 'Skill exchange not found' });
  res.json(exchange);
};

export const approveForumPost = async (req, res) => {
  const post = await CommunityForum.findByIdAndUpdate(req.params.id, { approved: true }, { new: true });
  if (!post) return res.status(404).json({ error: 'Forum post not found' });
  res.json(post);
};

export const rejectForumPost = async (req, res) => {
  const post = await CommunityForum.findByIdAndUpdate(req.params.id, { approved: false }, { new: true });
  if (!post) return res.status(404).json({ error: 'Forum post not found' });
  res.json(post);
};

// --- PENDING CONTENT ---
export const getPendingCourses = async (req, res) => {
  const courses = await Course.find({ isPublished: false }).populate('tutor', 'username avatar');
  res.json(courses);
};

export const getFlaggedPosts = async (req, res) => {
  // Assuming 'flagged' is a boolean field in the CommunityForum model
  const posts = await CommunityForum.find({ flagged: true }).populate('author', 'username avatar');
  res.json(posts);
};

// --- STATS & FLAGGED CONTENT ---
export const getStats = async (req, res) => {
  const userCount = await User.countDocuments();
  const courseCount = await Course.countDocuments();
  const exchangeCount = await SkillExchange.countDocuments();
  const forumCount = await CommunityForum.countDocuments();
  // Example: flagged content (could be a field in models)
  const flaggedForums = await CommunityForum.find({ flagged: true });
  res.json({ userCount, courseCount, exchangeCount, forumCount, flaggedForums });
};
