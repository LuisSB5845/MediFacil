import express from 'express';
import { stripe } from '../config/stripe.js';
import { db, admin } from '../config/firebase.js';
import logger from '../utils/logger.js';
import { sendDiscordAlert } from '../utils/alerts.js';
import Stripe from 'stripe';

export const createCheckoutSession = async (req: express.Request, res: express.Response) => {
  const { priceId, userId, userEmail } = req.body;

  if (!stripe) {
    logger.warn('Intento de crear sesión de checkout sin Stripe inicializado.');
    return res.status(503).json({ error: 'El servicio de pagos no está disponible en este momento.' });
  }

  if (!priceId || !userId) {
    return res.status(400).json({ error: 'Faltan parámetros: priceId o userId' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${req.headers.origin}/?payment_success=true`,
      cancel_url: `${req.headers.origin}/?payment_cancel=true`,
      customer_email: userEmail,
      client_reference_id: userId,
      metadata: { userId },
    });

    res.json({ url: session.url });
  } catch (error: any) {
    logger.error('Error creando sesión de checkout:', error);
    res.status(500).json({ error: error.message });
  }
};

export const createPortalSession = async (req: express.Request, res: express.Response) => {
  const { customerId } = req.body;

  if (!stripe) {
    logger.warn('Intento de crear sesión de portal sin Stripe inicializado.');
    return res.status(503).json({ error: 'El servicio de pagos no está disponible en este momento.' });
  }

  if (!customerId) {
    return res.status(400).json({ error: 'Falta customerId' });
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${req.headers.origin}/plans`,
    });

    res.json({ url: session.url });
  } catch (error: any) {
    logger.error('Error creando sesión de portal:', error);
    res.status(500).json({ error: error.message });
  }
};

export const handleStripeWebhook = async (req: express.Request, res: express.Response) => {
  const sig = req.headers['stripe-signature'] as string;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe) {
    logger.warn('Recibido webhook de Stripe pero el servicio de pagos no está inicializado.');
    return res.status(503).send('Stripe service not initialized');
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret || '');
  } catch (err: any) {
    logger.error(`❌ Error en Webhook Signature: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  logger.info(`🔔 Stripe Event Received: ${event.type}`);

  try {
    if (!db) {
      throw new Error("Base de datos no disponible para procesar webhooks de Stripe");
    }
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id;

        if (userId) {
          await db.collection('users').doc(userId).update({
            plan: 'pro',
            stripeCustomerId: session.customer,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          logger.info(`✅ Usuario ${userId} ascendido a PLAN PRO.`);

          sendDiscordAlert({
            title: 'Nueva Suscripción',
            message: `El usuario ${userId} (${session.customer_details?.email}) se ha suscrito al Plan Pro.`,
            level: 'info'
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const userSnapshot = await db.collection('users')
          .where('stripeCustomerId', '==', customerId)
          .limit(1)
          .get();

        if (!userSnapshot.empty) {
          const userDoc = userSnapshot.docs[0];
          await userDoc.ref.update({
            plan: 'free',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          logger.info(`📉 Suscripción cancelada para el cliente ${customerId}. Usuario vuelto a PLAN FREE.`);

          sendDiscordAlert({
            title: 'Suscripción Cancelada',
            message: `La suscripción del cliente ${customerId} ha sido eliminada. El usuario ha vuelto al plan gratuito.`,
            level: 'warn'
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        logger.warn(`⚠️ Pago fallido para la factura ${invoice.id} del cliente ${invoice.customer}`);
        break;
      }

      default:
        logger.info(`Unhandled event type ${event.type}`);
    }
  } catch (err: any) {
    logger.error(`❌ Error procesando evento de Stripe: ${err.message}`);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }

  res.json({ received: true });
};
