import React from 'react';
import { UserProfile } from '../../types';
import { MembreteClinica, HojaDocumento } from './MembreteClinica';

// Constancia de nacimiento, calcada de Certificacion_Musa.docx: cada renglón
// lleva su etiqueta fija en mayúsculas y el dato sobre una línea.

export interface ConstanciaNacimientoData {
  nombreMadre: string;
  cedulaMadre: string;
  sexoProducto: string;
  peso: string;
  hora: string;
  dia: string;
  mes: string;
  anio: string;
  medicoTratante: string;
  fechaExpedicion: string;
}

/** Etiqueta fija + dato subrayado, como en el formulario impreso. */
const Campo = ({
  etiqueta,
  valor,
  className = 'flex-1',
}: {
  etiqueta: string;
  valor: string;
  className?: string;
}) => (
  <div className={`flex items-end gap-2 ${className}`}>
    <span className="text-[13px] font-black text-high-contrast uppercase shrink-0">{etiqueta}</span>
    <span className="flex-1 border-b border-high-contrast/60 text-[13px] font-medium text-high-contrast leading-tight min-h-[18px]">
      {valor}
    </span>
  </div>
);

export const ConstanciaNacimientoTemplate = ({
  data,
  profile,
  documentRef,
}: {
  data: ConstanciaNacimientoData;
  profile: UserProfile | null;
  documentRef?: React.RefObject<HTMLDivElement>;
}) => (
  <HojaDocumento documentRef={documentRef}>
    <MembreteClinica profile={profile} />

    <h1 className="text-2xl font-black text-high-contrast uppercase tracking-[0.15em] text-center pt-16 shrink-0">
      Certificación
    </h1>

    <div className="pt-12 space-y-7">
      <Campo etiqueta="Certificamos que la Sra.:" valor={data.nombreMadre} />

      <div className="flex gap-8">
        <Campo etiqueta="Cédula:" valor={data.cedulaMadre} />
        <Campo etiqueta="Dio a luz un producto:" valor={data.sexoProducto} />
      </div>

      <div className="flex gap-8">
        <Campo etiqueta="Peso:" valor={data.peso} />
        <Campo etiqueta="Hora:" valor={data.hora} />
      </div>

      <div className="flex gap-8">
        <Campo etiqueta="Día:" valor={data.dia} className="w-32" />
        <Campo etiqueta="Mes:" valor={data.mes} />
        <Campo etiqueta="Del año:" valor={data.anio} className="w-48" />
      </div>

      <Campo etiqueta="Médico tratante:" valor={data.medicoTratante} />
      <Campo etiqueta="Fecha de expedición:" valor={data.fechaExpedicion} />
    </div>

    {/* Firma en blanco: se firma a mano sobre el papel */}
    <div className="mt-auto pt-24 space-y-10 shrink-0">
      <Campo etiqueta="Firma médica" valor="" />
      <p className="text-[11px] font-black text-high-contrast/70 uppercase tracking-widest">
        Para uso oficial solamente
      </p>
    </div>
  </HojaDocumento>
);
