import admin from 'firebase-admin';
import logger from '../utils/logger.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db: admin.firestore.Firestore | null = null;

try {
  if (admin.apps.length === 0) {
    let initialized = false;

    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        let serviceAccount;
        if (process.env.FIREBASE_SERVICE_ACCOUNT.trim().startsWith('{')) {
          serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        } else {
          const rawPath = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
          const candidatePaths = [
            path.resolve(process.cwd(), rawPath),
            path.resolve(process.cwd(), 'backend', rawPath),
            path.resolve(__dirname, '../../..', rawPath),
            path.resolve(__dirname, '../..', rawPath),
          ];
          const resolvedPath = candidatePaths.find(p => fs.existsSync(p));

          if (resolvedPath) {
            serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, 'utf-8'));
          } else {
            logger.warn(`⚠️ Archivo Service Account '${rawPath}' no encontrado localmente. Usando fallback de projectId.`);
          }
        }

        if (serviceAccount) {
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
          });
          db = admin.firestore();
          initialized = true;
          logger.info("✅ Firebase Admin inicializado correctamente con Service Account.");
        }
      } catch (err: any) {
        logger.warn(`⚠️ No se pudo cargar la Service Account: ${err.message}. Usando fallback por projectId.`);
      }
    }

    if (!initialized) {
      const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || "medifacil-5de46";
      admin.initializeApp({
        projectId: projectId
      });
      try {
        db = admin.firestore();
      } catch (e) {
        // Fallback en caso de cliente sin credenciales directas
      }
      logger.warn(`⚠️ Firebase Admin inicializado por projectId fallback: ${projectId}`);
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

