import React from 'react';

// Plantilla FIJA de Receta Rx. El doctor no edita el layout — solo
// llega el objeto de datos validado (RecetaRxData) desde la IA.

export interface RecetaRxData {
  nombrePaciente: string;
  fecha: string;
  /** Cuerpo de la receta en texto libre, tal cual lo escribió el doctor. */
  contenido: string;
}

interface Props {
  data: RecetaRxData;
  doctorName: string;        // "Dra. Isabel Beato"
  specialty: string;         // "Ginecóloga-Obstetra. Ginecología Estética..."
  doctorInitials?: string;   // "I.B."
  exequatur?: string;        // "12345-EX"
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

export const RecetaRxTemplate = ({
  data,
  doctorName,
  specialty,
  doctorInitials,
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
  return (
    <div
      ref={documentRef}
      className="bg-white rounded-[2rem] shadow-ambient border border-surface-container-high p-14 relative flex flex-col min-h-[1050px] w-full"
    >
      {/* Encabezado — logo personal + nombre + especialidad, centrado, estilo recetario físico */}
      <div className="flex flex-col items-center text-center gap-2 pb-6 shrink-0">
        <div className="flex items-center gap-4">
          {doctorLogoUrl ? (
            // El logo personal ya trae el nombre estilizado: no se duplica en texto.
            <img src={doctorLogoUrl} alt={doctorName} className="h-16 w-auto object-contain" />
          ) : (
            <h1 className="text-3xl font-black text-primary italic tracking-tight">{doctorName}</h1>
          )}
        </div>
        <p className="text-[11px] font-bold text-high-contrast/70 uppercase tracking-wide leading-relaxed max-w-lg">
          {specialty}
        </p>
      </div>

      {/* Marco Rx — doble borde, iniciales arriba, cuerpo de medicamentos dentro */}
      <div className="flex-1 flex flex-col border-2 border-high-contrast/70 p-2 mt-2 min-h-0">
        <div className="border border-high-contrast/50 flex-1 flex flex-col p-8 relative min-h-0">
          {/* Iniciales del doctor, centradas arriba del marco interno */}
          {doctorInitials && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-white px-4">
              <span className="text-xl font-black text-primary italic">{doctorInitials}</span>
            </div>
          )}
          {/* Símbolo Rx, esquina superior izquierda */}
          <span className="absolute top-2 left-4 text-4xl font-black text-primary italic">
            R<sub className="text-2xl">x</sub>
          </span>

          {/* Paciente y fecha */}
          <div className="flex justify-between items-baseline text-sm font-bold text-high-contrast/80 mt-14 mb-10 px-2">
            <span>Paciente: {data.nombrePaciente}</span>
            <span>Fecha: {data.fecha}</span>
          </div>

          {/* Cuerpo — texto libre del doctor, con los saltos de línea intactos */}
          <div className="px-2">
            <p className="text-base leading-relaxed font-medium text-high-contrast whitespace-pre-wrap">
              {data.contenido}
            </p>
          </div>

          {/* Nombre / Fecha / Firma — pie fijo dentro del marco */}
          <div className="mt-auto pt-12 space-y-4 shrink-0 px-2">
            <p className="text-sm font-bold text-high-contrast/60 border-b border-high-contrast/30 pb-1">
              Nombre: {data.nombrePaciente}
            </p>
            <div className="flex gap-10">
              <p className="text-sm font-bold text-high-contrast/60 border-b border-high-contrast/30 pb-1 flex-1">
                Fecha: {data.fecha}
              </p>
              <p className="text-sm font-bold text-high-contrast/60 border-b border-high-contrast/30 pb-1 flex-1">
                Firma:
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pie institucional — logo clínica izq, contacto der */}
      <div className="flex justify-between items-end pt-6 shrink-0">
        <div className="flex items-center gap-3">
          {clinicLogoUrl && <img src={clinicLogoUrl} alt="" className="h-10 w-auto object-contain" />}
          <div className="text-[10px] font-bold text-high-contrast/60 leading-tight">
            <p>{clinicName}</p>
            <p>{clinicTagline}</p>
            <p>{clinicAddress}</p>
          </div>
        </div>
        <div className="text-[10px] font-bold text-high-contrast/60 leading-tight text-right">
          {exequatur && <p>Exequátur: {exequatur}</p>}
          {clinicSuite && <p>{clinicSuite}</p>}
          {phoneOffice && <p>Tel.: {phoneOffice}{phoneExt ? ` Ext: ${phoneExt}` : ''}</p>}
          {phoneCell && <p>Cel.: {phoneCell}</p>}
        </div>
      </div>
    </div>
  );
};
