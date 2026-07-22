import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './utils/logger.js';
import { sendDiscordAlert } from './utils/alerts.js';

// Inicialización de configuraciones centrales
import './config/firebase.js';
import './config/stripe.js';
import { aiModelName } from './config/ai.js';

// Importación de rutas y controladores
import paymentRoutes from './routes/paymentRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import { handleStripeWebhook } from './controllers/paymentController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
}

const app = express();
const PORT = process.env.PORT || 4000;

// 1. CONFIGURACIÓN DE SEGURIDAD GENERAL
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
      if (duration > 3000) {
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

// 2. POLÍTICA CORS ESTRICTA
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001'];
app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Permitir orígenes locales dinámicos SOLO en desarrollo
    if (process.env.NODE_ENV !== 'production' && (!origin || origin.includes('localhost') || origin.includes('127.0.0.1'))) {
      return callback(null, true);
    }
    // En producción, solo validar contra la lista blanca explícita
    if (origin && allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS Bloqueado para origen: ${origin}`);
      callback(new Error('No permitido por CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));

// 3. RATE LIMITING POR IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Demasiadas peticiones. Intenta de nuevo más tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// 4. PARSEO DE WEBHOOK DE STRIPE (Requiere parseo RAW obligatorio y debe ir ANTES de express.json)
app.post('/api/webhook/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);

// 5. PARSEO DE BODY ESTÁNDAR PARA EL RESTO DE RUTAS
app.use(express.json({ limit: '10kb' }));

// 6. MONTAR RUTAS DE LA API
app.use('/api/stripe', paymentRoutes);
app.use('/api/ai', aiRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Servidor MediFácil operando de forma modularizada y segura.',
    aiModel: aiModelName,
  });
});

// 7. MIDDLEWARE DE MANEJO DE ERRORES GLOBAL
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(`❌ Error no manejado en ${req.method} ${req.url}:`, {
    message: err.message,
    stack: err.stack,
    userId: (req as any).user?.uid
  });

  sendDiscordAlert({
    title: 'Excepción No Manejada en Servidor',
    message: `Se produjo un error no controlado en el endpoint **${req.method} ${req.url}**.\n\nMensaje: *${err.message}*`,
    level: 'error',
    context: {
      url: req.url,
      method: req.method,
      userId: (req as any).user?.uid,
      stack: err.stack
    }
  });

  res.status(err.status || 500).json({
    error: 'Algo salió mal en el servidor.',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Por favor contacta al equipo de soporte si el problema persiste.',
    resetAction: 'Intenta recargar la página o volver a iniciar sesión.'
  });
});

app.listen(PORT, () => {
  logger.info(`🚀 Servidor backend modularizado escuchando en el puerto ${PORT}`);
});
export default app;