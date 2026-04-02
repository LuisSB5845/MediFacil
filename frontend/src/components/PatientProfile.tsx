import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  Plus, 
  Trash2, 
  Eye, 
  Edit3, 
  Copy, 
  Activity, 
  History, 
  AlertCircle,
  Calendar,
  User,
  Phone,
  MapPin,
  QrCode,
  PenTool,
  CreditCard,
  FolderOpen,
  Menu,
  ShieldCheck,
  BriefcaseMedical
} from 'lucide-react';
import { motion } from 'motion/react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Patient, Consultation } from '../types';
import { cn } from '../lib/utils';

interface PatientProfileProps {
  patient: Patient;
  onBack: () => void;
  onAddConsultation: () => void;
  onEditPatient: () => void;
  onDeletePatient: (id: string) => void;
  onDeleteConsultation: (pid: string, cid: string) => void;
  onViewConsultation: (c: Consultation) => void;
  onCopyConsultation: (c: Consultation) => void;
}

export const PatientProfile = ({
  patient,
  onBack,
  onAddConsultation,
  onEditPatient,
  onDeletePatient,
  onDeleteConsultation,
  onViewConsultation,
  onCopyConsultation
}: PatientProfileProps) => {
  const [consultations, setConsultations] = useState<Consultation[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'patients', patient.id, 'consultations'),
      orderBy('date', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      setConsultations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Consultation)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `patients/${patient.id}/consultations`);
    });
  }, [patient.id]);

  return (
    <div className="space-y-8 p-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto">
      {/* Navigation & Header */}
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={onBack}
          className="group flex items-center gap-3 text-high-contrast/40 hover:text-primary transition-all font-bold uppercase tracking-widest text-[10px]"
        >
          <div className="w-8 h-8 rounded-full bg-surface-low border border-surface-container-high flex items-center justify-center group-hover:bg-primary/5 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </div>
          Pacientes <span className="opacity-40">/</span> <span className="text-high-contrast">{patient.name}</span>
        </button>
      </div>

      {/* Patient Profile Card */}
      <div className="card-atelier p-10 bg-white border border-surface-container-high shadow-ambient relative overflow-hidden group">
        {/* Background Accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 transition-transform group-hover:scale-110" />
        
        <div className="relative flex flex-col md:flex-row gap-8 items-start">
          {/* Avatar */}
          <div className="w-28 h-28 bg-surface-low rounded-[2rem] flex items-center justify-center text-primary font-bold text-3xl border-2 border-primary/20 shadow-lg relative shrink-0">
            {patient.name.split(' ').map(n => n[0]).join('')}
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-lg border border-white">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="flex-1 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="title-atelier text-3xl text-primary mb-2">{patient.name}</h2>
                <div className="flex flex-wrap items-center gap-4">
                  <span className="px-3 py-1 bg-surface-low rounded-lg text-[10px] font-black uppercase tracking-widest text-high-contrast/40 border border-surface-container-high">
                    #{patient.id.slice(-8).toUpperCase()}
                  </span>
                  <span className="text-xs font-bold text-high-contrast/60 uppercase tracking-widest">
                    {patient.gender}
                  </span>
                  <span className="text-xs font-bold text-high-contrast/60 uppercase tracking-widest">
                    {patient.age} Años
                  </span>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={onEditPatient} className="btn-primary flex items-center gap-2 group/btn">
                  <Edit3 className="w-4 h-4 group-hover/btn:rotate-12 transition-transform" />
                  Modificar Perfil
                </button>
                <button onClick={() => onDeletePatient(patient.id)} className="px-5 py-2.5 rounded-2xl bg-red-50 text-red-500 font-bold text-sm border border-red-100 hover:bg-red-100 transition-all flex items-center gap-2 group/del">
                  <Trash2 className="w-4 h-4 group-hover/del:shake transition-transform" />
                  Eliminar
                </button>
              </div>
            </div>

            {/* Core Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-6 pt-6 border-t border-surface-container-low">
              <div className="space-y-1">
                <p className="label-atelier text-high-contrast/40 uppercase tracking-widest text-[9px]">Alergias</p>
                <p className={cn(
                  "body-atelier font-bold flex items-center gap-1.5",
                  patient.allergies?.toLowerCase() === 'ninguna' ? "text-emerald-500" : "text-red-500"
                )}>
                  <AlertCircle className="w-3 h-3" />
                  {patient.allergies || 'Ninguna'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="label-atelier text-high-contrast/40 uppercase tracking-widest text-[9px]">Grupo Sanguíneo</p>
                <p className="body-atelier font-bold text-primary">{patient.bloodType}</p>
              </div>
              <div className="space-y-1">
                <p className="label-atelier text-high-contrast/40 uppercase tracking-widest text-[9px]">Estatura</p>
                <p className="body-atelier font-bold text-high-contrast">{patient.height} m</p>
              </div>
              <div className="space-y-1">
                <p className="label-atelier text-high-contrast/40 uppercase tracking-widest text-[9px]">Peso</p>
                <p className="body-atelier font-bold text-high-contrast">{patient.weight} kg</p>
              </div>
            </div>

            {/* New Contact Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-surface-container-low">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-surface-low flex items-center justify-center text-primary/40 border border-surface-container-high">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <p className="label-atelier text-high-contrast/40 uppercase tracking-widest text-[9px]">Dirección</p>
                  <p className="body-atelier font-medium text-xs text-high-contrast">{patient.address || 'No registrada'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-surface-low flex items-center justify-center text-primary/40 border border-surface-container-high">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <p className="label-atelier text-high-contrast/40 uppercase tracking-widest text-[9px]">Teléfono</p>
                  <p className="body-atelier font-medium text-xs text-high-contrast">{patient.phone || 'No registrado'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* History Grid (Personal & Family) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="card-atelier p-8 bg-white border border-surface-container-high">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary">
              <User className="w-5 h-5" />
            </div>
            <h3 className="title-atelier text-xl text-primary font-bold">Antecedentes Personales</h3>
          </div>
          <div className="p-4 bg-surface-low rounded-2xl border border-surface-container-high min-h-[100px]">
            <p className="body-atelier text-sm text-high-contrast/70 leading-relaxed italic">
              {patient.personalHistory || 'No se han registrado antecedentes personales patológicos o no patológicos.'}
            </p>
          </div>
        </div>

        <div className="card-atelier p-8 bg-white border border-surface-container-high">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <BriefcaseMedical className="w-5 h-5" />
            </div>
            <h3 className="title-atelier text-xl text-primary font-bold">Antecedentes Familiares</h3>
          </div>
          <div className="p-4 bg-surface-low rounded-2xl border border-surface-container-high min-h-[100px]">
            <p className="body-atelier text-sm text-high-contrast/70 leading-relaxed italic">
              {patient.familyHistory || 'No se han registrado antecedentes heredofamiliares.'}
            </p>
          </div>
        </div>
      </div>

      {/* Consultation History */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="title-atelier text-2xl text-primary font-bold">Historial de Consultas</h3>
            <span className="px-3 py-1 bg-surface-low rounded-full text-xs font-black text-high-contrast/30 border border-surface-container-high tracking-widest">
              {consultations.length}
            </span>
          </div>
          <button onClick={onAddConsultation} className="btn-primary">
            <Plus className="w-5 h-5" />
            Nueva Consulta
          </button>
        </div>

        <div className="space-y-4">
          {consultations.length > 0 ? (
            consultations.map((consultation) => (
              <div 
                key={consultation.id}
                className="group relative card-atelier p-8 bg-white border border-surface-container-high hover:border-primary/30 transition-all hover:shadow-lg overflow-hidden"
              >
                {/* Visual Indicator */}
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary/5 group-hover:bg-primary transition-colors" />
                
                <div className="flex flex-col md:flex-row gap-6 relative">
                  <div className="w-12 h-12 bg-surface-low rounded-2xl flex items-center justify-center text-primary/40 shrink-0 border border-surface-container-high group-hover:bg-primary group-hover:text-white transition-all">
                    <History className="w-6 h-6" />
                  </div>
                  
                  <div className="flex-1 space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <h4 className="text-lg font-bold text-primary group-hover:text-secondary transition-colors mb-1">
                          {consultation.title || "Consulta Médica"}
                        </h4>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black text-high-contrast/40 uppercase tracking-widest bg-surface-low px-2 py-0.5 rounded border border-surface-container-high">
                            {consultation.type || 'Especialidad'}
                          </span>
                          <p className="text-[10px] font-bold text-high-contrast/40 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(consultation.date?.toDate?.() || consultation.date).toLocaleDateString()}
                            <span className="mx-1 opacity-20">•</span>
                            {new Date(consultation.date?.toDate?.() || consultation.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons with VIBRANT COLORS - Always visible for better usability */}
                      <div className="flex items-center gap-3 transition-opacity">
                        <button 
                          onClick={() => onCopyConsultation(consultation)}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white font-black text-[10px] shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 hover:scale-105 active:scale-95 transition-all uppercase tracking-widest border-2 border-emerald-400/20"
                          title="Copiar contenido a nueva consulta"
                        >
                          <Copy className="w-4 h-4" />
                          Copiar
                        </button>
                        <button 
                          onClick={() => onViewConsultation(consultation)}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white font-black text-[10px] shadow-lg shadow-blue-600/30 hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all uppercase tracking-widest border-2 border-blue-500/20"
                          title="Ver detalle completo"
                        >
                          <Eye className="w-4 h-4" />
                          Ver
                        </button>
                        <button 
                          onClick={() => onDeleteConsultation(patient.id, consultation.id)}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 text-white font-black text-[10px] shadow-lg shadow-red-500/30 hover:bg-red-600 hover:scale-105 active:scale-95 transition-all uppercase tracking-widest border-2 border-red-400/20"
                          title="Eliminar consulta"
                        >
                          <Trash2 className="w-4 h-4" />
                          Borrar
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-6 border-t border-surface-container-low/50">
                      <div className="space-y-2">
                        <p className="label-atelier text-high-contrast/30 uppercase tracking-widest text-[9px]">Hallazgos</p>
                        <p className="body-atelier text-high-contrast text-xs line-clamp-2 italic">{consultation.findings}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="label-atelier text-high-contrast/30 uppercase tracking-widest text-[9px]">Diagnóstico</p>
                        <p className="body-atelier text-primary font-bold text-xs line-clamp-2">{consultation.diagnosis}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="label-atelier text-high-contrast/30 uppercase tracking-widest text-[9px]">Laboratorio / Gabinete</p>
                        <p className="body-atelier text-secondary font-bold text-xs line-clamp-2">{consultation.vitals?.labGabinete || 'Ninguno'}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="label-atelier text-high-contrast/30 uppercase tracking-widest text-[9px]">Tratamiento</p>
                        <p className="body-atelier text-high-contrast text-xs line-clamp-2">{consultation.plan}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="card-atelier p-16 text-center border-dashed border-2 bg-surface-low/30 border-surface-container-high">
              <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-high-contrast/10 shadow-lg">
                <FolderOpen className="w-10 h-10" />
              </div>
              <h4 className="title-atelier text-primary mb-2">Sin Registro Clínico</h4>
              <p className="body-atelier text-high-contrast/60">No se han registrado consultas médicas para este expediente aún.</p>
              <button 
                onClick={onAddConsultation}
                className="mt-6 text-primary font-black uppercase tracking-widest text-xs hover:underline flex items-center gap-2 mx-auto"
              >
                <Plus className="w-4 h-4" />
                Registrar primera consulta
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
