import React, { useState, useEffect } from 'react';
import { getDocs, collection, updateDoc, doc } from 'firebase/firestore';
import { AlertCircle, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { UserProfile } from '../types';

export const AdminPanel = ({ currentUserEmail }: { currentUserEmail: string }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'users'));
        setUsers(snapshot.docs.map(d => ({ 
          uid: d.id, 
          ...d.data() 
        } as UserProfile)));
      } catch (err) {
        console.error('Error fetching users:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleChangePlan = (uid: string, newPlan: 'free' | 'pro' | 'whitelisted') => {
    setConfirmConfig({
      title: "Confirmar Cambio de Plan",
      message: `¿Estás seguro que deseas cambiar el plan de este usuario a ${newPlan.toUpperCase()}?`,
      onConfirm: async () => {
        setUpdatingId(uid);
        try {
          await updateDoc(doc(db, 'users', uid), { plan: newPlan });
          setUsers(prev => prev.map(u => u.uid === uid ? { ...u, plan: newPlan } : u));
        } catch (err) {
          console.error('Error updating plan:', err);
        } finally {
          setUpdatingId(null);
          setConfirmConfig(null);
        }
      }
    });
  };

  const handleChangeRole = (uid: string, newRole: 'doctor' | 'admin') => {
    setConfirmConfig({
      title: "Confirmar Cambio de Rol",
      message: `¿Estás seguro que deseas cambiar el rol de este usuario a ${newRole.toUpperCase()}? El acceso administrativo otorga control total sobre la plataforma.`,
      onConfirm: async () => {
        setUpdatingId(uid);
        try {
          await updateDoc(doc(db, 'users', uid), { role: newRole });
          setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role: newRole } : u));
        } catch (err) {
          console.error('Error updating role:', err);
        } finally {
          setUpdatingId(null);
          setConfirmConfig(null);
        }
      }
    });
  };

  const getPlanBadge = (plan?: string) => {
    switch (plan) {
      case 'whitelisted': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'pro': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      default: return 'bg-white/10 text-white/60 border-white/20';
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-2 border-white/20 border-t-white rounded-full" />
    </div>
  );

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {confirmConfig && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmConfig(null)}
              className="absolute inset-0 bg-[#191970]/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative card-atelier w-full max-w-md p-8 border-none shadow-2xl"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="title-atelier text-primary">{confirmConfig.title}</h3>
              </div>
              <p className="body-atelier text-high-contrast/70 mb-8 leading-relaxed">
                {confirmConfig.message}
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setConfirmConfig(null)}
                  className="flex-1 btn-secondary"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmConfig.onConfirm}
                  className="flex-1 btn-primary"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div>
        <h2 className="text-3xl font-bold text-primary tracking-tight">Gestión de Usuarios</h2>
        <p className="text-high-contrast/60 text-sm mt-1 font-medium">
          {users.length} usuarios registrados · Acceso administrativo exclusivo
        </p>
      </div>

      <div className="space-y-3">
        {users.map(u => (
          <div
            key={u.uid}
            className="flex items-center justify-between p-5 rounded-2xl bg-white border border-surface-container-high shadow-ambient transition-all hover:shadow-lg hover:-translate-y-0.5"
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src={u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName || '')}&background=191970&color=fff`}
                  alt={u.displayName}
                  className="w-12 h-12 rounded-full object-cover border-2 border-surface-container-low"
                />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
              </div>
              <div>
                <p className="text-base font-bold text-primary">{u.displayName}</p>
                <p className="text-xs font-medium text-high-contrast/60">{u.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  {u.specialty && (
                    <p className="text-[10px] font-black uppercase tracking-widest text-high-contrast/30">{u.specialty}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full border ${getPlanBadge(u.plan)}`}>
                {u.plan || 'free'}
              </span>

              {u.email !== currentUserEmail && (
                <div className="flex items-center gap-2">
                  <div className="relative group">
                    <select
                      disabled={updatingId === u.uid}
                      value={u.plan || 'free'}
                      onChange={(e) => handleChangePlan(u.uid, e.target.value as any)}
                      className="text-xs font-bold bg-surface-container-low border border-surface-container-high rounded-xl px-4 py-2.5 text-primary hover:bg-white hover:border-primary/30 transition-all focus:outline-none focus:ring-2 focus:ring-primary/10 disabled:opacity-50 cursor-pointer appearance-none pr-10"
                    >
                      <option value="free">Free</option>
                      <option value="pro">Pro</option>
                      <option value="whitelisted">Whitelisted ✓</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-primary/40">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="relative group">
                    <select
                      disabled={updatingId === u.uid}
                      value={u.role || 'doctor'}
                      onChange={(e) => handleChangeRole(u.uid, e.target.value as any)}
                      className="text-xs font-bold bg-surface-container-low border border-surface-container-high rounded-xl px-4 py-2.5 text-primary hover:bg-white hover:border-primary/30 transition-all focus:outline-none focus:ring-2 focus:ring-primary/10 disabled:opacity-50 cursor-pointer appearance-none pr-10"
                    >
                      <option value="doctor">Doctor</option>
                      <option value="admin">Admin</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-primary/40">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              )}

              {u.email === currentUserEmail && (
                <span className="text-[10px] font-bold text-high-contrast/30 uppercase tracking-widest bg-surface-container-low px-3 py-1.5 rounded-full">Admin Root</span>
              )}

              {updatingId === u.uid && (
                <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
