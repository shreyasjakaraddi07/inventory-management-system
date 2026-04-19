import express from 'express';
import { completeOnboarding } from '../controllers/onboardingController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Complete onboarding (requires authentication)
router.post('/complete', authenticateToken, completeOnboarding);

export default router;
