import express from 'express';
import { generateText, generateObject, tool, stepCountIs } from 'ai';
import { z } from 'zod';
import { model, aiModelName, APP_CONTEXT } from '../config/ai.js';
import { db } from '../config/firebase.js';
import logger from '../utils/logger.js';
import { sendDiscordAlert } from '../utils/alerts.js';
import { AI_LIMITS } from '../middlewares/auth.js';
import { CERT_REGISTRY, CERTIFICATION_TYPES, type CertificationType } from '../schemas/certificationSchemas.js';

export const AISchema = z.object({
  body: z.object({
    prompt: z.string().min(1).max(5000),
    context: z.string().optional(),
    certificationType: z.enum(CERTIFICATION_TYPES).optional(),
  }),
});

// Helper para obtener perfil básico del doctor (usado siempre en el system prompt)
const getDoctorProfile = async (userId: string): Promise<string> => {
  if (!db) return '';
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    if (userData) {
      return `PERFIL DEL DOCTOR:
- Nombre: ${userData.displayName || userData.name || 'No especificado'}
- Email: ${userData.email || 'No especificado'}
- Plan: ${userData.plan || 'free'}
- Especialidad: ${userData.specialty || 'No especificada'}`;
    }
  } catch (err: any) {
    logger.warn('Error cargando perfil del doctor para IA:', err.message);
  }
  return '';
};

// --- ENDPOINTS DE IA ---

// 1. Analizador de Notas Clínicas
export const analyzeNotes = async (req: express.Request, res: express.Response) => {
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

    const clean = result.text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    try {
      const parsed = JSON.parse(clean);
      res.write(JSON.stringify(parsed) + "\n");
    } catch {
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
};

// 2. Asistente de Chat con Function Calling (Refactorizado)
export const chatWithAI = async (req: express.Request, res: express.Response) => {
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
    logger.info(`Processing chat for user via Function Calling: ${userId}`);

    // Cargar perfil del médico
    const doctorProfile = await getDoctorProfile(userId);

    // Definición de Herramientas (Tools) para que el LLM llame autónomamente
    const tools = {
      getPatientsList: {
        description: 'Carga la lista de pacientes registrados por el doctor actual en su clínica.',
        inputSchema: z.object({
          limit: z.number().optional().default(20).describe('Cantidad máxima de pacientes a recuperar')
        }),
        execute: async (args: { limit: number }) => {
          const limit = args.limit;
          if (!db) return 'Base de datos no inicializada.';
          logger.info(`[AI Tool] Fetching patients for user: ${userId} (limit: ${limit})`);
          const patientsSnap = await db.collection('patients')
            .where('doctorUid', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();

          if (patientsSnap.empty) return 'No hay pacientes registrados aún.';
          return patientsSnap.docs.map(doc => {
            const p = doc.data();
            return `Paciente: ${p.name} | Edad: ${p.age || 'N/D'} | Género: ${p.gender || 'N/D'} | Diagnóstico: ${p.diagnosis || 'Ninguno'}`;
          }).join('\n');
        }
      },
      getRecentConsultations: {
        description: 'Obtiene las consultas médicas recientes registradas por el doctor actual.',
        inputSchema: z.object({
          limit: z.number().optional().default(10).describe('Cantidad máxima de consultas a recuperar')
        }),
        execute: async (args: { limit: number }) => {
          const limit = args.limit;
          if (!db) return 'Base de datos no inicializada.';
          logger.info(`[AI Tool] Fetching consultations for user: ${userId} (limit: ${limit})`);
          const consultSnap = await db.collectionGroup('consultations')
            .where('doctorUid', '==', userId)
            .orderBy('date', 'desc')
            .limit(limit)
            .get();

          if (consultSnap.empty) return 'No hay consultas registradas aún.';
          return consultSnap.docs.map(doc => {
            const c = doc.data();
            return `Paciente: ${c.patientName || 'N/D'} | Fecha: ${c.date?.toDate?.()?.toLocaleDateString('es-DO') || 'N/D'} | Diagnóstico: ${c.diagnosis || 'N/D'} | Plan: ${c.plan || 'N/D'}`;
          }).join('\n');
        }
      }
    };

    const systemPrompt = `Eres un Asistente Clínico Inteligente integrado en MediFácil, una plataforma de gestión médica para doctores.
 
INSTRUCCIONES:
- Ayudas al doctor con preguntas sobre sus pacientes, consultas, y el uso de la aplicación.
- Si el doctor pregunta por sus pacientes o consultas, invoca la herramienta correspondiente para cargar los datos en tiempo real de la base de datos.
- Para preguntas sobre cómo usar MediFácil, usa la documentación de la app provista.
- Para preguntas clínicas generales, responde con criterio médico profesional y aclara que deben ser validadas por el profesional.
- Responde siempre en español, de forma concisa y profesional.
 
${APP_CONTEXT ? `DOCUMENTACIÓN DE MEDIFÁCIL:\n${APP_CONTEXT}\n` : ''}
${doctorProfile ? `${doctorProfile}\n` : ''}`;

    // Ejecutar generación de texto con Vercel AI SDK (soporta llamadas a herramientas de forma automática)
    const result = await generateText({
      model: model,
      system: systemPrompt,
      prompt: userMessage,
      tools: tools,
      stopWhen: stepCountIs(5), // Reemplaza maxSteps para detenerse tras 5 pasos en esta versión del SDK
    });

    const quota = (req as any).aiQuota;
    res.json({
      text: result.text,
      quota: quota || null,
    });

  } catch (error: any) {
    logger.error("Error en AI Chat Controller:", { error: error.message, stack: error.stack });
    res.status(500).json({
      error: "Error en el asistente de IA",
      details: error.message
    });
  }
};

// 3. Analizador de Imágenes Médicas
export const analyzeImage = async (req: express.Request, res: express.Response) => {
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
    logger.error("Error en Image Analysis Controller:", { error: error.message });
    res.status(500).json({ error: "Error analizando la imagen", details: error.message });
  }
};

// 4. Consulta de Cuota (Usage)
export const getAIUsage = async (req: express.Request, res: express.Response) => {
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
};

// 5. Generador de Certificaciones Estructuradas con generateObject
export const generateCertification = async (req: express.Request, res: express.Response) => {
  const { prompt, context, certificationType = 'narrative' } = req.body;
  const userId = (req as any).user?.uid;

  logger.info(`Generando certificación estructurada (${certificationType}) para usuario: ${userId}`);

  try {
    const entry = CERT_REGISTRY[certificationType as CertificationType];

    if (!entry) {
      return res.status(400).json({
        error: `Tipo de documento no soportado: '${certificationType}'.`,
        supported: CERTIFICATION_TYPES,
      });
    }

    const result = await generateObject({
      model: model,
      schema: entry.schema,
      system: entry.systemPrompt,
      prompt: `Información clínica / contexto del médico:\n${context || 'No especificada'}\n\nInstrucción o datos del documento dictados:\n"${prompt}"`,
    });

    const quota = (req as any).aiQuota;
    res.json({
      data: result.object,
      certificationType,
      quota: quota || null,
    });
  } catch (error: any) {
    logger.error("Error en generateCertification Controller:", { error: error.message, stack: error.stack });
    
    sendDiscordAlert({
      title: 'Structured Certification AI Failure',
      message: `Error procesando certificación de tipo ${certificationType}.`,
      level: 'error',
      context: { errMsg: error.message, path: '/api/ai/generate-certification' }
    });

    res.status(500).json({ 
      error: "Error generando la certificación estructurada",
      details: error.message 
    });
  }
};

