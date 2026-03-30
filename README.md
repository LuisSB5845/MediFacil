# 🏥 MediFácil — El Atelier Clínico Digital

[![Vite](https://img.shields.io/badge/Vite-6.2.0-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.0.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-12.11.0-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Gemini AI](https://img.shields.io/badge/Gemini_AI-Powered-4285F4?logo=google-gemini&logoColor=white)](https://ai.google.dev/)

**MediFácil** es una plataforma premium de gestión clínica diseñada para médicos modernos. Combina la potencia de la Inteligencia Artificial con una estética de "Atelier Digital" para transformar la gestión de pacientes, la generación de documentos clínicos y la toma de decisiones médicas.

---

## ✨ Características Principales

- **🎨 Dashboard Estético**: Una interfaz intuitiva y elegante (Glassmorphism + Dark Mode) para visualizar métricas diarias y pacientes recientes.
- **🧠 Generador de Documentos con IA**: Crea prescripciones, informes clínicos y notas de evolución de forma automática procesando lenguaje natural mediante **Google Gemini**.
- **🎤 Dictado por Voz**: Integra reconocimiento de voz para convertir consultas habladas en registros estructurados al instante.
- **📂 Gestión de Expedientes**: Historial clínico completo, gestión de vitales y seguimiento de consultas multi-nivel.
- **💳 Suscripciones Integradas**: Sistema de planes (Free, Monthly, Yearly) con pasarela de pago para servicios premium.
- **🛡️ Seguridad con Firebase**: Autenticación segura de Google y base de datos Firestore en tiempo real con reglas de seguridad estrictas.

## 🛠️ Stack Tecnológico

- **Frontend**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Estilos**: [Tailwind CSS](https://tailwindcss.com/) + [Modern Typography](https://fonts.google.com/)
- **Animaciones**: [Motion (Framer Motion)](https://motion.dev/)
- **Core**: [Firebase](https://firebase.google.com/) (Auth, Firestore, Hosting)
- **AI Engine**: [Google Gemini AI SDK](https://ai.google.dev/)
- **Iconografía**: [Lucide React](https://lucide.dev/)

---

## 🚀 Instalación y Desarrollo Local

### Requisitos Previos

- [Node.js](https://nodejs.org/) (v18 o superior)
- Una cuenta de [Firebase](https://console.firebase.google.com/)
- Una API Key de [Google AI Studio (Gemini)](https://aistudio.google.com/)

### Pasos

1. **Clonar el repositorio**:
   ```bash
   git clone [url-del-repositorio]
   cd MediFacil
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**:
   Crea un archivo `.env` en la raíz (o usa `.env.local`) y añade tu clave:
   ```env
   VITE_GEMINI_API_KEY=tu_clave_aqui
   ```

4. **Configuración de Firebase**:
   Asegúrate de que tu `firebase-applet-config.json` tenga las credenciales correctas:
   ```json
   {
     "projectId": "medifacil-5de46",
     "appId": "1:53491017160:web:bdf0cf4eaa126e539cccfd",
     "apiKey": "AIzaSyAqn9IepwtEeZfoq21pIay-yROLcU_2JTg",
     "authDomain": "medifacil-5de46.firebaseapp.com"
   }
   ```

5. **Iniciar servidor de desarrollo**:
   ```bash
   npm run dev
   ```
   La aplicación estará disponible en `http://localhost:3000`.

---

## 🌎 Despliegue

El proyecto está configurado para desplegarse automáticamente en **Firebase Hosting**.

Para publicar cambios:
```bash
npm run build
npx firebase-tools deploy --only hosting
```

---

## 📦 Estructura del Proyecto

```text
MediFacil/
├── src/
│   ├── components/    # Componentes de UI (PaymentPlans, etc.)
│   ├── lib/           # Lógica de Firebase y Gemini AI
│   ├── App.tsx        # Lógica central y Router
│   └── index.css      # Sistema de diseño y Tailwind
├── dist/              # Build de producción
├── firebase.json      # Configuración de hosting
└── firestore.rules    # Reglas de seguridad de base de datos
```

---

## 📄 Licencia

Este proyecto es de uso privado y bajo licencia Apache-2.0. Consulta el archivo `LICENSE` (si está presente) para más información.

---
<div align="center">
  Hecho con ❤️ para la comunidad médica.
</div>
