import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './utils/logger.js';
import { sendDiscordAlert } from './utils/alerts.js';
import Stripe from 'stripe';
import admin from 'firebase-admin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
}

// Registro de carga de variables de entorno para depuración (Sin revelar secretos)
if (!process.env.AI_GATEWAY_API_KEY) {
  logger.error("!!! ERROR CRÍTICO: AI_GATEWAY_API_KEY no cargada desde .env !!!");
  logger.info(`CWD actual: ${process.cwd()}`);
} else {
  logger.info("✅ AI_GATEWAY_API_KEY cargada correctamente.");
}

if (process.env.AI_MODEL_NAME) {
  logger.info(`Usando modelo configurado: ${process.env.AI_MODEL_NAME}`);
}

// -- INICIALIZACIÓN DE STRIPE --
let stripe: Stripe | null = null;
try {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (stripeKey) {
    stripe = new Stripe(stripeKey, {
      apiVersion: '2025-02-11' as any,
    });
    logger.info("✅ Stripe SDK inicializado correctamente.");
  } else {
    logger.warn("⚠️ STRIPE_SECRET_KEY no provista. Los endpoints de pagos no estarán disponibles.");
  }
} catch (error: any) {
  logger.error("❌ Error inicializando Stripe SDK: " + error.message);
}

let db: admin.firestore.Firestore | null = null;

// -- INICIALIZACIÓN DE FIREBASE ADMIN --
try {
  if (admin.apps.length === 0) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      admin.initializeApp();
    }
  }
  db = admin.firestore();
  logger.info("✅ Firebase Admin inicializado correctamente.");
} catch (error: any) {
  logger.warn("⚠️ Firebase Admin no pudo inicializarse (usando entorno local o sin credenciales): " + error.message);
}

const app = express();
const PORT = process.env.PORT || 4000;

// ── CONFIGURACIÓN DEL MODELO DE IA ──────────────────────────────────────────
// Para cambiar de modelo: solo modificar AI_MODEL_NAME en .env
// Ejemplos: gemma-4-26b-a4b-it | gemma-4-31b-it | gemini-2.0-flash | gemini-2.5-flash
const google = createGoogleGenerativeAI({
  apiKey: process.env.AI_GATEWAY_API_KEY || process.env.GEMINI_API_KEY || "",
});
const aiModelName = process.env.AI_MODEL_NAME || "gemma-4-26b-a4b-it";
const model = google(aiModelName);
logger.info(`🤖 Modelo de IA activo: ${aiModelName}`);
// ────────────────────────────────────────────────────────────────────────────

// ── CARGA DE CONTEXTO DE LA APP (APP_CONTEXT.md) ────────────────────────────
// Este archivo describe las funciones de MediFácil para que la IA pueda
// responder preguntas sobre cómo usar la app. Editar en backend/APP_CONTEXT.md
import fs from 'fs';
let APP_CONTEXT = "";
try {
  const contextPath = path.resolve(__dirname, '../APP_CONTEXT.md');
  APP_CONTEXT = fs.readFileSync(contextPath, 'utf-8');
  logger.info("✅ APP_CONTEXT.md cargado correctamente.");
} catch {
  logger.warn("⚠️ APP_CONTEXT.md no encontrado. El asistente no tendrá contexto de la app.");
}
// ────────────────────────────────────────────────────────────────────────────

// 1. CONFIGURACIÓN DE SEGURIDAD (Helmet)
app.use(helmet());

// -- MIDDLEWARE DE MONITORIZACIÓN Y LOGGING --
app.use((req, res, next) => {
  const start = Date.now();

  logger.info(`HTTP ${req.method} ${req.url}`, {
    context: { ip: req.ip, userAgent: req.get('User-Agent') }
  });

  res.on('finish', () => {
    const duration = Date.now() - start;

    if (duration > 1000) {
      const slowMsg = `Slow Query detected: ${req.method} ${req.url} took ${duration}ms`;
      logger.warn(slowMsg);
      if (duration > 5000) {
        sendDiscordAlert({
          title: 'Performance Critical',
          message: slowMsg,
          level: 'warn'
        });
      }
    }
  });

  next();
});

