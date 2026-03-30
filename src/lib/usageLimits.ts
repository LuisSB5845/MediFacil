import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export type PlanType = 'free' | 'pro' | 'whitelisted';

export interface UsageLimits {
  maxConsultations: number;
}

export const PLAN_LIMITS: Record<PlanType, UsageLimits> = {
  free: { maxConsultations: 20 },
  pro: { maxConsultations: Infinity },
  whitelisted: { maxConsultations: Infinity },
};

export interface UserProfileWithUsage {
  uid: string;
  email: string;
  plan?: PlanType;
  usageThisMonth?: number;
  usageLastReset?: any;
}

/**
 * Verifica si el usuario puede usar la IA
 */
export function canUseAI(user: UserProfileWithUsage | null): { allowed: boolean; remaining: number; limit: number } {
  if (!user) {
    return { allowed: false, remaining: 0, limit: 0 };
  }

  const plan: PlanType = user.plan || 'free';
  const limits = PLAN_LIMITS[plan];
  const currentUsage = user.usageThisMonth || 0;

  // Pro and Whitelisted users have unlimited access
  if (limits.maxConsultations === Infinity) {
    return { allowed: true, remaining: Infinity, limit: Infinity };
  }

  const remaining = Math.max(0, limits.maxConsultations - currentUsage);
  const allowed = currentUsage < limits.maxConsultations;

  return { allowed, remaining, limit: limits.maxConsultations };
}

/**
 * Incrementa el contador de uso del usuario
 */
export async function incrementUsage(user: UserProfileWithUsage): Promise<void> {
  if (!user?.uid) return;

  const newUsage = (user.usageThisMonth || 0) + 1;

  await updateDoc(doc(db, 'users', user.uid), {
    usageThisMonth: newUsage,
  });
}

/**
 * Formatea el número de consultas restantes para mostrar en UI
 */
export function formatUsageDisplay(remaining: number, limit: number): string {
  if (limit === Infinity) {
    return 'Ilimitado';
  }
  return `${remaining} / ${limit} restantes`;
}

/**
 * Obtiene el porcentaje de uso para la barra de progreso
 */
export function getUsagePercentage(usage: number, limit: number): number {
  if (limit === Infinity) return 0;
  return Math.min(100, (usage / limit) * 100);
}

/**
 * Obtiene el nombre del plan para mostrar
 */
export function getPlanDisplayName(plan: PlanType): string {
  const names: Record<PlanType, string> = {
    free: 'Gratis',
    pro: 'Pro',
    whitelisted: 'Whitelisted',
  };
  return names[plan] || 'Gratis';
}

/**
 * Verifica si se debe resetear el uso mensual
 * Retorna true si el último reset fue en un mes diferente
 */
export function shouldResetMonthlyUsage(usageLastReset: any): boolean {
  if (!usageLastReset) return true;

  const lastReset = usageLastReset?.toDate ? usageLastReset.toDate() : new Date(usageLastReset);
  const now = new Date();

  return (
    lastReset.getMonth() !== now.getMonth() ||
    lastReset.getFullYear() !== now.getFullYear()
  );
}

/**
 * Resetea el contador de uso mensual
 */
export async function resetMonthlyUsage(uid: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    usageThisMonth: 0,
    usageLastReset: serverTimestamp(),
  });
}