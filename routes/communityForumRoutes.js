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
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

// These routes are based on the frontend's `forum_api.dart`
router.route('/')
  .get(getPosts)
  .post(authenticate, createPost);

router.route('/:id')
  .get(getPostById);

router.route('/:id/comments')
  .get(getComments)
  .post(authenticate, addComment);

router.route('/:id/upvote')
  .post(authenticate, upvotePost);

router.route('/:id/report')
  .post(authenticate, reportPost); // The new route for flagging

export default router;