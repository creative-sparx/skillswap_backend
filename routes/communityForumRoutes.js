import express from 'express';
import {
  getPosts,
  getPostById,
  createPost,
  reportPost,
  getComments,
  addComment,
  upvotePost
} from '../controllers/communityForumController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// These routes are based on the frontend's `forum_api.dart`
router.route('/')
  .get(getPosts)
  .post(protect, createPost);

router.route('/:id')
  .get(getPostById);

router.route('/:id/comments')
  .get(getComments)
  .post(protect, addComment);

router.route('/:id/upvote')
  .post(protect, upvotePost);

router.route('/:id/report')
  .post(protect, reportPost); // The new route for flagging

export default router;
