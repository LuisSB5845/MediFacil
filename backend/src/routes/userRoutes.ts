import express from 'express';
import { updateUserProfile, getUserProfile } from '../controllers/userController.js';
import { authenticateUser } from '../middlewares/auth.js';

const router = express.Router();

router.patch('/profile', authenticateUser, updateUserProfile);
router.get('/profile', authenticateUser, getUserProfile);

export default router;
