import React from 'react';
import { RecetaRxData } from '../../types';
import { medicamentosUtiles, romano } from '../../lib/recetaMedicamentos';

// Plantilla FIJA de Receta Rx. El doctor no edita el layout — solo
// llega el objeto de datos validado (RecetaRxData) desde la IA.

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
  // Receta estructurada: solo los renglones con nombre. Sin ellos se imprime
  // el texto libre, que es como nacieron las recetas anteriores.
  const medicamentos = medicamentosUtiles(data.medicamentos || []);
  // El cuerpo tiene unos 220-260px utiles y cada medicamento ocupa dos lineas:
  // de cinco en adelante hay que apretar para no desbordar la pagina.
  const denso = medicamentos.length >= 5;

  // Proporción real de una hoja carta (8.5x11" a 96dpi = 816x1056px), para que
  // lo que se ve en pantalla sea lo que sale en papel, sin reescalados.
  return (
    <div
      ref={documentRef}
      className="receta-hoja bg-white rounded-[2rem] shadow-ambient border border-surface-container-high p-14 relative flex flex-col min-h-[1056px] max-h-[1056px] overflow-hidden w-full max-w-[816px] mx-auto"
    >
      {/* Encabezado — logo personal + nombre + especialidad, centrado, estilo recetario físico */}
      <div className="flex flex-col items-center text-center gap-2 pb-6 shrink-0">
        <div className="w-full flex items-center justify-center">
          {doctorLogoUrl ? (
            // El logo personal ya trae el nombre estilizado: no se duplica en texto.
            // Ocupa casi todo el ancho útil, como en el recetario impreso.
            <img
              src={doctorLogoUrl}
              alt={doctorName}
              className="w-auto h-auto max-w-[85%] max-h-[150px] object-contain"
            />
          ) : (
            <h1 className="text-3xl font-black text-[#B4524C] italic tracking-tight">{doctorName}</h1>
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
              <span className="text-xl font-black text-[#B4524C] italic">{doctorInitials}</span>
            </div>
          )}
          {/* Símbolo Rx, esquina superior izquierda */}
          <span className="absolute top-2 left-4 text-4xl font-black text-[#B4524C] italic">
            R<sub className="text-2xl">x</sub>
          </span>

          {/* Paciente y fecha */}
          <div className="flex justify-between items-baseline text-sm font-bold text-high-contrast/80 mt-14 mb-10 px-2">
            <span>Paciente: {data.nombrePaciente}</span>
            <span>Fecha: {data.fecha}</span>
          </div>

          {/* Cuerpo — lista de medicamentos, o el texto libre tal cual lo escribio */}
          <div className="px-2">
            {medicamentos.length > 0 ? (
              <ol className={denso ? 'space-y-3' : 'space-y-6'}>
                {medicamentos.map((med, i) => (
                  <li key={i} className="break-words [overflow-wrap:anywhere]">
                    {/* Numeral y cantidad arriba; el medicamento debajo, como
                        en el recetario impreso. */}
                    <div className="flex items-baseline justify-between gap-6">
                      <span className={`font-black text-high-contrast ${denso ? 'text-sm' : 'text-base'}`}>
                        {romano(i)}
                      </span>
                      {med.cantidad.trim() && (
                        <span className={`font-bold text-high-contrast/80 text-right ${denso ? 'text-xs' : 'text-sm'}`}>
                          {med.cantidad.trim()}
                        </span>
                      )}
                    </div>
                    <p className={`font-medium text-high-contrast ${denso ? 'text-sm leading-snug' : 'text-base leading-relaxed'}`}>
                      {med.nombre.trim()}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-base leading-relaxed font-medium text-high-contrast whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                {data.contenido}
              </p>
            )}
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
