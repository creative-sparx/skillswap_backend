import express from 'express';
import upload from '../middlewares/uploadMiddleware.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// POST /api/upload - Secure file/video upload
router.post('/', protect, upload.single('file'), (req, res) => {
  if (!req.file || !req.file.path) {
    return res.status(400).json({ error: 'Upload failed' });
  }
  res.status(201).json({
    url: req.file.path,
    public_id: req.file.filename || req.file.public_id,
    resource_type: req.file.mimetype
  });
});

export default router;
