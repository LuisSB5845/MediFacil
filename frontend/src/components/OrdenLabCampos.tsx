import React from 'react';
import { ORDEN_LAB_COLUMNAS } from '../lib/ordenLabCatalog';

/**
 * El catalogo de estudios de la orden de laboratorio.
 *
 * Vive en su propio componente porque lo usan dos pantallas (el generador de
 * documentos y la receta rapida). Duplicarlo significaria que agregar un
 * estudio al catalogo obligue a tocar dos archivos, y que olvidarse de uno
 * haga que la app emita ordenes distintas segun por donde se entre.
 */
export const OrdenLabCampos = ({
  seleccionados,
  onToggle,
  onLimpiar,
  otrosRadiografias,
  onOtrosRadiografias,
  otrosEstudios,
  onOtrosEstudios,
  otros,
  onOtros,
}: {
  seleccionados: string[];
  onToggle: (item: string) => void;
  onLimpiar: () => void;
  otrosRadiografias: string;
  onOtrosRadiografias: (v: string) => void;
  otrosEstudios: string;
  onOtrosEstudios: (v: string) => void;
  otros: string;
  onOtros: (v: string) => void;
}) => (
  <section className="space-y-5">
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <label className="label-atelier text-high-contrast/40 uppercase tracking-widest text-[10px]">
        Estudios solicitados
      </label>
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-bold text-primary">
          {seleccionados.length} marcado{seleccionados.length === 1 ? '' : 's'}
        </span>
        {seleccionados.length > 0 && (
          <button
            type="button"
            onClick={onLimpiar}
            className="text-[11px] font-bold text-high-contrast/40 hover:text-red-600 transition-colors"
          >
            Limpiar
          </button>
        )}
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {ORDEN_LAB_COLUMNAS.map((columna, ci) => (
        <div key={ci} className="space-y-5">
          {columna.map(grupo => (
            <div key={grupo.titulo} className="space-y-2">
              <p className="text-[10px] font-black text-primary uppercase tracking-widest">
                {grupo.titulo}
              </p>
              <div className="space-y-1">
                {grupo.items.map(item => (
                  <label key={item} className="flex items-start gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={seleccionados.includes(item)}
                      onChange={() => onToggle(item)}
                      className="mt-0.5 w-3.5 h-3.5 shrink-0 accent-[#191970] cursor-pointer"
                    />
                    <span className="text-xs text-high-contrast/70 leading-tight group-hover:text-high-contrast">
                      {item}
                    </span>
                  </label>
                ))}
              </div>
              {grupo.otrosKey && (
                <input
                  className="input-field w-full !rounded-xl py-2 px-3 text-xs"
                  type="text"
                  placeholder="Otros..."
                  value={grupo.otrosKey === 'otrosRadiografias' ? otrosRadiografias : otrosEstudios}
                  onChange={(e) =>
                    grupo.otrosKey === 'otrosRadiografias'
                      ? onOtrosRadiografias(e.target.value)
                      : onOtrosEstudios(e.target.value)
                  }
                />
              )}
            </div>
          ))}
        </div>
      ))}
    </div>

    <div className="space-y-2">
      <label className="label-atelier text-high-contrast/40 uppercase tracking-widest text-[10px]">
        Otros (renglón libre al pie)
      </label>
      <textarea
        className="input-field w-full resize-none !rounded-2xl px-5 py-4 leading-relaxed"
        rows={2}
        placeholder="Cualquier estudio que no esté en la lista..."
        value={otros}
        onChange={(e) => onOtros(e.target.value)}
      />
    </div>
  </section>
);
