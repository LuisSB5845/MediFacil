import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

export interface AlertData {
  title: string;
  message: string;
  level: 'info' | 'warn' | 'error';
  context?: any;
}

export const sendDiscordAlert = async (data: AlertData) => {
  if (!DISCORD_WEBHOOK_URL) {
    console.warn('⚠️ Alertas de Discord desactivadas: Faltas de URL del Webhook.');
    return;
  }

  const { title, message, level, context } = data;

  const colors = {
    info: 0x00FF00, // Verde
    warn: 0xFFFF00, // Amarillo
    error: 0xFF0000 // Rojo
  };

  const payload = {
    embeds: [
      {
        title: `🚨 MediFácil Alert: ${title}`,
        description: message,
        color: colors[level],
        fields: context ? [
          {
            name: 'Contexto',
            value: `\`\`\`json\n${JSON.stringify(context, null, 2).slice(0, 1000)}\n\`\`\``
          }
        ] : [],
        timestamp: new Date().toISOString(),
        footer: {
          text: 'MediFácil Security System'
        }
      }
    ]
  };

  try {
    await axios.post(DISCORD_WEBHOOK_URL, payload);
  } catch (error) {
    console.error('❌ Error enviando alerta a Discord:', error);
  }
};
