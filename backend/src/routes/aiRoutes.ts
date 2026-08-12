import express from 'express';
import { analyzeNotes, chatWithAI, analyzeImage, getAIUsage, generateCertification, AISchema } from '../controllers/aiController.js';
import { authenticateUser, checkAIQuota } from '../middlewares/auth.js';
import { validate } from '../middlewares/validation.js';

const router = express.Router();

router.post('/analyze', authenticateUser, checkAIQuota, validate(AISchema), analyzeNotes);
router.post('/chat', authenticateUser, checkAIQuota, chatWithAI);
router.post('/analyze-image', authenticateUser, checkAIQuota, analyzeImage);
router.post('/generate-certification', authenticateUser, checkAIQuota, generateCertification);
router.get('/usage', authenticateUser, getAIUsage);

export default router;

