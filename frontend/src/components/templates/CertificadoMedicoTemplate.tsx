import React from 'react';
import { UserProfile } from '../../types';
import { MembreteClinica, FirmaMedico, HojaDocumento } from './MembreteClinica';

// Certificado médico narrativo, calcado de Certificacion.docx:
// membrete → título → un párrafo de texto libre → firma.

export interface CertificadoMedicoData {
  paciente: string;
  fecha: string;
  /** Cuerpo del certificado, tal cual lo redacta el médico. */
  cuerpo: string;
}

export const CertificadoMedicoTemplate = ({
  data,
  profile,
  documentRef,
}: {
  data: CertificadoMedicoData;
  profile: UserProfile | null;
  documentRef?: React.RefObject<HTMLDivElement>;
}) => (
  <HojaDocumento documentRef={documentRef}>
    <MembreteClinica profile={profile} />

    <h1 className="text-2xl font-black text-high-contrast uppercase tracking-[0.15em] text-center pt-16 shrink-0">
      Certificado Médico
    </h1>

    {data.fecha && (
      <p className="text-xs font-bold text-high-contrast/60 text-right pt-6 shrink-0">
        La Vega, {data.fecha}
      </p>
    )}

    <div className="pt-10 px-2">
      <p className="text-base leading-[2] text-justify font-medium text-high-contrast whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
        {data.cuerpo}
      </p>
    </div>

    <div className="mt-auto pt-20 shrink-0">
      <FirmaMedico profile={profile} />
    </div>
  </HojaDocumento>
);
