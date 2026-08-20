import React from 'react';
import { ORDEN_LAB_COLUMNAS } from '../../lib/ordenLabCatalog';

// Plantilla FIJA de orden de laboratorio y estudios. Replica el formulario
// impreso: salen las ~90 casillas, marcadas las que el médico seleccionó.

export interface OrdenLabData {
  nombrePaciente: string;
  fecha: string;
  /** Etiquetas de los estudios marcados (ver ordenLabCatalog). */
  seleccionados: string[];
  otrosRadiografias?: string;
  otrosEstudios?: string;
  otros?: string;
}

interface Props {
  data: OrdenLabData;
  doctorName: string;
  specialty: string;
  exequatur?: string;
  doctorLogoUrl?: string;
  clinicLogoUrl?: string;
  clinicName?: string;
  clinicTagline?: string;
  clinicAddress?: string;
  clinicSuite?: string;
  phoneOffice?: string;
  phoneExt?: string;
  phoneCell?: string;
  documentRef?: React.RefObject<HTMLDivElement>;
}

/** Casilla cuadrada, marcada con ✓ cuando el estudio está pedido. */
const Casilla = ({ marcado }: { marcado: boolean }) => (
  <span className="mt-[2px] w-[11px] h-[11px] shrink-0 border border-high-contrast/70 flex items-center justify-center leading-none">
    {marcado && <span className="text-[9px] font-black text-high-contrast">✓</span>}
  </span>
);

/** Renglón "Otros: ______" con el texto escrito, si lo hay. */
const RenglonOtros = ({ valor, ancho = 'w-full' }: { valor?: string; ancho?: string }) => (
  <div className={`flex items-end gap-1 pt-1 ${ancho}`}>
    <span className="text-[9px] font-bold text-high-contrast/70 shrink-0">Otros:</span>
    <span className="flex-1 border-b border-high-contrast/50 text-[9px] font-medium text-high-contrast leading-tight min-h-[12px]">
      {valor}
    </span>
  </div>
);

export const OrdenLabTemplate = ({
  data,
  doctorName,
  specialty,
  exequatur,
  doctorLogoUrl,
  clinicLogoUrl,
  clinicName = 'Centro Médico V Centenario, S.A.',
  clinicTagline = 'Salud al Alcance de Todos',
  clinicAddress = 'C/ Duarte No. 21, La Vega, R.D.',
  clinicSuite,
  phoneOffice,
  phoneExt,
  phoneCell,
  documentRef,
}: Props) => {
  const marcados = new Set(data.seleccionados);

  // Misma geometría de hoja carta que la receta Rx (816x1056px a 96dpi).
  return (
    <div
      ref={documentRef}
      className="receta-hoja bg-white rounded-[2rem] shadow-ambient border border-surface-container-high p-10 relative flex flex-col min-h-[1056px] w-full max-w-[816px] mx-auto"
    >
      {/* Encabezado — logo o nombre, y especialidades debajo */}
      <div className="flex flex-col items-center text-center gap-1 shrink-0">
        {doctorLogoUrl ? (
          <img
            src={doctorLogoUrl}
            alt={doctorName}
            className="w-auto h-auto max-w-[85%] max-h-[120px] object-contain"
          />
        ) : (
          <h1 className="text-3xl font-black text-[#B4524C] italic tracking-tight">{doctorName}</h1>
        )}
        <p className="text-[10px] font-bold text-high-contrast/70 uppercase tracking-wide leading-snug max-w-lg whitespace-pre-line break-words [overflow-wrap:anywhere]">
          {specialty}
        </p>
      </div>

      {/* Fecha y paciente, como en el formulario impreso */}
      <div className="shrink-0 pt-4 space-y-2">
        <div className="flex justify-end">
          <div className="flex items-end gap-2 w-1/2">
            <span className="text-[11px] font-bold text-high-contrast/80 shrink-0">Fecha:</span>
            <span className="flex-1 border-b border-high-contrast/60 text-[11px] font-medium text-high-contrast leading-tight">
              {data.fecha}
            </span>
          </div>
        </div>
        <div className="flex items-end gap-2">
          <span className="text-[11px] font-bold text-high-contrast/80 shrink-0">Paciente:</span>
          <span className="flex-1 border-b border-high-contrast/60 text-[11px] font-medium text-high-contrast leading-tight">
            {data.nombrePaciente}
          </span>
        </div>
      </div>

      {/* Cuerpo — tres columnas de grupos, igual que el papel */}
      <div className="flex-1 grid grid-cols-3 gap-x-4 pt-4 min-h-0">
        {ORDEN_LAB_COLUMNAS.map((columna, ci) => (
          <div key={ci} className="space-y-3">
            {columna.map(grupo => (
              <div key={grupo.titulo} className="space-y-1">
                <div className="inline-block bg-[#E8A9A2] rounded-full px-3 py-[3px]">
                  <span className="text-[9px] font-black text-high-contrast uppercase tracking-wide">
                    {grupo.titulo}
                  </span>
                </div>
                <div className="space-y-[3px] pt-[2px]">
                  {grupo.items.map(item => (
                    <div key={item} className="flex items-start gap-1.5">
                      <Casilla marcado={marcados.has(item)} />
                      <span className="text-[9px] font-medium text-high-contrast leading-tight">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
                {grupo.otrosKey && <RenglonOtros valor={data[grupo.otrosKey]} />}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Otros — renglón libre a todo el ancho */}
      <div className="shrink-0 pt-3 border-t border-[#B4524C]/60 mt-2">
        <div className="flex items-end gap-2">
          <span className="text-[11px] font-bold text-high-contrast/80 shrink-0">Otros:</span>
          <span className="flex-1 border-b border-high-contrast/60 text-[10px] font-medium text-high-contrast leading-tight min-h-[14px] whitespace-pre-line break-words [overflow-wrap:anywhere]">
            {data.otros}
          </span>
        </div>
      </div>

      {/* Pie institucional */}
      <div className="flex items-end gap-3 pt-4 shrink-0">
        {clinicLogoUrl && <img src={clinicLogoUrl} alt="" className="h-10 w-auto object-contain" />}
        <div className="text-[9px] font-bold text-high-contrast/60 leading-tight">
          <p>{clinicName}</p>
          <p>{clinicTagline}</p>
          <p>{clinicAddress}</p>
          {clinicSuite && <p>{clinicSuite}</p>}
          {(phoneOffice || phoneCell) && (
            <p>
              {phoneOffice && <>Tel.: {phoneOffice}{phoneExt ? ` Ext: ${phoneExt}` : ''}</>}
              {phoneOffice && phoneCell && '   '}
              {phoneCell && <>Cel.: {phoneCell}</>}
            </p>
          )}
          {exequatur && <p>Exequátur: {exequatur}</p>}
        </div>
      </div>
    </div>
  );
};
