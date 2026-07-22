import Stripe from 'stripe';
import logger from '../utils/logger.js';

let stripe: Stripe | null = null;

try {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (stripeKey) {
    stripe = new Stripe(stripeKey, {
      apiVersion: '2025-02-11' as any,
    });
    logger.info("✅ Stripe SDK inicializado correctamente (Config).");
  } else {
    logger.warn("⚠️ STRIPE_SECRET_KEY no provista en Config.");
  }
} catch (error: any) {
  logger.error("❌ Error inicializando Stripe SDK en Config: " + error.message);
}

export { stripe };
