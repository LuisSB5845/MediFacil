import React from 'react';
import { UserProfile } from '../../types';

/**
 * Membrete y pie de firma del Centro Médico, comunes a las tres plantillas
 * (Certificado Médico, Constancia de Nacimiento y Presupuesto Médico).
 * Los datos salen del perfil del médico; los valores por defecto reproducen
 * el papel membretado actual.
 */

export interface MembreteProps {
  profile: UserProfile | null;
}

export const MembreteClinica = ({ profile }: MembreteProps) => (
  <div className="flex items-start justify-between gap-6 shrink-0">
    <div className="flex items-center gap-4">
      {profile?.clinicLogoUrl && (
        <img src={profile.clinicLogoUrl} alt="" className="h-16 w-auto object-contain" />
      )}
      <div className="leading-tight">
        <p className="text-lg font-black text-high-contrast">
          {profile?.clinicName || 'Centro Médico V Centenario, S. A. S.'}
        </p>
        <p className="text-[11px] font-bold text-high-contrast/60 uppercase tracking-wide">
          {profile?.clinicTagline || 'Salud al Alcance de Todos'}
        </p>
      </div>
    </div>
    <div className="text-[10px] font-bold text-high-contrast/60 leading-tight text-right">
      <p>{profile?.clinicAddress || 'C. Duarte No. 21'}</p>
      <p>La Vega, Rep. Dom.</p>
      {profile?.clinicSuite && <p>{profile.clinicSuite}</p>}
      <p>Tel: {profile?.phoneOffice || '(809) 573-4124'}{profile?.phoneExt ? ` Ext: ${profile.phoneExt}` : ''}</p>
      {profile?.phoneCell && <p>Cel: {profile.phoneCell}</p>}
      <p>Fax: (809) 573-0656</p>
    </div>
  </div>
);

/** Pie de firma: línea, nombre del médico y exequátur. */
export const FirmaMedico = ({
  profile,
  conLinea = true,
  etiqueta,
}: MembreteProps & { conLinea?: boolean; etiqueta?: string }) => (
  <div className="flex flex-col items-center text-center gap-1 shrink-0">
    {conLinea && <div className="w-72 border-b border-high-contrast/60 mb-2" />}
    {etiqueta && (
      <p className="text-[11px] font-bold text-high-contrast/60">{etiqueta}</p>
    )}
    <p className="text-sm font-black text-high-contrast">
      {profile?.displayName || 'Dra. Isabel Beato'}
    </p>
    <p className="text-[11px] font-bold text-high-contrast/60">
      Exequátur {profile?.exequatur || '304-06'}
    </p>
  </div>
);

/** Hoja carta con la misma geometría que el resto de documentos imprimibles. */
export const HojaDocumento = ({
  children,
  documentRef,
}: {
  children: React.ReactNode;
  documentRef?: React.RefObject<HTMLDivElement>;
}) => (
  <div
    ref={documentRef}
    className="receta-hoja bg-white rounded-[2rem] shadow-ambient border border-surface-container-high p-14 relative flex flex-col min-h-[1056px] w-full max-w-[816px] mx-auto"
  >
    {children}
  </div>
);
