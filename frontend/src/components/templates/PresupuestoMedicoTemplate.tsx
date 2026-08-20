import React from 'react';
import { UserProfile } from '../../types';
import { MembreteClinica, FirmaMedico, HojaDocumento } from './MembreteClinica';

// Presupuesto médico, calcado de Presupuesto.docx: paciente y fecha, bloque de
// diagnóstico, procedimientos propuestos con su monto, y total.

export interface ProcedimientoPresupuesto {
  descripcion: string;
  /** Monto en pesos. 0 o vacío = sin costo indicado. */
  monto: number;
}

export interface PresupuestoMedicoData {
  cedulaPaciente: string;
  nombrePaciente: string;
  fecha: string;
  medicoTratante: string;
  diagnostico: string;
  procedimientos: ProcedimientoPresupuesto[];
}

export const formatearMonto = (monto: number): string =>
  `RD$ ${monto.toLocaleString('es-DO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export const totalPresupuesto = (procedimientos: ProcedimientoPresupuesto[]): number =>
  procedimientos.reduce((suma, p) => suma + (Number(p.monto) || 0), 0);

const Campo = ({ etiqueta, valor, className = 'flex-1' }: { etiqueta: string; valor: string; className?: string }) => (
  <div className={`flex items-end gap-2 ${className}`}>
    <span className="text-[13px] font-bold text-high-contrast shrink-0">{etiqueta}</span>
    <span className="flex-1 border-b border-high-contrast/60 text-[13px] font-medium text-high-contrast leading-tight min-h-[18px]">
      {valor}
    </span>
  </div>
);

export const PresupuestoMedicoTemplate = ({
  data,
  profile,
  documentRef,
}: {
  data: PresupuestoMedicoData;
  profile: UserProfile | null;
  documentRef?: React.RefObject<HTMLDivElement>;
}) => {
  const conMonto = data.procedimientos.filter(p => p.descripcion.trim());
  const total = totalPresupuesto(conMonto);

  return (
    <HojaDocumento documentRef={documentRef}>
      <MembreteClinica profile={profile} />

      <h1 className="text-2xl font-black text-high-contrast uppercase tracking-[0.15em] text-center pt-14 shrink-0">
        Presupuesto Médico
      </h1>

      <div className="pt-10 space-y-6">
        <Campo
          etiqueta="Paciente:"
          valor={[data.cedulaPaciente, data.nombrePaciente].filter(Boolean).join('  ')}
        />
        <div className="flex gap-8">
          <Campo etiqueta="Fecha:" valor={data.fecha} className="w-64" />
          <Campo etiqueta="Médico Tratante:" valor={data.medicoTratante} />
        </div>
      </div>

      <div className="pt-10 space-y-2">
        <p className="text-[13px] font-black text-high-contrast">Diagnóstico:</p>
        <p className="text-[13px] font-medium text-high-contrast leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] border-b border-high-contrast/40 pb-2 min-h-[24px]">
          {data.diagnostico}
        </p>
      </div>

      <div className="pt-8 space-y-3">
        <p className="text-[13px] font-black text-high-contrast">Procedimiento Propuesto:</p>
        <div className="space-y-2">
          {conMonto.map((proc, i) => (
            <div key={i} className="flex items-end gap-4 border-b border-high-contrast/30 pb-1">
              <span className="flex-1 text-[13px] font-medium text-high-contrast leading-relaxed">
                {proc.descripcion}
              </span>
              <span className="text-[13px] font-bold text-high-contrast whitespace-nowrap">
                {proc.monto > 0 ? formatearMonto(proc.monto) : ''}
              </span>
            </div>
          ))}
        </div>

        {total > 0 && (
          <div className="flex justify-end pt-4">
            <div className="flex items-end gap-6 border-t-2 border-high-contrast/70 pt-2">
              <span className="text-sm font-black text-high-contrast uppercase tracking-widest">Total</span>
              <span className="text-base font-black text-high-contrast">{formatearMonto(total)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-auto pt-20 shrink-0">
        <FirmaMedico profile={profile} etiqueta="Firma y Sello del Médico Autorizado" />
      </div>
    </HojaDocumento>
  );
};