// 2. POLÍTICA CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'];
app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Permitir todos los orígenes locales en desarrollo
    if (!origin || allowedOrigins.includes(origin) || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      callback(null, true);
    } else {
      logger.warn(`CORS Bloqueado para origen: ${origin}`);
      callback(new Error('No permitido por CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));

// 3. RATE LIMITING POR IP (protección DoS general)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Demasiadas peticiones. Intenta de nuevo más tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// 4. PARSEO DE BODY
app.use('/api/webhook/stripe', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10kb' }));

// 5. MIDDLEWARE DE AUTENTICACIÓN (Firebase Admin)
const authenticateUser = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Bypass en entorno local si no hay FIREBASE_SERVICE_ACCOUNT
  if (!process.env.FIREBASE_SERVICE_ACCOUNT && process.env.NODE_ENV !== 'production') {
    const authHeader = req.headers.authorization;
    let mockUid = "local-dev-user";
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const idToken = authHeader.split('Bearer ')[1];
        const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
        mockUid = payload.user_id || payload.sub || mockUid;
      } catch (e) {
        // Ignorar error de decodificación
      }
    }
    logger.warn(`Saltando autenticación en modo local. Usando UID extraído: ${mockUid}`);
    (req as any).user = { uid: mockUid };
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado: Falta token de autenticación.' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    (req as any).user = decodedToken;
    next();
  } catch (error: any) {
    logger.error('Error verificando token de Firebase:', error.message);
    return res.status(401).json({ 
      error: 'Token inválido o expirado.',
      details: error.message
    });
  }
};

// 6. RATE LIMITING POR USUARIO/PLAN (Firestore)
// Límites diarios según plan — modificar aquí para ajustar cuotas
const AI_LIMITS: Record<string, number> = {
  free: 10,
  pro: 100,
  pro_clinica: 500,
};

const checkAIQuota = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!db) {
    logger.warn("Saltando checkAIQuota porque la base de datos no está disponible");
    if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({ error: 'Servicio de base de datos no disponible temporalmente.' });
    }
    return next();
  }

  if (!process.env.FIREBASE_SERVICE_ACCOUNT && process.env.NODE_ENV !== 'production') {
    logger.warn("Saltando checkAIQuota en modo local por falta de credenciales");
    return next();
  }

  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'No autorizado' });

  const userId = user.uid;
  const today = new Date().toISOString().split('T')[0]; // "2026-05-12"
  const usageRef = db.collection('ai_usage').doc(userId);

  try {
    const userDoc = await db.collection('users').doc(userId).get();
    const plan: string = userDoc.data()?.plan || 'free';
    const limit = AI_LIMITS[plan] ?? AI_LIMITS.free;

    const usageDoc = await usageRef.get();
    const usageData = usageDoc.data() || {};
    const todayCount: number = usageData[today] || 0;

    if (todayCount >= limit) {
      logger.warn(`Quota excedida para usuario ${userId} (plan: ${plan}, usado: ${todayCount}/${limit})`);
      return res.status(429).json({
        error: 'Límite diario de IA alcanzado.',
        limit,
        used: todayCount,
        plan,
        resetAt: 'midnight UTC',
      });
    }

    // Incrementar contador antes de procesar (previene race conditions)
    await usageRef.set({ [today]: todayCount + 1 }, { merge: true });

    // Exponer datos de quota en la request para uso posterior
    (req as any).aiQuota = { plan, used: todayCount + 1, limit };

    next();
  } catch (err: any) {
    logger.error('Error verificando quota de IA:', err.message);
    return res.status(500).json({ error: 'Error verificando límites de uso.' });
  }
};

// 7. VALIDACIÓN DE ENTRADAS (Zod)
const validate = (schema: z.ZodObject<any>) => (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (err: any) {
    return res.status(400).json({
      error: 'Entrada no válida',
      details: err.errors.map((e: any) => ({ path: e.path, message: e.message }))
    });
  }
};

// --- RUTAS API ---

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Servidor MediFácil operando con seguridad mejorada.',
    aiModel: aiModelName,
  });
});

// --- STRIPE DYNAMIC CHECKOUT ROUTES ---

app.post('/api/stripe/create-checkout-session', async (req, res) => {
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
});

