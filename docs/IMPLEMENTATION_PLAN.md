# Implementation Plan: Sistema de Suscripción y Límites de Uso - MediFácil

**Fecha:** 2026-03-30
**Estado:** Pendiente de aprobación

---

## Resumen

Implementar un sistema completo de gestión de suscripciones que controle el acceso a las funcionalidades de IA basado en el plan del usuario, con límites mensuales de uso y UI para visualizar el consumo.

---

## Planes y Límites Propuestos

| Plan | Consultas IA/mes | Generación Documentos | Precio |
|------|------------------|----------------------|--------|
| **Free** | 20 | 5 | $0 |
| **Pro** | 100 | 50 | $9.99/mes |
| **Whitelisted** | Ilimitado | Ilimitado | N/A (Admin) |

---

## Fase 1: Backend - Tracking de Uso

### 1.1 Actualizar Interfaz UserProfile
```typescript
interface UserProfile {
  // ... campos existentes
  plan: 'free' | 'pro' | 'whitelisted';
  usageThisMonth: number;
  usageLastReset: Date; // Fecha del último reset
}
```

### 1.2 Función para verificar y incrementar uso
- Crear `src/lib/usageLimits.ts`
- Función `canUseAI(user: UserProfile): boolean`
- Función `incrementUsage(user: UserProfile): Promise<void>`
- Función `resetMonthlyUsage(): Promise<void>`

### 1.3 Integrar en llamadas de IA
- Modificar `AIAssistant` para verificar límites
- Modificar `DocumentGenerator` para verificar límites
- Mostrar mensaje cuando se excede el límite

---

## Fase 2: UI - Indicadores de Uso

### 2.1 Componente UsageIndicator
- Barra de progreso mostrando consumo
- Número de consultas restantes
- Badge del plan actual
- Ubicación: Header o Dashboard

### 2.2 Actualizar Dashboard
- Mostrar uso actual en las métricas
- Añadir card de "Consultas IA Restantes"

### 2.3 Modal de Límite Alcanzado
- Mostrar cuando el usuario excede su límite
- Opción de upgrade a Pro
- Botón para ver planes

---

## Fase 3: Sistema de Pagos (Opcional)

### 3.1 Integración con Stripe
- Crear cuenta de Stripe
- Configurar webhooks para pagos
- Productos: Free, Pro

### 3.2 Flujo de Upgrade
- Página de planes con precios
- Checkout de Stripe
- Actualización automática del plan

### 3.3 Gestión de Suscripciones
- Cancelar suscripción
- Downgrade al final del período
- Historial de pagos

---

## Archivos a Crear/Modificar

### Nuevos Archivos
```
src/lib/usageLimits.ts        - Lógica de límites
src/components/UsageIndicator.tsx - UI de uso
src/components/UpgradeModal.tsx    - Modal de upgrade
src/components/PlansPage.tsx       - Página de planes
src/lib/stripe.ts                  - Integración Stripe (Fase 3)
```

### Archivos a Modificar
```
src/App.tsx              - Integrar usage limits
src/lib/gemini.ts        - Añadir verificación de uso
src/components/PaymentPlans.tsx - Actualizar con planes reales
```

---

## Estimación de Tiempo

| Fase | Tiempo | Complejidad |
|------|--------|-------------|
| Fase 1: Backend | 2-3 horas | Media |
| Fase 2: UI | 2-3 horas | Baja |
| Fase 3: Pagos | 4-6 horas | Alta |
| **Total** | **8-12 horas** | |

---

## Dependencias

- Firebase Firestore (ya configurado)
- Stripe account (para Fase 3)
- Variable de entorno `STRIPE_SECRET_KEY`

---

## Orden de Implementación Recomendado

1. ✅ Fase 1.1 - Actualizar interfaz (ya parcialmente hecho)
2. ⬜ Fase 1.2 - Crear `usageLimits.ts`
3. ⬜ Fase 1.3 - Integrar en AI y Documentos
4. ⬜ Fase 2.1 - Crear `UsageIndicator`
5. ⬜ Fase 2.2 - Actualizar Dashboard
6. ⬜ Fase 2.3 - Modal de límite
7. ⬜ Fase 3 - Sistema de pagos (opcional)

---

## Preguntas para el Usuario

1. **¿Los límites se resetean automáticamente cada mes?** → Sí, recomendado
2. **¿El plan "whitelisted" es solo para admins o también para usuarios especiales?** → Confirmar
3. **¿Implementar Stripe en esta fase o dejarlo para después?** → Pendiente confirmación
4. **¿Qué pasa cuando el usuario excede el límite?** → ¿Bloquear o permitir con advertencia?

---

## Próximos Pasos

Una vez aprobado el plan, comenzar con:
1. Crear `src/lib/usageLimits.ts`
2. Modificar `AIAssistant` para verificar límites
3. Actualizar `newProfile` para incluir `usageThisMonth: 0`