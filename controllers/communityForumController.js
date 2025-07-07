import asyncHandler from '../utils/asyncHandler.js';
import CommunityForum from '../models/CommunityForum.js';
import Comment from '../models/Comment.js';

// @desc    Report/flag a forum post
// @route   POST /api/community-forum/:id/report
// @access  Private
export const reportPost = asyncHandler(async (req, res) => {
  const post = await CommunityForum.findById(req.params.id);
  if (!post) {
    return res.status(404).json({ message: 'Post not found' });
  }
  post.flagged = true;
  await post.save();
  res.status(200).json({ message: 'Post has been flagged for review.' });
});

// @desc    Get all forum posts
// @route   GET /api/community-forum
// @access  Public
export const getPosts = asyncHandler(async (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

// @desc    Get a forum post by ID
// @route   GET /api/community-forum/:id
// @access  Public
export const getPostById = asyncHandler(async (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

// @desc    Create a new forum post
// @route   POST /api/community-forum
// @access  Private
export const createPost = asyncHandler(async (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

// @desc    Get comments for a post
// @route   GET /api/community-forum/:id/comments
// @access  Public
export const getComments = asyncHandler(async (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

// @desc    Add a comment to a post
// @route   POST /api/community-forum/:id/comments
// @access  Private
export const addComment = asyncHandler(async (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});

// @desc    Upvote a forum post
// @route   POST /api/community-forum/:id/upvote
// @access  Private
export const upvotePost = asyncHandler(async (req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});
