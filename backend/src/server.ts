import { streamObject, generateText } from 'ai';
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

// Configuración de variables de entorno
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 4000;

// Inicializar el proveedor de Google SDK
const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || "",
});

// Opción para cambiar de proveedor o modelo fácilmente
// Solo cambia esta variable o el valor en .env para usar otro modelo (ej: gemini-1.5-pro)
const aiModelName = process.env.AI_MODEL_NAME || "gemini-1.5-flash";
const model = google(aiModelName);


// 1. CONFIGURACIÓN DE SEGURIDAD (Helmet)
// Añade cabeceras de seguridad HTTP (XSS, Clickjacking, etc.)
app.use(helmet());

// -- MIDDLEWARE DE MONITORIZACIÓN Y LOGGING --

// Registro de cada petición entrante y monitoreo de tiempo de respuesta
app.use((req, res, next) => {
  const start = Date.now();
  
  // LOG: Petición recibida (INFO)
  logger.info(`HTTP ${req.method} ${req.url}`, { 
    context: { ip: req.ip, userAgent: req.get('User-Agent') } 
  });

  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // LOG: Desempeño (WARN si es lento > 1000ms)
    if (duration > 1000) {
      const slowMsg = `Slow Query detected: ${req.method} ${req.url} took ${duration}ms`;
      logger.warn(slowMsg);
      // Opcional: Alerta si es crítico (ej: > 5s)
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
// Restringe quién puede llamar a esta API
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:3000'];
app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// 3. RATE LIMITING
// Protege contra ataques de fuerza bruta o DoS
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Límite de 100 peticiones por ventana por IP
  message: { error: 'Demasiadas peticiones. Intenta de nuevo más tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// 4. PARSEO DE BODY SEGURO
// Limitamos el tamaño del payload para evitar ataques de memoria
app.use(express.json({ limit: '10kb' }));

// 5. VALIDACIÓN DE ENTRADAS (Zod)
// Middleware de ejemplo para validar esquemas
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

// Ruta de Salud (Health Check)
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Servidor MediFácil operando con seguridad mejorada.' });
});

// Proxy Seguro para Gemini (Oculta la API Key del Cliente)
const GeminiSchema = z.object({
  body: z.object({
    prompt: z.string().min(1).max(5000),
    context: z.string().optional(),
  }),
});

app.post('/api/ai/analyze', validate(GeminiSchema), async (req, res) => {
  const { prompt, context } = req.body;

  try {
    const ClinicalDocumentSchema = z.object({
      patientName: z.string().describe("Full name of the patient"),
      findings: z.string().describe("Narrative clinical findings and physical examination"),
      diagnosis: z.string().describe("Presumptive diagnosis or ICD code"),
      plan: z.string().describe("Immediate management plan, medications, or referrals"),
      vitals: z.object({
        bloodPressure: z.string().describe("Blood pressure reading (e.g., 120/80 mmHg)"),
        heartRate: z.string().describe("Heart rate in bpm"),
      }),
    });

    const fullPrompt = `Analyze the following medical context and generate a structured clinical document.
    Doctor Information: ${context || "Not specified"}
    
    Medical Notes/Dictation: "${prompt}"
    
    Generate professional medical content for each field. If a field like patient name or vitals is missing from the prompt, use a reasonable placeholder or "N/D".`;

    const result = streamObject({
      model: model,
      schema: ClinicalDocumentSchema,
      prompt: fullPrompt,
    });

    // Configurar cabeceras para streaming persistente
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    for await (const partialObject of result.partialObjectStream) {
      if (partialObject) {
        res.write(JSON.stringify(partialObject) + "\n");
      }
    }
    
    res.end();

  } catch (error: any) {
    logger.error("Error calling AI SDK:", { error: error.message, stack: error.stack });
    
    sendDiscordAlert({
      title: 'AI SDK Failure',
      message: 'Critical error while processing streaming AI request.',
      level: 'error',
      context: { errMsg: error.message, path: '/api/ai/analyze' }
    });

    if (!res.headersSent) {
      res.status(500).json({ error: 'Error procesando solicitud de IA en tiempo real' });
    }
  }
});

// Endpoint para Chat Interactivo (Asistente)
app.post('/api/ai/chat', async (req, res) => {
  const { messages, prompt } = req.body;
  
  if (!process.env.GEMINI_API_KEY) {
    logger.error("Falta GEMINI_API_KEY en el servidor.");
    return res.status(500).json({ error: "Configuración incompleta: falta la API Key en el servidor." });
  }

  try {
    const chatPrompt = prompt || (messages && messages[messages.length - 1]?.content);
    
    if (!chatPrompt) {
      return res.status(400).json({ error: "Mensaje vacío" });
    }

    const result = await generateText({
      model: model,
      system: "Eres un Asistente Clínico Inteligente para MediFácil. Ayudas a doctores a analizar casos, resumir historias clínicas y verificar datos de pacientes. Sé profesional, preciso y utiliza terminología médica adecuada. Siempre aclara que tus sugerencias deben ser validadas por el profesional médico.",
      prompt: chatPrompt,
    });

    res.json({ text: result.text });
  } catch (error: any) {
    logger.error("Error en AI Chat Proxy:", { error: error.message, stack: error.stack });
    res.status(500).json({ 
      error: "Error en el asistente de IA", 
      details: error.message // Lo incluimos para debuggear
    });
  }
});

// Endpoint para Análisis de Imágenes Médicas
app.post('/api/ai/analyze-image', async (req, res) => {
  const { image, prompt } = req.body;
  
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "Configuración incompleta: falta la API Key." });
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

    res.json({ text: result.text });
  } catch (error: any) {
    logger.error("Error en Image Analysis Proxy:", { error: error.message });
    res.status(500).json({ error: "Error analizando la imagen", details: error.message });
  }
});


// Manejo de Errores Global (No revela detalles internos)
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
