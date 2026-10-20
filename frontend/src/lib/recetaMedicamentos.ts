import { Medicamento } from '../types';

/**
 * Receta escrita medicamento por medicamento.
 *
 * Vive aparte porque lo usan los dos puntos de escritura —el generador y el
 * editor del historial—, y porque la conversion entre texto libre y lista es
 * la pieza que no conviene duplicar: si las dos pantallas partieran el texto
 * de formas distintas, la misma receta se veria diferente segun por donde se
 * editara.
 */

/**
 * Tope de medicamentos por receta. La hoja es una sola pagina y el cuerpo
 * tiene unos 220-260px utiles; siete ya obligan a reducir la letra. La doctora
 * no pasa de cuatro, asi que siete deja margen de sobra.
 */
export const LIMITE_MEDICAMENTOS = 7;

/** Numeracion de la receta impresa. Solo hacen falta hasta el tope. */
export const ROMANOS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'] as const;

/** El romano de una posicion; cae al numero si algun dia sube el tope. */
export const romano = (indice: number): string =>
  ROMANOS[indice] ?? String(indice + 1);

export const medicamentoVacio = (): Medicamento => ({ nombre: '', cantidad: '' });

/** Descarta los renglones que el doctor dejo en blanco. */
export const medicamentosUtiles = (meds: Medicamento[]): Medicamento[] =>
  meds.filter(m => m.nombre.trim() !== '');

/**
 * Texto libre equivalente a la lista. Es lo que se guarda en `contenido`, de
 * modo que el listado, el buscador y el visor sigan funcionando sin saber nada
 * del modo estructurado.
 */
export function aTextoLibre(meds: Medicamento[]): string {
  return medicamentosUtiles(meds)
    .map((m, i) => {
      const cantidad = m.cantidad.trim();
      return `${romano(i)}. ${m.nombre.trim()}${cantidad ? ` — ${cantidad}` : ''}`;
    })
    .join('\n');
}

/** Numeracion o vinetas al inicio de un renglon: "1.", "I.", "-", "•". */
const PREFIJO = /^\s*(?:[ivxIVX]+[.)]|\d+[.)]|[-–—*•])\s*/;

/** Separador entre el nombre y la cantidad: " - ", " — " o ":". */
const SEPARADOR = /\s+[—–-]\s+|\s*:\s*/;

/**
 * Convierte texto libre en medicamentos, para cuando el doctor pasa una receta
 * ya escrita al modo estructurado.
 *
 * Parte por renglones y separa nombre y cantidad por el primer separador que
 * encuentre. Lo que no se pueda separar queda entero en el nombre: es
 * preferible que el doctor corrija a que se pierda texto de una receta.
 */
export function desdeTextoLibre(texto: string): Medicamento[] {
  const lineas = texto
    .split('\n')
    .map(l => l.replace(PREFIJO, '').trim())
    .filter(Boolean);

  if (lineas.length === 0) return [medicamentoVacio()];

  // Lo que pase del tope se junta en el ultimo renglon en vez de perderse.
  const finales =
    lineas.length > LIMITE_MEDICAMENTOS
      ? [
          ...lineas.slice(0, LIMITE_MEDICAMENTOS - 1),
          lineas.slice(LIMITE_MEDICAMENTOS - 1).join(' / '),
        ]
      : lineas;

  return finales.map(linea => {
    const encontrado = linea.match(SEPARADOR);
    if (!encontrado || encontrado.index === undefined) {
      return { nombre: linea, cantidad: '' };
    }
    return {
      nombre: linea.slice(0, encontrado.index).trim(),
      cantidad: linea.slice(encontrado.index + encontrado[0].length).trim(),
    };
  });
}
