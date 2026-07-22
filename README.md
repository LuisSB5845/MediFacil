# 🏥 MediFácil — Sistema Operativo Clínico Digital

[![Vite](https://img.shields.io/badge/Vite-6.2.0-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.0.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-4.21.2-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Firebase](https://img.shields.io/badge/Firebase-12.11.0-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Gemini AI](https://img.shields.io/badge/Gemini_AI-Vercel_AI_SDK-4285F4?logo=google-gemini&logoColor=white)](https://ai.google.dev/)
[![Stripe](https://img.shields.io/badge/Stripe-Integration-635BFF?logo=stripe&logoColor=white)](https://stripe.com/)

**MediFácil** es una plataforma SaaS de gestión médica y asistencia clínica impulsada por Inteligencia Artificial. Diseñada bajo una arquitectura modular desacoplada (Frontend SPA en React Router + Backend REST API en Express/Node.js), permite a profesionales de la salud gestionar expedientes de pacientes, realizar análisis clínicos automatizados y administrar sus suscripciones.

---

## ✨ Características Principales

- **🎨 Dashboard Clínico**: Interfaz intuitiva y moderna optimizada para consulta rápida de datos del paciente y métricas diarias.
- **🧠 Asistente de IA Integrado (Function Calling)**: Consultas interactivas impulsadas por Google Gemini y Vercel AI SDK que ejecutan lectura estructurada en Firestore de forma autónoma.
- **📂 Expediente Clínico Digital**: Gestión de historial médico, constantes vitales, consultas anteriores y notas de evolución.
- **🧾 Generador de Documentos**: Creación de recetas, certificados e informes médicos estructurados.
- **🔒 Seguridad por Roles (RBAC con Custom Claims)**: Control de acceso restringido en Firebase Auth y middlewares del backend para administradores y médicos.
- **💳 Suscripciones y Pagos**: Integración con Stripe Checkout y Portal de Clientes con gestión de cuotas de uso de IA diarias y mensuales.
- **📊 Observabilidad**: Sistema de logging estructurado con Winston, rastreo de duración de peticiones y alertas a Discord en tiempo real para errores no manejados y slow queries.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, React Router v7, Tailwind CSS v4, Motion (Framer Motion), Lucide Icons |
| **Backend** | Node.js, Express, TypeScript, Vercel AI SDK, Winston, Zod |
| **Base de Datos & Auth** | Firebase Authentication (Google Auth + Custom Claims), Cloud Firestore |
| **Pasarela de Pagos** | Stripe API (Checkout Sessions, Webhooks, Customer Portal) |
| **Despliegue** | Vercel (Monorepo con soporte para Serverless Functions & Static SPA) |

---

## 🔑 Variables de Entorno Requeridas

### Backend (`backend/.env`)

| Variable | Descripción | Ejemplo / Valor |
| :--- | :--- | :--- |
| `PORT` | Puerto de ejecución del servidor local | `4000` |
| `NODE_ENV` | Entorno de ejecución (`development` / `production`) | `development` |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Clave API de Google AI Studio para el motor Gemini | `TU_GEMINI_API_KEY_AQUI` |
| `FIREBASE_SERVICE_ACCOUNT` | JSON de la cuenta de servicio de Firebase Admin (string en una línea o ruta relativa) | `{"type":"service_account",...}` |
| `STRIPE_SECRET_KEY` | Clave secreta de Stripe | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Secreto de firma de Webhooks de Stripe | `whsec_...` |
| `DISCORD_WEBHOOK_URL` | Webhook de Discord para alertas del sistema de observabilidad | `https://discord.com/api/webhooks/...` |

### Frontend (`frontend/.env` o variables de Vercel)

| Variable | Descripción | Ejemplo / Valor |
| :--- | :--- | :--- |
| `VITE_FIREBASE_API_KEY` | API Key pública del cliente Firebase | `TU_FIREBASE_API_KEY_AQUI` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Dominio de autenticación de Firebase | `tu-proyecto.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | ID del proyecto en Firebase | `tu-proyecto-id` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Bucket de almacenamiento de Firebase | `tu-proyecto.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Sender ID de Firebase Messaging | `1234567890` |
| `VITE_FIREBASE_APP_ID` | App ID web de Firebase | `1:1234567890:web:abc123def` |

---

## 🚀 Instalación y Desarrollo Local

### Requisitos Previos

- **Node.js** (v18.x o superior)
- **pnpm** (v9.x o superior) o **npm**
- Proyecto en **Firebase Console** con Firestore y Google Authentication habilitados.
- Cuenta de **Google AI Studio** y **Stripe** (modo test).

### Pasos de Instalación

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/LuisSB5845/MediFacil.git
   cd MediFacil
   ```

2. **Instalar dependencias:**
   ```bash
   pnpm install
   ```

3. **Configurar archivos de entorno:**
   Crea los archivos `.env` correspondientes en el backend y el frontend guiándote por la tabla de variables de entorno anterior.

4. **Ejecutar el proyecto en desarrollo:**
   ```bash
   npm run dev
   ```
   Este comando iniciará de forma concurrente:
   - **Frontend**: `http://localhost:3000`
   - **Backend API**: `http://localhost:4000`

---

## 📦 Estructura del Monorepo

```text
MediFacil/
├── backend/
│   ├── src/
│   │   ├── config/        # Inicialización de Firebase Admin, Stripe y AI
│   │   ├── controllers/   # Controladores de pagos y motor de IA
│   │   ├── middlewares/   # Auth, Custom Claims, cuotas de uso y validación Zod
│   │   ├── routes/        # Definición de rutas API Express (/api/ai, /api/stripe)
│   │   ├── utils/         # Sistema de logging (Winston) y alertas (Discord)
│   │   └── server.ts      # Servidor Express principal
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/    # Componentes modulares y modales
│   │   ├── pages/         # Páginas (Dashboard, PatientsList, Settings, AdminPanel)
│   │   ├── lib/           # Utilidades y configuración cliente de Firebase
│   │   ├── App.tsx        # Integración de React Router v7 y Layout principal
│   │   └── main.tsx       # Punto de entrada React con HashRouter
│   ├── index.html
│   └── vite.config.ts
├── firestore.rules        # Reglas de seguridad de Firestore (RBAC)
├── vercel.json            # Configuración de despliegue en Vercel
└── package.json           # Scripts del monorepo
```

---

## 📄 Licencia

Este proyecto se distribuye bajo la licencia **MIT**. Para más detalles, consulta el archivo [LICENSE](LICENSE).

---
<div align="center">
  Diseñado para transformar la práctica médica.
</div>