app.post('/api/stripe/create-portal-session', async (req, res) => {
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
});

// --- WEBHOOK DE STRIPE ---

app.post('/api/webhook/stripe', async (req, res) => {
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
});

// --- ENDPOINTS DE IA ---
// Todos protegidos con authenticateUser + checkAIQuota
// Para cambiar modelo: solo modificar AI_MODEL_NAME en .env y redeploy

const AISchema = z.object({
  body: z.object({
    prompt: z.string().min(1).max(5000),
    context: z.string().optional(),
  }),
});

// ── HELPER: Consulta de contexto del doctor en Firestore ─────────────────────
// Detecta la intención del mensaje y carga datos relevantes de la DB
const buildDoctorContext = async (userId: string, userMessage: string): Promise<string> => {
  const lowerMsg = userMessage.toLowerCase();
  const contextParts: string[] = [];

  if (!db) {
    logger.warn('Advertencia: base de datos no inicializada, buildDoctorContext retornará vacío.');
    return '';
  }

  try {
    // Siempre cargar perfil básico del doctor
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    if (userData) {
      contextParts.push(`PERFIL DEL DOCTOR:
- Nombre: ${userData.displayName || userData.name || 'No especificado'}
- Email: ${userData.email || 'No especificado'}
- Plan: ${userData.plan || 'free'}
- Especialidad: ${userData.specialty || 'No especificada'}`);
    }

    // Si pregunta por pacientes → cargar lista de pacientes
    const askingAboutPatients =
      lowerMsg.includes('paciente') ||
      lowerMsg.includes('cuantos') ||
      lowerMsg.includes('cuántos') ||
      lowerMsg.includes('lista') ||
      lowerMsg.includes('registrado') ||
      lowerMsg.includes('busca') ||
      lowerMsg.includes('dime') ||
      lowerMsg.includes('historial');

    if (askingAboutPatients) {
      const patientsSnap = await db.collection('patients')
        .where('doctorUid', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(20) // Máximo 20 para no inflar el contexto
        .get();

      if (!patientsSnap.empty) {
        const patientList = patientsSnap.docs.map(doc => {
          const p = doc.data();
          return `  - ${p.name || 'Sin nombre'} | ${p.age ? p.age + ' años' : 'edad N/D'} | ${p.diagnosis || 'sin diagnóstico'} | Registrado: ${p.createdAt?.toDate?.()?.toLocaleDateString('es-DO') || 'N/D'}`;
        }).join('\n');

        contextParts.push(`PACIENTES REGISTRADOS (${patientsSnap.size} de los más recientes):
${patientList}`);
      } else {
        contextParts.push(`PACIENTES REGISTRADOS: Ninguno registrado aún.`);
      }
    }

    // Si pregunta por consultas recientes
    const askingAboutConsultations =
      lowerMsg.includes('consulta') ||
      lowerMsg.includes('cita') ||
      lowerMsg.includes('reciente') ||
      lowerMsg.includes('última') ||
      lowerMsg.includes('ultima');

    if (askingAboutConsultations) {
      const consultSnap = await db.collectionGroup('consultations')
        .where('doctorUid', '==', userId)
        .orderBy('date', 'desc')
        .limit(10)
        .get();

      if (!consultSnap.empty) {
        const consultList = consultSnap.docs.map(doc => {
          const c = doc.data();
          return `  - Paciente: ${c.patientName || 'N/D'} | Diagnóstico: ${c.diagnosis || 'N/D'} | Fecha: ${c.date?.toDate?.()?.toLocaleDateString('es-DO') || 'N/D'}`;
        }).join('\n');

        contextParts.push(`CONSULTAS RECIENTES (últimas ${consultSnap.size}):
${consultList}`);
      } else {
        contextParts.push(`CONSULTAS RECIENTES: Ninguna registrada aún.`);
      }
    }

  } catch (err: any) {
    logger.warn('Error cargando contexto del doctor:', err.message);
    // No falla el chat si Firestore falla — continúa sin contexto de DB
  }

  return contextParts.join('\n\n');
};
// ────────────────────────────────────────────────────────────────────────────

// Generador de Documentos Clínicos — Compatible con Gemma 4 (sin streamObject/responseSchema)
app.post('/api/ai/analyze', authenticateUser, checkAIQuota, validate(AISchema), async (req, res) => {
  const { prompt, context } = req.body;

  try {
    const fullPrompt = `Eres un asistente clínico médico profesional. Analiza las siguientes notas médicas y devuelve ÚNICAMENTE un objeto JSON válido con exactamente esta estructura, sin texto adicional antes ni después, sin bloques de markdown, sin explicaciones:
 
{
  "patientName": "nombre completo del paciente, o N/D si no se menciona",
  "findings": "hallazgos clínicos narrativos detallados y examen físico",
  "diagnosis": "diagnóstico presuntivo o código CIE-10 si aplica",
  "plan": "plan de manejo inmediato, medicamentos con dosis si se mencionan, o referencias",
  "vitals": {
    "bloodPressure": "presión arterial ej: 120/80 mmHg, o N/D",
    "heartRate": "frecuencia cardíaca en lpm, o N/D"
  }
}
 
Información del doctor: ${context || "No especificada"}
Notas médicas del doctor: "${prompt}"
 
Recuerda: responde SOLO con el JSON, nada más.`;

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    const quota = (req as any).aiQuota;
    if (quota) {
      res.setHeader('X-AI-Quota-Used', quota.used);
      res.setHeader('X-AI-Quota-Limit', quota.limit);
      res.setHeader('X-AI-Quota-Plan', quota.plan);
    }

    const result = await generateText({
      model: model,
      prompt: fullPrompt,
    });

    // Limpiar posibles bloques de markdown que algunos modelos añaden
    const clean = result.text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    try {
      const parsed = JSON.parse(clean);
      res.write(JSON.stringify(parsed) + "\n");
    } catch {
      // Si el modelo no devolvió JSON válido, encapsular el texto en findings
      logger.warn(`/api/ai/analyze: modelo no devolvió JSON válido, encapsulando texto.`);
      res.write(JSON.stringify({
        patientName: "N/D",
        findings: result.text,
        diagnosis: "N/D",
        plan: "N/D",
        vitals: { bloodPressure: "N/D", heartRate: "N/D" }
      }) + "\n");
    }

    res.end();

  } catch (error: any) {
    logger.error("Error calling AI SDK:", { error: error.message, stack: error.stack });

    sendDiscordAlert({
      title: 'AI SDK Failure',
      message: `Error en /api/ai/analyze. Model: ${aiModelName}`,
      level: 'error',
      context: { errMsg: error.message, path: '/api/ai/analyze' }
    });

    if (!res.headersSent) {
      res.status(500).json({ error: 'Error procesando solicitud de IA' });
    }
  }
});

// Chat Interactivo — Asistente con acceso a datos del doctor en Firestore
app.post('/api/ai/chat', authenticateUser, checkAIQuota, async (req, res) => {
  const { messages, prompt } = req.body;
  logger.info("AI Chat Request received", { messageCount: messages?.length, hasPrompt: !!prompt });

  if (!process.env.AI_GATEWAY_API_KEY && !process.env.GEMINI_API_KEY) {
    logger.error("Faltan API Keys en el servidor.");
    return res.status(500).json({ error: "Configuración incompleta: falta la API Key del asistente en el servidor." });
  }

  try {
    const userMessage = prompt || (messages && messages[messages.length - 1]?.content);

    if (!userMessage) {
      return res.status(400).json({ error: "Mensaje vacío" });
    }

    const userId = (req as any).user.uid;
    logger.info(`Processing chat for user: ${userId}`);

    // Cargar contexto de Firestore según la intención del mensaje
    const doctorContext = await buildDoctorContext(userId, userMessage);
    logger.info("Doctor context built successfully");

    // Construir el historial de conversación si viene del frontend
    const conversationHistory = messages && messages.length > 1
      ? messages.slice(0, -1).map((m: any) => `${m.role === 'user' ? 'Doctor' : 'Asistente'}: ${m.content}`).join('\n')
      : '';

    const fullPrompt = `Eres un Asistente Clínico Inteligente integrado en MediFácil, una plataforma de gestión médica para doctores.
 
INSTRUCCIONES:
- Ayudas al doctor con preguntas sobre sus pacientes, consultas, y el uso de la aplicación.
- Cuando el doctor pregunta por sus datos (pacientes, consultas), usa EXCLUSIVAMENTE la información del contexto provisto — no inventes datos.
- Si no hay datos en el contexto, indícalo claramente.
- Para preguntas sobre cómo usar MediFácil, usa la documentación de la app provista.
- Para preguntas clínicas generales, responde con criterio médico profesional y aclara que deben ser validadas por el profesional.
- Responde siempre en español, de forma concisa y profesional.
 
${APP_CONTEXT ? `DOCUMENTACIÓN DE MEDIFÁCIL:\n${APP_CONTEXT}\n` : ''}
${doctorContext ? `DATOS DEL DOCTOR EN ESTE MOMENTO:\n${doctorContext}\n` : ''}
${conversationHistory ? `HISTORIAL DE CONVERSACIÓN:\n${conversationHistory}\n` : ''}
Doctor: ${userMessage}
Asistente:`;

    logger.info("Sending prompt to AI model...");
    const result = await generateText({
      model: model,
      prompt: fullPrompt,
    });
    logger.info("AI response generated successfully");

    const quota = (req as any).aiQuota;
    res.json({
      text: result.text,
      quota: quota || null,
    });

  } catch (error: any) {
    logger.error("Error en AI Chat Proxy:", { error: error.message, stack: error.stack });
    res.status(500).json({
      error: "Error en el asistente de IA",
      details: error.message
    });
  }
});

// Análisis de Imágenes Médicas
app.post('/api/ai/analyze-image', authenticateUser, checkAIQuota, async (req, res) => {
  const { image, prompt } = req.body;

  if (!process.env.AI_GATEWAY_API_KEY) {
    return res.status(500).json({ error: "Configuración incompleta: falta la Gateway API Key." });
  }

  try {
    const result = await generateText({
      model: model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt || "Analiza esta imagen médica." },
            {
              type: 'image',
              image: image.startsWith('data:') ? new URL(image) : image
            },
          ],
        },
      ],
    });

    const quota = (req as any).aiQuota;
    res.json({
      text: result.text,
      quota: quota || null,
    });
  } catch (error: any) {
    logger.error("Error en Image Analysis Proxy:", { error: error.message });
    res.status(500).json({ error: "Error analizando la imagen", details: error.message });
  }
});

