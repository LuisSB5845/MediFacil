import React from 'react';
import { CertificationType, RecetaRxData } from '../../types';
import { MarcaDeAgua } from './MarcaDeAgua';
import { medicamentosUtiles, romano } from '../../lib/recetaMedicamentos';

// Plantilla FIJA de Receta Rx, calcada del recetario impreso de la doctora:
// arriba el centro medico (izquierda) y el nombre del medico (derecha); debajo
// la fila de paciente y el cuadro de la receta, que llega hasta el pie; y en el
// pie, los datos de contacto y de colegiatura.

/** Rosa del recetario impreso. */
const ROSA = '#B03A73';

interface Props {
  data: RecetaRxData;
  doctorName: string;        // "Isabel Beato Gil"
  specialty: string;         // "Ginecóloga Obstetra • Ginecología Estética • Colposcopia"
  /** Determina el tratamiento: 'female' → "Dra.", 'male' → "Dr.". */
  gender?: 'male' | 'female';
  /** Simbolo sin texto que acompana al nombre. Sin el, va solo el nombre. */
  doctorSymbolUrl?: string;
  /** Cedula del medico, impresa en el pie. */
  cedula?: string;
  exequatur?: string;
  clinicLogoUrl?: string;
  clinicName?: string;
  clinicTagline?: string;
  clinicAddress?: string;
  clinicSuite?: string;
  phoneOffice?: string;
  phoneExt?: string;
  phoneCell?: string;
  /** Marca de agua: imagen y tipos en los que debe aparecer. */
  watermarkUrl?: string;
  watermarkEn?: CertificationType[];
  documentRef?: React.RefObject<HTMLDivElement>;
  // Del diseno anterior; se siguen aceptando para no romper a quien los pase.
  doctorInitials?: string;
  doctorLogoUrl?: string;
}

/**
 * "Isabel Beato Gil" → { nombre: "Isabel", apellidos: "Beato Gil" }.
 * Se descarta un "Dr."/"Dra." que ya venga escrito, para no duplicarlo.
 */
function partirNombre(completo: string): { nombre: string; apellidos: string } {
  const partes = completo.trim().split(/\s+/).filter(p => !/^dra?\.?$/i.test(p));
  if (partes.length <= 1) return { nombre: '', apellidos: partes[0] || '' };
  return { nombre: partes[0], apellidos: partes.slice(1).join(' ') };
}

/** El perfil puede guardar "Ext. 5511" o solo "5511". */
const formatoExtension = (ext?: string) =>
  !ext?.trim() ? '' : /^ext/i.test(ext.trim()) ? ext.trim() : `Ext. ${ext.trim()}`;

