import admin from 'firebase-admin';
import logger from '../utils/logger.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db: admin.firestore.Firestore | null = null;

try {
  if (admin.apps.length === 0) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      let serviceAccount;
      if (process.env.FIREBASE_SERVICE_ACCOUNT.trim().startsWith('{')) {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      } else {
        const fs = await import('fs');
        const resolvedPath = path.resolve(__dirname, '../../..', process.env.FIREBASE_SERVICE_ACCOUNT.trim());
        serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, 'utf-8'));
      }
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      db = admin.firestore();
      logger.info("✅ Firebase Admin inicializado correctamente (Config).");
    } else {
      const projectId = process.env.VITE_FIREBASE_PROJECT_ID || "medifacil-5de46";
      admin.initializeApp({
        projectId: projectId
      });
      logger.warn(`⚠️ Firebase Admin inicializado sin Cuenta de Servicio (Config). projectId fallback: ${projectId}`);
    }
  } else {
    try {
      db = admin.firestore();
    } catch (e) {
      // Ignorar
    }
  }
} catch (error: any) {
  logger.error("❌ Error inicializando Firebase Admin en Config: " + error.message);
}

export { admin, db };
