import React, { useState, useRef } from 'react';
import { Camera, BadgeCheck, User as UserIcon, Stethoscope, Building2, Image as ImageIcon, Upload, Loader2, Trash2, Phone, MapPin, Award } from 'lucide-react';
import { UserProfile } from '../types';
import { cn } from '../lib/utils';
import { uploadLogoImage } from '../lib/storage';

export const SettingsScreen = ({ user, onUpdate }: { user: UserProfile | null; onUpdate: (u: Partial<UserProfile>) => void }) => {
  const [formData, setFormData] = useState<Partial<UserProfile>>(user || {});
  const [uploadingClinicLogo, setUploadingClinicLogo] = useState(false);
  const [uploadingDoctorLogo, setUploadingDoctorLogo] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const clinicLogoInputRef = useRef<HTMLInputElement>(null);
  const doctorLogoInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'clinic' | 'doctor') => {
    const file = e.target.files?.[0];
    if (!file || !user?.uid) return;

    setUploadError(null);
    if (type === 'clinic') setUploadingClinicLogo(true);
    else setUploadingDoctorLogo(true);

    try {
      // Devuelve un data URI Base64 comprimido (300x300 JPEG). No hay Storage:
      // el string se guarda directamente en el documento del usuario.
      const dataUri = await uploadLogoImage(file, user.uid, type);
      const field = type === 'clinic' ? 'clinicLogoUrl' : 'doctorLogoUrl';
      setFormData(prev => ({ ...prev, [field]: dataUri }));
      onUpdate({ [field]: dataUri });
    } catch (err: any) {
      console.error(`Error al subir logo de ${type}:`, err);
      setUploadError(err.message || 'Error al subir la imagen.');
    } finally {
      if (type === 'clinic') setUploadingClinicLogo(false);
      else setUploadingDoctorLogo(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleRemoveLogo = (type: 'clinic' | 'doctor') => {
    const field = type === 'clinic' ? 'clinicLogoUrl' : 'doctorLogoUrl';
    setFormData(prev => ({ ...prev, [field]: '' }));
    onUpdate({ [field]: '' });
  };

  return (
    <div className="p-8 md:p-12 max-w-6xl mx-auto">
      <div className="mb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="label-atelier text-secondary mb-2 block uppercase tracking-widest">Perfil & Identidad Institucional</span>
          <h2 className="display-atelier text-primary">Configuración del Médico</h2>
        </div>
        <div className="flex gap-4">
          <button 
            type="button"
            onClick={() => setFormData(user || {})}
            className="btn-secondary"
          >
            Descartar
          </button>
          <button 
            type="button"
            onClick={handleSubmit}
            className="btn-primary"
          >
            Guardar Cambios
          </button>
        </div>
      </div>

      {uploadError && (
        <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm font-semibold flex justify-between items-center">
          <span>⚠️ {uploadError}</span>
          <button onClick={() => setUploadError(null)} className="text-red-500 hover:text-red-700 font-bold ml-4">✕</button>
        </div>
      )}

      <div className="grid grid-cols-12 gap-8">
        {/* Columna Izquierda: Tarjeta Resumen */}
        <div className="col-span-12 lg:col-span-4 space-y-8">
          <div className="card-atelier p-8 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-2 sidebar-gradient" />
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-6">
                <div className="w-32 h-32 rounded-full border-4 border-surface-low p-1 bg-white shadow-inner flex items-center justify-center overflow-hidden">
                  <img src={user?.photoURL || "https://picsum.photos/seed/doctor/200"} alt="Profile" className="w-full h-full rounded-full object-cover" />
                </div>
              </div>
              <h3 className="title-atelier text-primary mb-1">{formData.displayName || user?.displayName}</h3>
              <p className="text-secondary font-bold text-sm mb-2 body-atelier">{formData.specialty || "Especialidad no definida"}</p>
              {formData.clinicName && (
                <p className="text-xs font-semibold text-high-contrast/60 mb-4">{formData.clinicName}</p>
              )}
              <div className="flex items-center gap-2 bg-surface-low px-4 py-1.5 rounded-full">
                <BadgeCheck className="w-4 h-4 text-primary fill-current" />
                <span className="label-atelier text-primary font-bold">Exequátur: {formData.exequatur || user?.exequatur || "Sin registrar"}</span>
              </div>
            </div>
          </div>

          <div className="bg-surface-high p-8 rounded-2xl">
            <h4 className="label-atelier text-primary mb-6 uppercase tracking-widest">Resumen de Branding</h4>
            <div className="space-y-4 text-xs">
              <div className="flex justify-between items-center">
                <span className="body-atelier text-high-contrast/60">Logo Clínica</span>
                <span className={cn("font-bold", formData.clinicLogoUrl ? "text-emerald-600" : "text-amber-600")}>
                  {formData.clinicLogoUrl ? "✓ Cargado" : "Pendiente"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="body-atelier text-high-contrast/60">Logo/Sello Personal</span>
                <span className={cn("font-bold", formData.doctorLogoUrl ? "text-emerald-600" : "text-amber-600")}>
                  {formData.doctorLogoUrl ? "✓ Cargado" : "Pendiente"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Formulario Extendido */}
        <div className="col-span-12 lg:col-span-8 space-y-8">
          
          {/* 1. Datos Personales del Doctor */}
          <section className="card-atelier p-8 md:p-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
                <UserIcon className="w-5 h-5" />
              </div>
              <h3 className="title-atelier text-primary">Datos Personales del Médico</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="label-atelier text-high-contrast/40 px-1 uppercase tracking-widest text-[10px]">Nombre Completo (con título)</label>
                <input 
                  className="input-field w-full" 
                  type="text" 
                  placeholder="Ej: Dr. Julián Rivera"
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
                <label className="label-atelier text-high-contrast/40 px-1 uppercase tracking-widest text-[10px]">Teléfono Móvil / Celular</label>
                <input 
                  className="input-field w-full" 
                  type="tel" 
                  placeholder="Ej: +1 (809) 555-0199"
                  value={formData.phoneCell || formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phoneCell: e.target.value, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="label-atelier text-high-contrast/40 px-1 uppercase tracking-widest text-[10px]">Género / Trato</label>
                <div className="flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setFormData({ ...formData, gender: 'male' })}
                    className={cn(
                      "flex-1 p-3.5 rounded-xl border-2 transition-all font-bold text-xs flex items-center justify-center gap-2",
                      formData.gender === 'male' 
                        ? "bg-primary/5 border-primary text-primary" 
                        : "bg-surface-low border-surface-container-high text-high-contrast/40 hover:border-primary/30"
                    )}
                  >
                    Dr. (Masculino)
                  </button>
                  <button 
                    type="button"
                    onClick={() => setFormData({ ...formData, gender: 'female' })}
                    className={cn(
                      "flex-1 p-3.5 rounded-xl border-2 transition-all font-bold text-xs flex items-center justify-center gap-2",
                      formData.gender === 'female' 
                        ? "bg-secondary/5 border-secondary text-secondary" 
                        : "bg-surface-low border-surface-container-high text-high-contrast/40 hover:border-secondary/30"
                    )}
                  >
                    Dra. (Femenino)
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* 2. Especialidad & Registro Profesional */}
          <section className="card-atelier p-8 md:p-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-lg bg-secondary/5 flex items-center justify-center text-secondary">
                <Stethoscope className="w-5 h-5" />
              </div>
              <h3 className="title-atelier text-primary">Especialidad & Credenciales</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="label-atelier text-high-contrast/40 px-1 uppercase tracking-widest text-[10px]">Especialidad Principal *</label>
                <input 
                  className="input-field w-full" 
                  type="text" 
                  placeholder="Ej: Pediatría / Medicina Interna"
                  value={formData.specialty || ''}
                  onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="label-atelier text-high-contrast/40 px-1 uppercase tracking-widest text-[10px]">Exequátur *</label>
                <input 
                  className="input-field w-full" 
                  type="text" 
                  placeholder="Ej: 12345-EX"
                  value={formData.exequatur || ''}
                  onChange={(e) => setFormData({ ...formData, exequatur: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="label-atelier text-high-contrast/40 px-1 uppercase tracking-widest text-[10px]">Cédula Profesional / Colegiatura</label>
                <input 
                  className="input-field w-full" 
                  type="text" 
                  placeholder="Ej: 402-0000000-0"
                  value={formData.professionalId || ''}
                  onChange={(e) => setFormData({ ...formData, professionalId: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2 mt-6">
              <label className="label-atelier text-high-contrast/40 px-1 uppercase tracking-widest text-[10px]">Biografía / Resumen Profesional</label>
              <textarea 
                className="input-field w-full resize-none" 
                rows={3}
                placeholder="Breve reseña sobre experiencia y trayectoria..."
                value={formData.bio || ''}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              />
            </div>
          </section>

          {/* 3. Branding Institucional & Datos de Clínica */}
          <section className="card-atelier p-8 md:p-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="title-atelier text-primary">Información Institucional / Clínica</h3>
                <p className="text-xs text-high-contrast/50 mt-0.5">Se utilizará como encabezado en recetas y certificaciones generadas.</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="label-atelier text-high-contrast/40 px-1 uppercase tracking-widest text-[10px]">Nombre de la Clínica / Centro Médico *</label>
                  <input 
                    className="input-field w-full" 
                    type="text" 
                    placeholder="Ej: Centro Médico San Rafael"
                    value={formData.clinicName || ''}
                    onChange={(e) => setFormData({ ...formData, clinicName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="label-atelier text-high-contrast/40 px-1 uppercase tracking-widest text-[10px]">Lema / Tagline Institucional</label>
                  <input 
                    className="input-field w-full" 
                    type="text" 
                    placeholder="Ej: Excelencia y calidez humana"
                    value={formData.clinicTagline || ''}
                    onChange={(e) => setFormData({ ...formData, clinicTagline: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-2">
                  <label className="label-atelier text-high-contrast/40 px-1 uppercase tracking-widest text-[10px]">Dirección de la Clínica *</label>
                  <input 
                    className="input-field w-full" 
                    type="text" 
                    placeholder="Ej: Av. Abraham Lincoln #456, Piantini"
                    value={formData.clinicAddress || formData.officeLocation || ''}
                    onChange={(e) => setFormData({ ...formData, clinicAddress: e.target.value, officeLocation: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="label-atelier text-high-contrast/40 px-1 uppercase tracking-widest text-[10px]">Consultorio / Suite</label>
                  <input 
                    className="input-field w-full" 
                    type="text" 
                    placeholder="Ej: Suite 402, Nivel 4"
                    value={formData.clinicSuite || ''}
                    onChange={(e) => setFormData({ ...formData, clinicSuite: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="label-atelier text-high-contrast/40 px-1 uppercase tracking-widest text-[10px]">Teléfono de Oficina / Consultorio</label>
                  <input 
                    className="input-field w-full" 
                    type="tel" 
                    placeholder="Ej: (809) 555-4321"
                    value={formData.phoneOffice || ''}
                    onChange={(e) => setFormData({ ...formData, phoneOffice: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="label-atelier text-high-contrast/40 px-1 uppercase tracking-widest text-[10px]">Extensión Telefónica</label>
                  <input 
                    className="input-field w-full" 
                    type="text" 
                    placeholder="Ej: Ext. 104"
                    value={formData.phoneExt || ''}
                    onChange={(e) => setFormData({ ...formData, phoneExt: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* 4. Subida Independiente de Logos (Zonas de Carga) */}
          <section className="card-atelier p-8 md:p-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="title-atelier text-primary">Branding Visual & Logos Institucionales</h3>
                <p className="text-xs text-high-contrast/50 mt-0.5">Formatos permitidos: PNG, JPG, SVG (máx. 2MB). La imagen se optimiza automáticamente a 300x300px y se guarda en tu perfil.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Zona 1: Logo Institucional / Clínica */}
              <div className="bg-surface-low/60 border-2 border-dashed border-surface-container-high rounded-2xl p-6 flex flex-col items-center justify-between text-center space-y-4 relative">
                <input 
                  type="file" 
                  ref={clinicLogoInputRef}
                  className="hidden" 
                  accept="image/png,image/jpeg,image/svg+xml"
                  onChange={(e) => handleLogoUpload(e, 'clinic')}
                />
                
                <span className="label-atelier text-primary font-bold uppercase tracking-widest text-[10px]">Logo de la Clínica / Centro</span>
                
                {formData.clinicLogoUrl ? (
                  <div className="relative group w-full flex flex-col items-center">
                    <div className="w-32 h-24 bg-white border border-surface-container-high rounded-xl p-2 flex items-center justify-center shadow-sm overflow-hidden">
                      <img src={formData.clinicLogoUrl} alt="Logo Clínica" className="max-w-full max-h-full object-contain" />
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button 
                        type="button"
                        onClick={() => clinicLogoInputRef.current?.click()}
                        className="px-3 py-1.5 bg-white border border-surface-container-high rounded-lg text-xs font-bold text-primary hover:bg-surface-low transition-colors"
                      >
                        Reemplazar
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleRemoveLogo('clinic')}
                        className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                        title="Eliminar logo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-3 py-4">
                    <div className="w-12 h-12 rounded-xl bg-white border border-surface-container-high flex items-center justify-center text-high-contrast/30">
                      {uploadingClinicLogo ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : <Upload className="w-6 h-6" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-primary">Cargar Logo Clínica</p>
                      <p className="text-[10px] text-high-contrast/40">PNG, JPG o SVG · se optimiza a 300x300px</p>
                    </div>
                    <button 
                      type="button"
                      disabled={uploadingClinicLogo}
                      onClick={() => clinicLogoInputRef.current?.click()}
                      className="btn-secondary py-2 px-4 text-xs"
                    >
                      {uploadingClinicLogo ? "Procesando..." : "Seleccionar Archivo"}
                    </button>
                  </div>
                )}
              </div>

              {/* Zona 2: Logo Personal / Sello de Médico */}
              <div className="bg-surface-low/60 border-2 border-dashed border-surface-container-high rounded-2xl p-6 flex flex-col items-center justify-between text-center space-y-4 relative">
                <input 
                  type="file" 
                  ref={doctorLogoInputRef}
                  className="hidden" 
                  accept="image/png,image/jpeg,image/svg+xml"
                  onChange={(e) => handleLogoUpload(e, 'doctor')}
                />
                
                <span className="label-atelier text-secondary font-bold uppercase tracking-widest text-[10px]">Logo Personal / Sello de Médico</span>
                
                {formData.doctorLogoUrl ? (
                  <div className="relative group w-full flex flex-col items-center">
                    <div className="w-32 h-24 bg-white border border-surface-container-high rounded-xl p-2 flex items-center justify-center shadow-sm overflow-hidden">
                      <img src={formData.doctorLogoUrl} alt="Logo Personal" className="max-w-full max-h-full object-contain" />
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button 
                        type="button"
                        onClick={() => doctorLogoInputRef.current?.click()}
                        className="px-3 py-1.5 bg-white border border-surface-container-high rounded-lg text-xs font-bold text-secondary hover:bg-surface-low transition-colors"
                      >
                        Reemplazar
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleRemoveLogo('doctor')}
                        className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                        title="Eliminar sello/logo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-3 py-4">
                    <div className="w-12 h-12 rounded-xl bg-white border border-surface-container-high flex items-center justify-center text-high-contrast/30">
                      {uploadingDoctorLogo ? <Loader2 className="w-6 h-6 animate-spin text-secondary" /> : <Upload className="w-6 h-6" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-secondary">Cargar Logo/Sello Personal</p>
                      <p className="text-[10px] text-high-contrast/40">PNG, JPG o SVG · se optimiza a 300x300px</p>
                    </div>
                    <button 
                      type="button"
                      disabled={uploadingDoctorLogo}
                      onClick={() => doctorLogoInputRef.current?.click()}
                      className="btn-secondary py-2 px-4 text-xs"
                    >
                      {uploadingDoctorLogo ? "Procesando..." : "Seleccionar Archivo"}
                    </button>
                  </div>
                )}
              </div>

            </div>
          </section>

        </div>
      </div>
    </div>
  );
};
