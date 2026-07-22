import React, { useState } from 'react';
import { Camera, BadgeCheck, User as UserIcon, Stethoscope } from 'lucide-react';
import { UserProfile } from '../types';
import { cn } from '../lib/utils';

export const SettingsScreen = ({ user, onUpdate }: { user: UserProfile | null; onUpdate: (u: Partial<UserProfile>) => void }) => {
  const [formData, setFormData] = useState<Partial<UserProfile>>(user || {});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
  };

  return (
    <div className="p-12 max-w-6xl mx-auto">
      <div className="mb-12 flex items-end justify-between">
        <div>
          <span className="label-atelier text-secondary mb-2 block uppercase tracking-widest">Perfil Profesional</span>
          <h2 className="display-atelier text-primary">Configuración</h2>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setFormData(user || {})}
            className="btn-secondary"
          >
            Descartar
          </button>
          <button 
            onClick={handleSubmit}
            className="btn-primary"
          >
            Guardar Cambios
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-4 space-y-8">
          <div className="card-atelier p-8 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-2 sidebar-gradient" />
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-6">
                <div className="w-32 h-32 rounded-full border-4 border-surface-low p-1 bg-white shadow-inner">
                  <img src={user?.photoURL || "https://picsum.photos/seed/doctor/200"} alt="Profile" className="w-full h-full rounded-full object-cover" />
                </div>
                <button className="absolute bottom-1 right-1 bg-white p-2 rounded-full shadow-ambient text-primary hover:text-secondary transition-colors">
                  <Camera className="w-4 h-4" />
                </button>
              </div>
              <h3 className="title-atelier text-primary mb-1">{user?.displayName}</h3>
              <p className="text-secondary font-bold text-sm mb-4 body-atelier">{user?.specialty || "Especialidad no definida"}</p>
              <div className="flex items-center gap-2 bg-surface-low px-4 py-1.5 rounded-full">
                <BadgeCheck className="w-4 h-4 text-primary fill-current" />
                <span className="label-atelier text-primary font-bold">ID: {user?.professionalId || "82910-MX"}</span>
              </div>
            </div>
          </div>
          <div className="bg-surface-high p-8 rounded-2xl">
            <h4 className="label-atelier text-primary mb-6 uppercase tracking-widest">Estado de Cuenta</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="body-atelier text-high-contrast/60">Plan Actual</span>
                <span className="body-atelier font-bold text-primary">Premium Atelier</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="body-atelier text-high-contrast/60">Próximo Pago</span>
                <span className="body-atelier font-bold text-primary">12 Oct, 2026</span>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-8 space-y-8">
          <section className="card-atelier p-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
                <UserIcon className="w-5 h-5" />
              </div>
              <h3 className="title-atelier text-primary">Datos Personales</h3>
            </div>
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="label-atelier text-high-contrast/40 px-1 uppercase tracking-widest text-[10px]">Nombre Completo</label>
                <input 
                  className="input-field w-full" 
                  type="text" 
                  value={formData.displayName || ''}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="label-atelier text-high-contrast/40 px-1 uppercase tracking-widest text-[10px]">Correo Electrónico</label>
                <input 
                  className="input-field w-full opacity-60 cursor-not-allowed" 
                  type="email" 
                  value={formData.email || ''}
                  readOnly
                />
              </div>
              <div className="space-y-2">
                <label className="label-atelier text-high-contrast/40 px-1 uppercase tracking-widest text-[10px]">Teléfono de Contacto</label>
                <input 
                  className="input-field w-full" 
                  type="tel" 
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="label-atelier text-high-contrast/40 px-1 uppercase tracking-widest text-[10px]">Ubicación de Consultorio</label>
                <input 
                  className="input-field w-full" 
                  type="text" 
                  value={formData.officeLocation || ''}
                  onChange={(e) => setFormData({ ...formData, officeLocation: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="label-atelier text-high-contrast/40 px-1 uppercase tracking-widest text-[10px]">Género / Trato</label>
                <div className="flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setFormData({ ...formData, gender: 'male' })}
                    className={cn(
                      "flex-1 p-4 rounded-xl border-2 transition-all font-bold text-sm flex items-center justify-center gap-2",
                      formData.gender === 'male' 
                        ? "bg-primary/5 border-primary text-primary" 
                        : "bg-surface-low border-surface-container-high text-high-contrast/40 hover:border-primary/30"
                    )}
                  >
                    <UserIcon className="w-4 h-4" />
                    Dr. (Masculino)
                  </button>
                  <button 
                    type="button"
                    onClick={() => setFormData({ ...formData, gender: 'female' })}
                    className={cn(
                      "flex-1 p-4 rounded-xl border-2 transition-all font-bold text-sm flex items-center justify-center gap-2",
                      formData.gender === 'female' 
                        ? "bg-secondary/5 border-secondary text-secondary" 
                        : "bg-surface-low border-surface-container-high text-high-contrast/40 hover:border-secondary/30"
                    )}
                  >
                    <UserIcon className="w-4 h-4" />
                    Dra. (Femenino)
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="card-atelier p-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-lg bg-secondary/5 flex items-center justify-center text-secondary">
                <Stethoscope className="w-5 h-5" />
              </div>
              <h3 className="title-atelier text-primary">Especialidad Médica</h3>
            </div>
            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="label-atelier text-high-contrast/40 px-1 uppercase tracking-widest text-[10px]">Especialidad Principal</label>
                  <input 
                    className="input-field w-full" 
                    type="text" 
                    value={formData.specialty || ''}
                    onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="label-atelier text-high-contrast/40 px-1 uppercase tracking-widest text-[10px]">Cédula Profesional</label>
                  <input 
                    className="input-field w-full" 
                    type="text" 
                    value={formData.professionalId || ''}
                    onChange={(e) => setFormData({ ...formData, professionalId: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="label-atelier text-high-contrast/40 px-1 uppercase tracking-widest text-[10px]">Resumen Profesional (Bio)</label>
                <textarea 
                  className="input-field w-full resize-none" 
                  rows={4}
                  value={formData.bio || ''}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
