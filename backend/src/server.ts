import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { z } from 'zod';
import { GoogleGenerativeAI } from "@google/generative-ai";
import path from 'path';
import { fileURLToPath } from 'url';

// Configuración de variables de entorno
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 4000;

// Inicializar Gemini en el Backend
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const aiModel = genAI.getGenerativeModel({ 
  model: "gemini-1.5-flash-latest",
  generationConfig: { responseMimeType: "application/json" }
});


// 1. CONFIGURACIÓN DE SEGURIDAD (Helmet)
// Añade cabeceras de seguridad HTTP (XSS, Clickjacking, etc.)
app.use(helmet());

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
    const fullPrompt = `Analyze the following medical context and generate a structured clinical document.
    Context: ${context || "None provided"}
    Prompt: ${prompt}
    
    Return the response in JSON format with the following structure:
    {
      "patientName": "string",
      "date": "string",
      "findings": "string",
      "diagnosis": "string",
      "plan": "string",
      "vitals": {
        "bloodPressure": "string",
        "heartRate": "number"
      }
    }`;

    const result = await aiModel.generateContent(fullPrompt);
    const response = await result.response;
    res.status(200).json(JSON.parse(response.text()));
  } catch (error) {
    console.error("Error calling Gemini:", error);
    res.status(500).json({ error: 'Error procesando solicitud de IA' });
  }
});


// Manejo de Errores Global (No revela detalles internos)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Ocurrió un error interno en el servidor.' });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor seguro escuchando en http://localhost:${PORT}`);
});
