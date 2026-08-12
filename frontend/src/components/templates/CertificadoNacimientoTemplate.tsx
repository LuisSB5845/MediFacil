import React from 'react';
import { BirthCertificationData, UserProfile } from '../../types';
import { Baby, Calendar, Clock, Scale, User, ShieldCheck } from 'lucide-react';

interface Props {
  data: BirthCertificationData;
  profile: UserProfile | null;
}

export const CertificadoNacimientoTemplate: React.FC<Props> = ({ data, profile }) => {
  return (
    <div className="bg-white rounded-[2.5rem] shadow-ambient border border-surface-container-high p-20 relative flex flex-col min-h-[1100px] h-auto w-full">
      {/* Encabezado Oficial */}
      <div className="flex justify-between items-start border-b-2 border-emerald-500/20 pb-10 mb-12">
        <div className="flex items-center gap-8">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm">
            <Baby className="w-9 h-9" />
          </div>
          <div>
            <h2 className="text-xl font-black text-emerald-800 leading-tight">CONSTANCIA DE NACIMIENTO</h2>
            <p className="text-[10px] font-bold text-high-contrast/50 uppercase tracking-widest mt-1">
              Registro Médico Obstetriz / Neonatal
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">DOCUMENTO OFICIAL DE SALUD</p>
          <p className="text-[9px] font-medium text-high-contrast/40 uppercase mt-1">
            Expedido: {data.fechaExpedicion}
          </p>
        </div>
      </div>

      {/* Título Principal */}
      <div className="text-center my-4">
        <h1 className="text-2xl font-black text-emerald-900 tracking-[0.25em] uppercase">CERTIFICADO DE NACIDO VIVO</h1>
        <div className="w-32 h-1 bg-emerald-500/30 mx-auto mt-3" />
      </div>

      {/* Contenido en Grilla de Datos Médicos Estructurados */}
      <div className="flex-1 space-y-8 my-6">
        <p className="text-sm font-medium text-high-contrast/70 leading-relaxed">
          El médico especialista abajo firmante hace constar la atención médica del nacimiento con los siguientes datos del producto:
        </p>

        {/* Datos de la Madre */}
        <div className="bg-emerald-50/40 p-6 rounded-2xl border border-emerald-100 space-y-3">
          <div className="flex items-center gap-2 text-emerald-800 font-black text-xs uppercase tracking-widest">
            <User className="w-4 h-4" /> Datos de la Madre
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-[10px] font-black uppercase text-high-contrast/40">Nombre Completo de la Madre</p>
              <p className="font-bold text-high-contrast text-base">{data.nombreMadre}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-high-contrast/40">Cédula / Documento de Identidad</p>
              <p className="font-bold text-high-contrast text-base">{data.cedulaMadre || 'No especificada'}</p>
            </div>
          </div>
        </div>

        {/* Datos del Recién Nacido */}
        <div className="bg-surface-low/60 p-6 rounded-2xl border border-surface-container-high space-y-4">
          <div className="flex items-center gap-2 text-primary font-black text-xs uppercase tracking-widest">
            <Baby className="w-4 h-4" /> Datos del Recién Nacido
          </div>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-[10px] font-black uppercase text-high-contrast/40">Sexo del Producto</p>
              <p className="font-black text-primary text-lg">{data.sexoProducto}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-high-contrast/40">Peso al Nacer</p>
              <p className="font-black text-high-contrast text-lg">{data.peso}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-high-contrast/40">Hora de Nacimiento</p>
              <p className="font-black text-high-contrast text-lg">{data.hora}</p>
            </div>
          </div>
        </div>

        {/* Fecha Detallada de Nacimiento */}
        <div className="bg-surface-low/40 p-6 rounded-2xl border border-surface-container-high">
          <p className="text-[10px] font-black uppercase text-high-contrast/40 tracking-widest mb-2">Fecha Exacta del Alumbramiento</p>
          <div className="flex items-center gap-6 text-center">
            <div className="flex-1 bg-white p-3 rounded-xl border border-surface-container-high">
              <p className="text-[9px] font-bold text-high-contrast/40 uppercase">Día</p>
              <p className="text-xl font-black text-primary">{data.dia}</p>
            </div>
            <div className="flex-1 bg-white p-3 rounded-xl border border-surface-container-high">
              <p className="text-[9px] font-bold text-high-contrast/40 uppercase">Mes</p>
              <p className="text-xl font-black text-primary">{data.mes}</p>
            </div>
            <div className="flex-1 bg-white p-3 rounded-xl border border-surface-container-high">
              <p className="text-[9px] font-bold text-high-contrast/40 uppercase">Año</p>
              <p className="text-xl font-black text-primary">{data.anio}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pie y Firma del Médico Tratante */}
      <div className="mt-auto pt-16 border-t border-surface-container-high flex flex-col items-center">
        <div className="w-56 h-[1px] bg-high-contrast/30 mb-3" />
        <p className="text-sm font-black text-emerald-900">Dr(a). {data.medicoTratante || profile?.displayName}</p>
        <p className="text-[10px] font-bold text-high-contrast/40 uppercase tracking-widest mt-0.5">Médico Tratante / Exequátur</p>
      </div>
    </div>
  );
};
