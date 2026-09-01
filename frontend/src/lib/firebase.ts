import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, type User } from "firebase/auth";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, query, where, onSnapshot, addDoc, deleteDoc, updateDoc, serverTimestamp, getDocFromServer, type DocumentData, type QuerySnapshot, type DocumentSnapshot } from "firebase/firestore";
// Configuración de Firebase desde variables de entorno (.env)
const firebaseConfig = {
  apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY,
  authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: (import.meta as any).env.VITE_FIREBASE_APP_ID,
  measurementId: (import.meta as any).env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();


export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    /** Solo el uid: basta para depurar y no identifica a la persona por sí solo. */
    userId: string | undefined;
  }
}

/** Lo único que puede llegar a la interfaz. No revela usuario, ruta ni causa. */
export const GENERIC_ERROR_MESSAGE = 'Ocurrió un error, intenta de nuevo.';

/**
 * Registra un error de Firestore y corta la operación.
 *
 * El detalle (uid, ruta, mensaje original) se queda SIEMPRE en la consola y
 * nunca sale en el throw: el Error que se propaga lleva un texto genérico, en
 * desarrollo y en producción por igual. La variable de entorno solo decide
 * cuánto detalle se imprime en consola, jamás qué se le muestra a la usuaria.
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
    },
    operationType,
    path
  }

  if (import.meta.env.DEV) {
    console.error('Firestore Error:', errInfo);
  } else {
    console.error(`Firestore Error [${operationType}]`);
  }

  throw new Error(GENERIC_ERROR_MESSAGE);
}

export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
  }
}
