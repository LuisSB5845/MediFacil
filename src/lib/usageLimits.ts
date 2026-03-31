import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

export type PlanType = 'free' | 'pro' | 'whitelisted';

export interface UsageLimits {
  maxConsultations: number;
  maxDocuments: number;
  maxAIMessages: number;
}

export const PLAN_LIMITS: Record<PlanType, UsageLimits> = {
  free: { 
    maxConsultations: 20,
    maxDocuments: 5,
    maxAIMessages: 20
  },
  pro: { 
    maxConsultations: Infinity,
    maxDocuments: Infinity,
    maxAIMessages: Infinity
  },
  whitelisted: { 
    maxConsultations: Infinity,
    maxDocuments: Infinity,
    maxAIMessages: Infinity
  },
};

export interface UserProfileWithUsage {
  uid: string;
  role?: 'admin' | 'doctor';
  plan?: PlanType;
  consultationsThisMonth?: number;
  documentsThisMonth?: number;
  aiMessagesThisMonth?: number;
  usageResetDate?: string;
}

/**
 * Checks if the user can use AI messages.
 */
export function canUseAI(user: UserProfileWithUsage | null): { allowed: boolean; remaining: number; limit: number } {
  if (!user) return { allowed: false, remaining: 0, limit: 0 };

  // Admins and Pro/Whitelisted plans have unlimited AI
  if (user.role === 'admin' || user.plan === 'whitelisted' || user.plan === 'pro') {
    return { allowed: true, remaining: Infinity, limit: Infinity };
  }

  const limits = PLAN_LIMITS[user.plan || 'free'];
  const currentUsage = user.aiMessagesThisMonth || 0;

  const remaining = Math.max(0, limits.maxAIMessages - currentUsage);
  const allowed = currentUsage < limits.maxAIMessages;

  return { allowed, remaining, limit: limits.maxAIMessages };
}

/**
 * Checks if the user can create a consultation.
 */
export function canCreateConsultation(user: UserProfileWithUsage | null): { allowed: boolean; remaining: number; limit: number } {
  if (!user) return { allowed: false, remaining: 0, limit: 0 };

  const plan: PlanType = user.plan || 'free';
  const limits = PLAN_LIMITS[plan];
  const currentUsage = user.consultationsThisMonth || 0;

  if (limits.maxConsultations === Infinity) {
    return { allowed: true, remaining: Infinity, limit: Infinity };
  }

  const remaining = Math.max(0, limits.maxConsultations - currentUsage);
  const allowed = currentUsage < limits.maxConsultations;

  return { allowed, remaining, limit: limits.maxConsultations };
}

/**
 * Increments AI message usage.
 */
export async function incrementAIUsage(uid: string, currentUsage: number): Promise<void> {
  if (!uid) return;
  await updateDoc(doc(db, 'users', uid), {
    aiMessagesThisMonth: currentUsage + 1,
  });
}

/**
 * Increments consultation usage.
 */
export async function incrementConsultationUsage(uid: string, currentUsage: number): Promise<void> {
  if (!uid) return;
  await updateDoc(doc(db, 'users', uid), {
    consultationsThisMonth: currentUsage + 1,
  });
}

/**
 * Checks if monthly usage should be reset.
 */
export function shouldResetMonthlyUsage(usageResetDate: string | undefined): boolean {
  if (!usageResetDate) return true;
  const resetDate = new Date(usageResetDate);
  const now = new Date();
  return now >= resetDate;
}

/**
 * Resets monthly usage counters.
 */
export async function resetMonthlyUsage(uid: string): Promise<void> {
  const nextReset = new Date();
  nextReset.setMonth(nextReset.getMonth() + 1);
  nextReset.setDate(1);
  nextReset.setHours(0, 0, 0, 0);

  await updateDoc(doc(db, 'users', uid), {
    consultationsThisMonth: 0,
    documentsThisMonth: 0,
    aiMessagesThisMonth: 0,
    usageResetDate: nextReset.toISOString(),
  });
}

export function formatUsageDisplay(remaining: number, limit: number): string {
  if (limit === Infinity) return 'Ilimitado';
  return `${remaining} / ${limit} restantes`;
}

export function getPlanDisplayName(plan: PlanType): string {
  const names: Record<PlanType, string> = {
    free: 'Gratis',
    pro: 'Pro',
    whitelisted: 'Whitelisted',
  };
  return names[plan] || 'Gratis';
}