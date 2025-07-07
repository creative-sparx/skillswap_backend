import express from 'express';
import { getAllPlans, createPlan, updatePlan, deletePlan } from '../controllers/subscriptionPlanController.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = express.Router();

// Public: fetch plans
router.get('/', asyncHandler(getAllPlans));

// Admin: create plan
router.post('/', asyncHandler(createPlan));

// Admin: update plan
router.put('/:id', asyncHandler(updatePlan));

// Admin: deactivate plan
router.delete('/:id', asyncHandler(deletePlan));

export default router;