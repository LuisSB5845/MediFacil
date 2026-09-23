import express from 'express';
import { admin, db } from '../config/firebase.js';
import logger from '../utils/logger.js';

/**
 * Cuota diaria de IA, en dos bolsas independientes:
 *  - 'docs'  → emision de documentos con IA (/generate-certification)
 *  - 'chat'  → asistente, analisis de notas e imagenes
 * Separadas para que gastar el dia emitiendo recetas no deje al medico sin
 * asistente, y viceversa.
 */
type BolsaIA = 'docs' | 'chat';

const AI_LIMITS: Record<string, number> = {
  free: 3,
  pro: 100,
  pro_clinica: 500,
};

export const authenticateUser = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
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
        // Ignorar
      }
    }
    logger.warn(`Saltando autenticación en modo local. Usando UID extraído: ${mockUid}`);
    (req as any).user = { uid: mockUid, admin: true }; // En local damos superpoderes de admin para facilitar pruebas
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

export const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const user = (req as any).user;
  if (user && user.admin === true) {
    next();
  } else {
    logger.warn(`Acceso denegado a recurso protegido por admin para el UID: ${user?.uid}`);
    return res.status(403).json({ error: 'Acceso denegado: Se requieren permisos de administrador.' });
  }
};

export const checkAIQuota = (bolsa: BolsaIA = 'chat') =>
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!db) {
    logger.warn("Saltando checkAIQuota porque la base de datos no está disponible.");
    return next();
  }

  if (!process.env.FIREBASE_SERVICE_ACCOUNT && process.env.NODE_ENV !== 'production') {
    logger.warn("Saltando checkAIQuota en modo local por falta de credenciales");
    return next();
  }

  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'No autorizado' });

  const userId = user.uid;
  const today = new Date().toISOString().split('T')[0];
  const usageRef = db.collection('ai_usage').doc(userId);

  try {
    const userDoc = await db.collection('users').doc(userId).get();
    const plan: string = userDoc.data()?.plan || 'free';
    const limit = AI_LIMITS[plan] ?? AI_LIMITS.free;

    const usageDoc = await usageRef.get();
    const usageData = usageDoc.data() || {};
    // Formato nuevo: { '2026-09-23': { docs: 2, chat: 1 } }.
    // Los documentos viejos guardaban un numero suelto por dia.
    const delDia = usageData[today];
    const todayCount: number = typeof delDia === 'number'
      ? (bolsa === 'chat' ? delDia : 0)
      : (delDia?.[bolsa] || 0);

    if (todayCount >= limit) {
      logger.warn(`Quota excedida para usuario ${userId} (bolsa: ${bolsa}, plan: ${plan}, usado: ${todayCount}/${limit})`);
      return res.status(429).json({
        error: bolsa === 'docs'
          ? 'Alcanzaste el límite diario de documentos con IA. Puedes seguir emitiéndolos a mano.'
          : 'Alcanzaste el límite diario del asistente de IA.',
        bolsa,
        limit,
        used: todayCount,
        plan,
        resetAt: 'midnight UTC',
      });
    }

    await usageRef.set(
      { [today]: { [bolsa]: admin.firestore.FieldValue.increment(1) } },
      { merge: true }
    );

    (req as any).aiQuota = { plan, used: todayCount + 1, limit, bolsa };
    next();
  } catch (err: any) {
    logger.error('Error verificando quota de IA:', err.message);
    return res.status(500).json({ error: 'Error verificando límites de uso.' });
  }
};

export { AI_LIMITS };
export type { BolsaIA };