export const RecetaRxTemplate = ({
  data,
  doctorName,
  specialty,
  gender,
  doctorSymbolUrl,
  cedula,
  exequatur,
  clinicLogoUrl,
  clinicName = 'Centro Médico V Centenario',
  clinicTagline = 'Salud al Alcance de Todos',
  clinicAddress,
  clinicSuite,
  phoneOffice,
  phoneExt,
  phoneCell,
  documentRef,
  watermarkUrl,
  watermarkEn,
}: Props) => {
  // Receta estructurada: solo los renglones con nombre. Sin ellos se imprime
  // el texto libre, que es como nacieron las recetas anteriores.
  const medicamentos = medicamentosUtiles(data.medicamentos || []);
  // De cinco en adelante hay que apretar para no desbordar la pagina.
  const denso = medicamentos.length >= 5;

  const { nombre, apellidos } = partirNombre(doctorName);
  const tratamiento = gender === 'female' ? 'Dra.' : gender === 'male' ? 'Dr.' : '';
  const lineaNombre = [tratamiento, nombre].filter(Boolean).join(' ');

  const direccion = [clinicAddress, clinicSuite].filter(Boolean).join(' · ');
  const contacto = [
    phoneOffice && `Tel.: ${phoneOffice}${phoneExt ? ` · ${formatoExtension(phoneExt)}` : ''}`,
    phoneCell && `Cel.: ${phoneCell}`,
    cedula && `Cédula: ${cedula}`,
    exequatur && `Exequátur: ${exequatur}`,
  ].filter(Boolean).join('  |  ');

  // Proporción real de una hoja carta (8.5x11" a 96dpi = 816x1056px), para que
  // lo que se ve en pantalla sea lo que sale en papel, sin reescalados.
  return (
    <div
      ref={documentRef}
      className="receta-hoja bg-white rounded-[2rem] shadow-ambient border border-surface-container-high px-14 py-12 relative isolate flex flex-col min-h-[1056px] max-h-[1056px] overflow-hidden w-full max-w-[816px] mx-auto"
    >
      <MarcaDeAgua watermarkUrl={watermarkUrl} watermarkEn={watermarkEn} tipo="receta" />

      {/* Encabezado — centro medico a la izquierda, medico a la derecha.
          Va en <div> y no en <header>: la hoja de impresion oculta todo
          <header> para quitar la barra de la app, y se llevaba este con ella. */}
      <div className="relative flex justify-between items-start gap-6 shrink-0">
        <div className="flex items-center gap-3 max-w-[48%]">
          {clinicLogoUrl && <img src={clinicLogoUrl} alt="" className="w-[72px] h-auto object-contain shrink-0" />}
          <div className="leading-snug">
            <p className="text-[17px] font-bold text-high-contrast">{clinicName}</p>
            <p className="text-[14px] italic text-high-contrast/70">{clinicTagline}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right font-serif" style={{ color: ROSA }}>
            {lineaNombre && <p className="text-[19px] italic leading-none">{lineaNombre}</p>}
            <p className="text-[40px] font-bold uppercase tracking-wide leading-none mt-1">{apellidos}</p>
            {specialty && (
              <p className="text-[13px] font-sans text-high-contrast/70 mt-2">{specialty}</p>
            )}
          </div>
          {doctorSymbolUrl && (
            <img src={doctorSymbolUrl} alt="" className="w-[92px] h-[92px] object-contain shrink-0" />
          )}
        </div>
      </div>

      <div className="relative h-[2px] mt-5 mb-4 shrink-0" style={{ background: ROSA }} />

      {/* Fila del paciente */}
      <div
        className="relative grid grid-cols-[1fr_auto_auto] text-[13px] text-high-contrast shrink-0 border-[1.5px]"
        style={{ borderColor: ROSA }}
      >
        <p className="px-3 py-2"><b>NOMBRE:</b> {data.nombrePaciente}</p>
        <p className="px-3 py-2 border-l-[1.5px] min-w-[120px]" style={{ borderColor: ROSA }}>
          <b>EDAD:</b> {data.edad || ''}
        </p>
        <p className="px-3 py-2 border-l-[1.5px] min-w-[150px]" style={{ borderColor: ROSA }}>
          <b>FECHA:</b> {data.fecha}
        </p>
      </div>

      <p className="relative font-serif font-bold underline text-[17px] mt-5 mb-2 shrink-0" style={{ color: ROSA }}>
        RECETA MÉDICA:
      </p>

      {/* Cuerpo — llega hasta el pie de la hoja */}
      <div className="relative flex-1 min-h-0 flex flex-col border-[1.5px] px-10 py-8" style={{ borderColor: ROSA }}>
        {medicamentos.length > 0 ? (
          <ol className={denso ? 'space-y-3' : 'space-y-6'}>
            {medicamentos.map((med, i) => (
              <li key={i} className="break-words [overflow-wrap:anywhere]">
                {/* Numeral centrado con la cantidad al margen derecho, y el
                    medicamento centrado debajo. La cantidad va absoluta para
                    no desplazar el centro del numeral. */}
                <div className="relative">
                  <p className={`text-center font-black text-high-contrast ${denso ? 'text-sm' : 'text-base'}`}>
                    {romano(i)}
                  </p>
                  {med.cantidad.trim() && (
                    <span className={`absolute right-0 top-0 max-w-[40%] text-right font-bold text-high-contrast/80 ${denso ? 'text-xs' : 'text-sm'}`}>
                      {med.cantidad.trim()}
                    </span>
                  )}
                </div>
                <p className={`text-center font-medium text-high-contrast ${denso ? 'text-sm leading-snug' : 'text-base leading-relaxed'}`}>
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

        {/* Firma, abajo a la derecha dentro del cuadro */}
        <div className="mt-auto pt-8 self-end w-[250px] text-center shrink-0">
          <div className="border-t border-high-contrast/60" />
          <p className="text-[12px] text-high-contrast/60 mt-1">Firma</p>
        </div>
      </div>

      {/* Pie — contacto y colegiatura */}
      {(direccion || contacto) && (
        <footer
          className="relative mt-4 pt-2 border-t text-center text-[11.5px] leading-relaxed text-high-contrast/70 shrink-0"
          style={{ borderColor: ROSA }}
        >
          {direccion && <p>{direccion}</p>}
          {contacto && <p className="whitespace-pre">{contacto}</p>}
        </footer>
      )}
    </div>
  );
};
