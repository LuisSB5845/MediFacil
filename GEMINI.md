# 🏥 MediFácil — Contexto del Proyecto (GEMINI.md)

Este archivo proporciona una visión técnica y operativa de **MediFácil** para interacciones con agentes de IA.

---

## 🌟 Resumen del Proyecto

**MediFácil** es un "Atelier Clínico Digital", una plataforma premium de gestión para médicos que integra Inteligencia Artificial para automatizar la burocracia clínica.

- **Frontend**: SPA construida con **React 19**, **TypeScript** y **Vite**. Estética "Glassmorphism" usando **Tailwind CSS v4** y **Motion**.
- **Backend**: Servidor **Node.js/Express** que actúa como proxy seguro para servicios de IA y pasarelas de pago.
- **Core**: **Firebase** (Auth para identidad, Firestore para base de datos NoSQL en tiempo real, Hosting para despliegue).
- **IA**: Implementación basada en **Vercel AI SDK** con soporte de streaming para generación de documentos y chat clínico.
- **Pagos**: Integración con **Stripe** para planes de suscripción (Free, Pro, Anual).

---

## 📂 Estructura del Repositorio

- `frontend/`: Aplicación cliente React.
  - `src/components/`: Componentes modulares de la interfaz (IA, Generador, Perfiles).
  - `src/lib/`: Lógica central para Firebase (`firebase.ts`), IA (`ai.ts`) y límites de uso.
- `backend/`: API y lógica de servidor.
  - `src/server.ts`: Punto de entrada con Express, Webhooks de Stripe y Proxy de IA.
  - `src/utils/`: Utilidades de logging (Winston) y alertas (Discord).
- `docs/`: Documentación técnica y planes de implementación.
- `scripts/`: Scripts de automatización para despliegue y rollback.
- `firestore.rules`: Reglas de seguridad críticas para Firestore.

---

## 🛠️ Comandos Clave y Flujo de Trabajo

### Desarrollo Local
Desde la raíz del proyecto:
- `npm install`: Instala todas las dependencias (el root orquesta ambos entornos).
- `npm run dev`: Inicia frontend (puerto 3000) y backend (puerto 4000) simultáneamente usando `concurrently`.
- `npm run dev:frontend`: Solo frontend (`vite frontend`).
- `npm run dev:backend`: Solo backend (`tsx watch backend/src/server.ts`).

### Producción y Despliegue
- `npm run build`: Construye el frontend en `frontend/dist`.
- `npx firebase-tools deploy`: Despliega reglas de Firestore y hosting del frontend.
- Despliegue Backend: Configurado para servicios como Railway (ver `backend/railway.json`).

---

## 🧠 Convenciones de Desarrollo

### IA y Streaming
- **Backend Proxy**: Toda llamada a la IA DEBE pasar por el backend para proteger las API Keys.
- **Vercel AI SDK**: Se prefiere el uso de `streamObject` y `streamText` para una respuesta reactiva en la UI.
- **Configuración**: El modelo se define en el backend vía `AI_MODEL_NAME` (actualmente configurado para Gemini/Zhipu vía Gateway).

### Seguridad y Datos
- **Firestore**: Los datos están particionados por `doctorUid`. Las reglas en `firestore.rules` validan estrictamente la propiedad de los documentos.
- **Firebase Admin**: El backend tiene privilegios elevados para procesos administrativos y webhooks.
- **Variables de Entorno**:
  - Frontend: `VITE_GEMINI_API_KEY` (legacy), `VITE_API_URL`.
  - Backend: `AI_GATEWAY_API_KEY`, `STRIPE_SECRET_KEY`, `FIREBASE_SERVICE_ACCOUNT`.

### Estilo de Código
- **Tipado**: TypeScript estricto en todo el proyecto.
- **Validación**: Uso extensivo de **Zod** para esquemas de datos tanto en frontend como en backend.
- **UI**: Uso de alias `@` apuntando a `frontend/src`. Preferencia por componentes funcionales y hooks personalizados.

---

## 📋 Roadmap y Estado Actual
- [x] Migración a Vercel AI SDK (Streaming implementado).
- [x] Gestión de pacientes y consultas.
- [x] Integración de pagos con Stripe Webhooks.
- [ ] Implementación completa de análisis de imágenes médicas (Endpoint base listo).
- [ ] Optimización de búsqueda global en expedientes.

---
*Este documento es la fuente de verdad para la arquitectura de MediFácil. Manténgalo actualizado al realizar cambios estructurales.*
