# Plan de Implementación: Migración a Vercel AI SDK (Patrón Midudev)

Este plan describe la transición del sistema de IA actual a un framework más flexible y potente basado en el **Vercel AI SDK**. Esto permitirá respuestas en tiempo real (streaming) y la facilidad de cambiar entre proveedores de modelos (Google Gemini, OpenAI, Claude, etc.) casi instantáneamente.

## User Review Required

> [!IMPORTANT]
> **Cambio en la Experiencia de Usuario**: La IA ya no responderá de golpe tras esperar 5-10 segundos. Ahora verás cómo la respuesta se escribe palabra por palabra en la pantalla (Streaming).
> **Dependencias**: Se añadirán `ai` y `@ai-sdk/google` al backend.

## Proposed Changes

---

### [Component] Backend: Arquitectura Agnóstica de IA

Migraremos de la librería específica de Google a una abstracción que permite el intercambio de modelos.

#### [MODIFY] [package.json](file:///c:/Users/andro/OneDrive/Documents/ME/PROYECTOS/MediFacil/MediFacil/backend/package.json)
- Añadir `ai` y `@ai-sdk/google`.
- Mantener `@google/generative-ai` por compatibilidad temporal si es necesario.

#### [MODIFY] [server.ts](file:///c:/Users/andro/OneDrive/Documents/ME/PROYECTOS/MediFacil/MediFacil/backend/src/server.ts)
- Implementar `streamText` del Vercel AI SDK.
- Configurar el modelo usando una variable de entorno `AI_MODEL` (ej. `google('gemini-1.5-flash')`).
- Habilitar el streaming de texto hacia el cliente.

---

### [Component] Frontend: Consumo de Datos en Tiempo Real

Actualizaremos el cliente de IA para que pueda leer y procesar flujos de datos (streams).

#### [NEW] [ai.ts](file:///c:/Users/andro/OneDrive/Documents/ME/PROYECTOS/MediFacil/MediFacil/frontend/src/lib/ai.ts)
- Nuevo cliente que utiliza `fetch` y `TextDecoder` para leer el stream del backend.
- Reemplazará gradualmente a `gemini.ts`.

#### [MODIFY] [NuevaConsulta.tsx](file:///c:/Users/andro/OneDrive/Documents/ME/PROYECTOS/MediFacil/MediFacil/frontend/src/pages/NuevaConsulta.tsx) (u otro componente relevante)
- Actualizar la lógica del botón "Analizar" para que el texto se actualice dinámicamente mientras llega de la IA.

---

### [Component] Gestión de Configuración

#### [MODIFY] [.env](file:///c:/Users/andro/OneDrive/Documents/ME/PROYECTOS/MediFacil/MediFacil/backend/src/.env)
- Añadir `AI_MODEL_NAME=gemini-1.5-flash`.

---

## Open Questions

1. **¿Deseas soporte para otros modelos ahora mismo (ej. GPT-4)?** Si es así, necesitaré que añadas la `OPENAI_API_KEY` a tu `.env` de Railway. Por ahora, el plan se centrará en Gemini pero usando el nuevo framework.
2. **¿Quieres que el efecto de streaming sea "palabra por palabra" o "bloque por bloque"?** (Por defecto será palabra por palabra para una sensación de mayor velocidad).

## Verification Plan

### Automated Tests
- Verificar que el endpoint `/api/ai/analyze` devuelva una cabecera `Content-Type: text/plain; charset=utf-8` indicando streaming.
- Validar mediante scripts que el stream sea legible y no esté corrupto.

### Manual Verification
- Abrir la consola de red en el navegador y verificar que la petición a la IA se mantenga "Pendiente" mientras los datos fluyen (Status 200 pero descargando).
- Confirmar visualmente que el texto en la UI se actualiza en tiempo real.
