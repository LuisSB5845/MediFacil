import React from 'react';
import { NarrativeCertificationData, UserProfile } from '../../types';
import { BriefcaseMedical, Calendar, Award } from 'lucide-react';

interface Props {
  data: NarrativeCertificationData;
  profile: UserProfile | null;
}

export const CertificadoNarrativoTemplate: React.FC<Props> = ({ data, profile }) => {
  return (
    <div className="bg-white rounded-[2.5rem] shadow-ambient border border-surface-container-high p-20 relative flex flex-col min-h-[1100px] h-auto w-full">
      {/* Header Médico */}
      <div className="flex justify-between items-start border-b-2 border-primary/10 pb-10 mb-14">
        <div className="flex items-center gap-8">
          <div className="w-16 h-16 bg-primary/5 rounded-2xl border border-primary/10 flex items-center justify-center text-primary shadow-sm">
            <BriefcaseMedical className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-black text-primary leading-tight">
              Dr(a). {data.issuerDoctor || profile?.displayName || 'Médico Tratante'}
            </h2>
            <p className="text-[10px] font-bold text-high-contrast/50 uppercase tracking-widest mt-1">
              {profile?.specialty || 'Especialista en Medicina General'}
            </p>
            {profile?.professionalId && (
              <p className="text-[9px] font-bold text-high-contrast/30 uppercase tracking-widest mt-0.5">
                Exequátur / Cédula Prof.: {profile.professionalId}
              </p>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-high-contrast/80 uppercase tracking-widest">CERTIFICADO MÉDICO</p>
          <p className="text-[9px] font-medium text-high-contrast/40 uppercase mt-1">
            Fecha: {data.date || new Date().toLocaleDateString('es-DO')}
          </p>
        </div>
      </div>

      {/* Título Central */}
      <div className="text-center my-6">
        <h1 className="text-3xl font-black text-primary tracking-[0.3em] uppercase">CERTIFICADO MÉDICO</h1>
        <div className="w-24 h-1 bg-primary/20 mx-auto mt-4" />
      </div>

      {/* Cuerpo del Certificado */}
      <div className="flex-1 space-y-8 text-high-contrast leading-[2] text-justify text-base font-medium px-4 my-8">
        <p className="text-xl font-black tracking-tight">A QUIEN PUEDA INTERESAR:</p>
        
        <p className="text-lg">
          Quien suscribe, profesional de la medicina debidamente facultado para el ejercicio profesional, certifica que ha examinado a el/la paciente{' '}
          <strong className="font-black text-primary underline decoration-primary/30 underline-offset-4">
            {data.patientName}
          </strong>
          {data.patientId ? ` (Cédula/ID: ${data.patientId})` : ''}.
        </p>

        <div className="bg-surface-low/50 p-8 rounded-2xl border-l-4 border-primary space-y-3">
          <p className="text-xs font-black uppercase text-primary/70 tracking-widest">Diagnóstico y Valoración Clínica</p>
          <p className="text-base italic leading-relaxed text-high-contrast/90">{data.diagnosis}</p>
        </div>

        {data.restDays && (
          <p className="text-base font-semibold">
            Por tal motivo, se amerita e indica reposo médico por un período de{' '}
            <span className="font-black text-primary">{data.restDays}</span>.
          </p>
        )}

        {data.recommendations && (
          <div className="space-y-2 pt-2">
            <p className="text-xs font-black uppercase text-high-contrast/40 tracking-widest">Recomendaciones e Indicaciones</p>
            <p className="text-sm font-medium text-high-contrast/80">{data.recommendations}</p>
          </div>
        )}

        <p className="text-sm text-high-contrast/60 pt-6">
          Se expide el presente certificado a solicitud de la parte interesada para los fines correspondientes.
        </p>
      </div>

      {/* Pie y Firma */}
      <div className="mt-auto pt-16 border-t border-surface-container-high flex flex-col items-center">
        <div className="w-56 h-[1px] bg-high-contrast/30 mb-3" />
        <p className="text-sm font-black text-primary">Dr(a). {data.issuerDoctor || profile?.displayName}</p>
        <p className="text-[10px] font-bold text-high-contrast/40 uppercase tracking-widest mt-0.5">Firma y Sello Médico</p>
      </div>
    </div>
  );
};
