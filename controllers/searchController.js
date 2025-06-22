import Course from '../models/Course.js';
import User from '../models/User.js';
import CommunityForum from '../models/CommunityForum.js';
import { validationResult } from 'express-validator';

// Search courses with filters
export const searchCourses = async (req, res) => {
  const { q, category, minPrice, maxPrice, level, minRating, tags } = req.query;
  const filter = { isPublished: true };
  if (q) filter.$text = { $search: q };
  if (category) filter.category = category;
  if (level) filter.level = level;
  if (minPrice) filter.price = { ...filter.price, $gte: Number(minPrice) };
  if (maxPrice) filter.price = { ...filter.price, $lte: Number(maxPrice) };
  if (minRating) filter.rating = { $gte: Number(minRating) };
  if (tags) filter.tags = { $in: tags.split(',') };
  const courses = await Course.find(filter).sort({ rating: -1, createdAt: -1 });
  res.json(courses);
};

// Search tutors (users with isTutor=true)
export const searchTutors = async (req, res) => {
  const { q, skills } = req.query;
  const filter = { isTutor: true, accountStatus: 'active' };
  if (q) filter.$text = { $search: q };
  if (skills) filter['skillsToTeach.skill'] = { $in: skills.split(',') };
  const tutors = await User.find(filter).select('username firstName lastName avatar skillsToTeach badges points level');
  res.json(tutors);
};

// Search forum threads
export const searchForums = async (req, res) => {
  const { q, tags } = req.query;
  const filter = {};
  if (q) filter.$text = { $search: q };
  if (tags) filter.tags = { $in: tags.split(',') };
  const forums = await CommunityForum.find(filter).sort({ createdAt: -1 });
  res.json(forums);
};

// Autocomplete endpoint (future-ready)
export const autocomplete = async (req, res) => {
  const { type, q } = req.query;
  if (!type || !q) return res.status(400).json({ error: 'Type and query required' });
  let results = [];
  switch (type) {
    case 'course':
      results = await Course.find({ title: { $regex: q, $options: 'i' } }).limit(10).select('title');
      break;
    case 'tutor':
      results = await User.find({ username: { $regex: q, $options: 'i' }, isTutor: true }).limit(10).select('username');
      break;
    case 'forum':
      results = await CommunityForum.find({ title: { $regex: q, $options: 'i' } }).limit(10).select('title');
      break;
    default:
      break;
  }
  res.json(results);
};
