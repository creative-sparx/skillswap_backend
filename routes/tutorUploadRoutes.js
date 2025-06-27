import express from 'express';
import upload from '../middlewares/uploadMiddleware.js';
import { protect } from '../middlewares/authMiddleware.js';
import { body } from 'express-validator';
import {
  uploadLessonVideo,
  uploadCourseThumbnail,
  uploadLessonResource
} from '../controllers/tutorUploadController.js';

const router = express.Router();

// Upload lesson video
router.post(
  '/lesson-video',
  protect,
  upload.single('file'),
  [body('courseId').isMongoId(), body('lessonIndex').isInt({ min: 0 })],
  uploadLessonVideo
);

// Upload course thumbnail
router.post(
  '/thumbnail',
  protect,
  upload.single('file'),
  [body('courseId').isMongoId()],
  uploadCourseThumbnail
);

// Upload lesson resource (PDF, slide, etc.)
router.post(
  '/lesson-resource',
  protect,
  upload.single('file'),
  [body('courseId').isMongoId(), body('lessonIndex').isInt({ min: 0 })],
  uploadLessonResource
);

export default router;
