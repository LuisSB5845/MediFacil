import express from 'express';
import { createCheckoutSession, createPortalSession, handleStripeWebhook } from '../controllers/paymentController.js';
import { authenticateUser } from '../middlewares/auth.js';

const router = express.Router();

// Stripe checkout session creation
router.post('/create-checkout-session', authenticateUser, createCheckoutSession);

// Stripe billing portal
router.post('/create-portal-session', authenticateUser, createPortalSession);

// Webhook endpoint (Requires raw body, handled in server.ts middleware mounting)
router.post('/webhook', handleStripeWebhook);

export default router;
