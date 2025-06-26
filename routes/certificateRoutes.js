import express from 'express';
import { body } from 'express-validator';
import {
  createCertificate,
  getAllCertificates,
  getCertificateById,
  updateCertificate,
  deleteCertificate
} from '../controllers/certificateController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public: Get all certificates (optionally filter by user/course)
router.get('/', getAllCertificates);

// Public: Get certificate by ID
router.get('/:id', getCertificateById);

// Protected: Create certificate
router.post(
  '/',
  protect,
  [
    body('user').isMongoId(),
    body('course').isMongoId(),
    body('certificateNumber').isString().isLength({ min: 6, max: 64 })
  ],
  createCertificate
);

// Protected: Update certificate
router.put(
  '/:id',
  protect,
  [
    body('certificateNumber').optional().isString().isLength({ min: 6, max: 64 })
  ],
  updateCertificate
);

// Protected: Delete certificate
router.delete('/:id', protect, deleteCertificate);

export default router;
