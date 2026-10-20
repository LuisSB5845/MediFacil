import React from 'react';
import { CertificationType, UserProfile } from '../../types';

/**
 * Marca de agua impresa detras del texto del documento.
 *
 * Reproduce como la coloca Word en la plantilla de la doctora
 * (`WordPictureWatermark`): centrada respecto al margen, 196.8 x 289 pt, con
 * z-index negativo para quedar debajo del texto, y "decolorada" mediante
 * gain=0.30 / blacklevel=+0.35. Esos dos ultimos no son transparencia sino un
 * lavado —menos contraste, mas brillo—, que aqui se replica con filtros CSS.
 */

/** 196.8pt x 289pt a 96dpi, la proporcion exacta del documento original. */
const ANCHO_PX = 262;
const ALTO_PX = 385;

export const MarcaDeAgua = ({
  profile,
  watermarkUrl,
  watermarkEn,
  tipo,
}: {
  /** Las plantillas que reciben el perfil completo. */
  profile?: UserProfile | null;
  /** Las que reciben los campos sueltos (receta, orden de laboratorio). */
  watermarkUrl?: string;
  watermarkEn?: CertificationType[];
  /** Tipo del documento que se esta imprimiendo. */
  tipo: CertificationType;
}) => {
  const url = watermarkUrl ?? profile?.watermarkUrl;
  const activos = watermarkEn ?? profile?.watermarkEn;
  // Sin imagen, o con este tipo sin marcar, el documento sale limpio.
  if (!url || !activos?.includes(tipo)) return null;

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden"
    >
      <img
        src={url}
        alt=""
        style={{
          width: `${ANCHO_PX}px`,
          height: `${ALTO_PX}px`,
          objectFit: 'contain',
          // El "decolorar" de Word: contraste al 30% y brillo subido.
          filter: 'brightness(1.35) contrast(0.30)',
          opacity: 0.55,
        }}
      />
    </div>
  );
};
