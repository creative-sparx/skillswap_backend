import Course from '../models/Course.js';
import { validationResult } from 'express-validator';

// Upload lesson video and attach to a course lesson
export const uploadLessonVideo = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { courseId, lessonIndex } = req.body;
  if (!req.file || !req.file.path) return res.status(400).json({ error: 'No file uploaded' });
  const course = await Course.findById(courseId);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  if (String(course.tutor) !== String(req.user._id)) return res.status(403).json({ error: 'Not your course' });
  if (!course.lessons[lessonIndex]) return res.status(404).json({ error: 'Lesson not found' });
  course.lessons[lessonIndex].videoUrl = req.file.path;
  await course.save();
  res.json({ videoUrl: req.file.path });
};

// Upload course thumbnail
export const uploadCourseThumbnail = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { courseId } = req.body;
  if (!req.file || !req.file.path) return res.status(400).json({ error: 'No file uploaded' });
  const course = await Course.findById(courseId);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  if (String(course.tutor) !== String(req.user._id)) return res.status(403).json({ error: 'Not your course' });
  course.coverImage = req.file.path;
  await course.save();
  res.json({ coverImage: req.file.path });
};

// Upload lesson resource (PDF, slide, etc.)
export const uploadLessonResource = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { courseId, lessonIndex } = req.body;
  if (!req.file || !req.file.path) return res.status(400).json({ error: 'No file uploaded' });
  const course = await Course.findById(courseId);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  if (String(course.tutor) !== String(req.user._id)) return res.status(403).json({ error: 'Not your course' });
  if (!course.lessons[lessonIndex]) return res.status(404).json({ error: 'Lesson not found' });
  course.lessons[lessonIndex].resources.push(req.file.path);
  await course.save();
  res.json({ resourceUrl: req.file.path });
};
