import express from 'express';
import { analyzeNotes, chatWithAI, analyzeImage, getAIUsage, generateCertification, AISchema } from '../controllers/aiController.js';
import { authenticateUser, checkAIQuota } from '../middlewares/auth.js';
import { validate } from '../middlewares/validation.js';

const router = express.Router();

router.post('/analyze', authenticateUser, checkAIQuota('chat'), validate(AISchema), analyzeNotes);
router.post('/chat', authenticateUser, checkAIQuota('chat'), chatWithAI);
router.post('/analyze-image', authenticateUser, checkAIQuota('chat'), analyzeImage);
router.post('/generate-certification', authenticateUser, checkAIQuota('docs'), generateCertification);
router.get('/usage', authenticateUser, getAIUsage);

export default router;

