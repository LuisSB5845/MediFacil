import { createGoogleGenerativeAI } from '@ai-sdk/google';
import logger from '../utils/logger.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let aiModelName = process.env.AI_MODEL_NAME || "gemma-4-26b-a4b-it";

if (aiModelName.startsWith("zai/")) {
  logger.warn(`⚠️ El modelo '${aiModelName}' requiere AI Gateway / Tarjeta en Vercel. Forzando a 'gemma-4-26b-a4b-it' para resiliencia.`);
  aiModelName = "gemma-4-26b-a4b-it";
}

const apiKey = process.env.GEMINI_API_KEY || process.env.AI_GATEWAY_API_KEY || "";

const google = createGoogleGenerativeAI({
  apiKey: apiKey,
});

const model = google(aiModelName);
logger.info(`🤖 Modelo de IA activo en Config: ${aiModelName}`);

// Cargar contexto
let APP_CONTEXT = "";
try {
  const candidatePaths = [
    path.resolve(process.cwd(), 'APP_CONTEXT.md'),
    path.resolve(process.cwd(), 'backend', 'APP_CONTEXT.md'),
    path.resolve(__dirname, '../../APP_CONTEXT.md'),
    path.resolve(__dirname, '../../../APP_CONTEXT.md'),
    path.resolve(__dirname, '../APP_CONTEXT.md'),
  ];
  const contextPath = candidatePaths.find(p => fs.existsSync(p));
  if (contextPath) {
    APP_CONTEXT = fs.readFileSync(contextPath, 'utf-8');
    logger.info(`✅ APP_CONTEXT.md cargado correctamente desde ${contextPath}.`);
  } else {
    logger.warn("⚠️ APP_CONTEXT.md no encontrado en Config.");
  }
} catch {
  logger.warn("⚠️ APP_CONTEXT.md no encontrado en Config.");
}

export { model, aiModelName, APP_CONTEXT };

