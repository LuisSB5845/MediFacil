#!/usr/bin/env node
/**
 * Herramienta de administración de MediFácil.
 *
 * Corre con la service account, que se salta las reglas de Firestore. Es el
 * único camino para poner el primer claim de admin: las reglas evalúan
 * `request.auth.token.admin`, y ese claim solo lo puede escribir el servidor.
 *
 *   node admin.mjs list
 *   node admin.mjs plan  <email> <free|pro|whitelisted>
 *   node admin.mjs admin <email> [--quitar]
 *
 * Requiere la clave en backend/ o la variable GOOGLE_APPLICATION_CREDENTIALS.
 */
import admin from 'firebase-admin';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const PLANES = ['free', 'pro', 'whitelisted'];

// --- Credenciales -----------------------------------------------------------
function credenciales() {
  const desdeEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (desdeEnv) return JSON.parse(readFileSync(desdeEnv, 'utf8'));

  const clave = readdirSync(AQUI).find(f => /firebase-adminsdk.*\.json$/.test(f));
  if (!clave) {
    console.error(
      'No encontré la service account.\n' +
      'Pon el archivo firebase-adminsdk-*.json en backend/, o exporta ' +
      'GOOGLE_APPLICATION_CREDENTIALS con su ruta.'
    );
    process.exit(1);
  }
  return JSON.parse(readFileSync(join(AQUI, clave), 'utf8'));
}

admin.initializeApp({ credential: admin.credential.cert(credenciales()) });
const db = admin.firestore();
const auth = admin.auth();

// --- Utilidades -------------------------------------------------------------
async function buscarPorEmail(email) {
  const objetivo = email.trim().toLowerCase();
  try {
    return await auth.getUserByEmail(objetivo);
  } catch {
    console.error(`No existe ningún usuario con el correo ${objetivo}.`);
    console.error('Tiene que haber iniciado sesión en la app al menos una vez.');
    process.exit(1);
  }
}

async function esAdmin(uid) {
  const u = await auth.getUser(uid);
  return u.customClaims?.admin === true;
}

// --- Comandos ---------------------------------------------------------------
async function listar() {
  const snap = await db.collection('users').get();
  if (snap.empty) return console.log('No hay usuarios registrados.');

  const filas = [];
  for (const doc of snap.docs) {
    const d = doc.data();
    filas.push({
      email: d.email || '(sin correo)',
      nombre: d.displayName || '-',
      plan: d.plan || 'free',
      admin: (await esAdmin(doc.id)) ? 'SÍ' : '',
      uid: doc.id,
    });
  }

  const ancho = k => Math.max(k.length, ...filas.map(f => String(f[k]).length));
  const anchos = { email: ancho('email'), nombre: ancho('nombre'), plan: ancho('plan') };

  console.log('');
  console.log(
    'CORREO'.padEnd(anchos.email) + '  ' +
    'NOMBRE'.padEnd(anchos.nombre) + '  ' +
    'PLAN'.padEnd(anchos.plan) + '  ADMIN'
  );
  console.log('-'.repeat(anchos.email + anchos.nombre + anchos.plan + 13));
  for (const f of filas) {
    console.log(
      f.email.padEnd(anchos.email) + '  ' +
      f.nombre.padEnd(anchos.nombre) + '  ' +
      f.plan.padEnd(anchos.plan) + '  ' + f.admin
    );
  }
  console.log(`\n${filas.length} usuario(s).\n`);
}

async function cambiarPlan(email, plan) {
  if (!PLANES.includes(plan)) {
    console.error(`Plan no válido: "${plan}". Usa uno de: ${PLANES.join(', ')}.`);
    process.exit(1);
  }

  const user = await buscarPorEmail(email);
  const ref = db.collection('users').doc(user.uid);
  const snap = await ref.get();

  if (!snap.exists) {
    console.error(`El usuario ${user.email} no tiene perfil en Firestore todavía.`);
    process.exit(1);
  }

  const anterior = snap.data()?.plan || 'free';
  if (anterior === plan) {
    console.log(`${user.email} ya está en el plan ${plan}. Sin cambios.`);
    return;
  }

  await ref.update({ plan });
  console.log(`${user.email}: plan ${anterior} → ${plan}`);
}

async function cambiarAdmin(email, quitar) {
  const user = await buscarPorEmail(email);
  const yaEs = user.customClaims?.admin === true;

  if (quitar) {
    if (!yaEs) return console.log(`${user.email} no era admin. Sin cambios.`);
    const { admin: _, ...resto } = user.customClaims || {};
    await auth.setCustomUserClaims(user.uid, resto);
    console.log(`${user.email}: acceso de admin RETIRADO.`);
  } else {
    if (yaEs) return console.log(`${user.email} ya es admin. Sin cambios.`);
    await auth.setCustomUserClaims(user.uid, { ...(user.customClaims || {}), admin: true });
    console.log(`${user.email}: acceso de admin CONCEDIDO.`);
  }

  // El campo `role` es solo para la interfaz; el permiso real es el claim.
  const ref = db.collection('users').doc(user.uid);
  if ((await ref.get()).exists) {
    await ref.update({ role: quitar ? 'doctor' : 'admin' });
  }

  console.log('\nImportante: el claim viaja dentro del token de sesión.');
  console.log('Cierra sesión y vuelve a entrar para que surta efecto.');
}

// --- Entrada ----------------------------------------------------------------
const [comando, email, valor] = process.argv.slice(2);

const ayuda = `
Administración de MediFácil

  node admin.mjs list
      Lista todos los usuarios con su plan y si son admin.

  node admin.mjs plan <email> <free|pro|whitelisted>
      Cambia el plan de un usuario.

  node admin.mjs admin <email> [--quitar]
      Concede o retira el acceso de administrador (custom claim).
`;

try {
  if (comando === 'list') {
    await listar();
  } else if (comando === 'plan' && email && valor) {
    await cambiarPlan(email, valor);
  } else if (comando === 'admin' && email) {
    await cambiarAdmin(email, process.argv.includes('--quitar'));
  } else {
    console.log(ayuda);
    process.exit(comando ? 1 : 0);
  }
  process.exit(0);
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