// Consulta de Quota del Usuario (para mostrar en UI)
app.get('/api/ai/usage', authenticateUser, async (req, res) => {
  const user = (req as any).user;
  const userId = user.uid;
  const today = new Date().toISOString().split('T')[0];

  if (!db) {
    logger.warn("Solicitud de /api/ai/usage con base de datos no disponible.");
    return res.status(200).json({
      plan: 'free',
      used: 0,
      limit: AI_LIMITS.free,
      remaining: AI_LIMITS.free,
      resetAt: 'midnight UTC',
      warning: 'Base de datos fuera de línea, mostrando cuota gratuita por defecto.'
    });
  }

  try {
    const userDoc = await db.collection('users').doc(userId).get();
    const plan: string = userDoc.data()?.plan || 'free';
    const limit = AI_LIMITS[plan] ?? AI_LIMITS.free;

    const usageDoc = await db.collection('ai_usage').doc(userId).get();
    const todayCount: number = usageDoc.data()?.[today] || 0;

    res.json({
      plan,
      used: todayCount,
      limit,
      remaining: Math.max(0, limit - todayCount),
      resetAt: 'midnight UTC',
    });
  } catch (err: any) {
    logger.error('Error obteniendo usage:', err.message);
    res.status(500).json({ error: 'Error obteniendo datos de uso.' });
  }
});

// Manejo de Errores Global
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error("Unhandled Global Error:", { error: err.message, stack: err.stack });

  sendDiscordAlert({
    title: 'Unhandled Server Error',
    message: err.message || 'Unknown error',
    level: 'error',
    context: { path: req.url, method: req.method }
  });

  res.status(500).json({ error: 'Ocurrió un error interno en el servidor.' });
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    logger.info(`🚀 Servidor seguro escuchando en puerto ${PORT}`, { context: { environment: process.env.NODE_ENV } });
  });
}

export default app;