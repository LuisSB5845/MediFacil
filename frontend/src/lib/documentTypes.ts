import { ClinicalDocument, CertificationType } from '../types';

/**
 * El tipo de un documento clinico, en un solo lugar.
 *
 * Historicamente el tipo se guardaba de tres formas segun quien creara el
 * documento: `certificationType` (receta rapida e IA), `templateType` (las
 * plantillas, que guardaban la ETIQUETA visible) y `type`. Comparar contra la
 * etiqueta es fragil: cambiar "Certificado Medico" por "Certificado" en la
 * interfaz habria partido el filtro y mandado los documentos viejos a otro
 * grupo. Aqui se normaliza todo a `CertificationType`.
 */

/** Etiquetas visibles. Cambiarlas ya no afecta a los filtros. */
export const ETIQUETA_TIPO: Record<CertificationType, string> = {
  receta: 'Receta Rx',
  orden_lab: 'Orden de Laboratorio',
  certificado: 'Certificado Médico',
  narrative: 'Certificado Médico',
  birth: 'Constancia de Nacimiento',
  presupuesto: 'Presupuesto Médico',
};

/**
 * Los tipos que se ofrecen como filtro. 'narrative' y 'certificado' son el
 * mismo documento para el usuario (uno nacio por plantilla y el otro por IA),
 * asi que solo se lista uno.
 */
export const TIPOS_FILTRABLES: CertificationType[] = [
  'receta',
  'orden_lab',
  'certificado',
  'birth',
  'presupuesto',
];

/** Documentos viejos: su tipo solo vive en la etiqueta que se guardo. */
const POR_ETIQUETA: Record<string, CertificationType> = {
  'Constancia de Nacimiento': 'birth',
  'Presupuesto Médico': 'presupuesto',
  'Certificado Médico': 'certificado',
};

/**
 * Tipo normalizado de un documento. Devuelve null solo si no hay forma de
 * saberlo (documentos de IA libre anteriores a que se guardara el tipo).
 */
export function tipoDocumento(doc: ClinicalDocument): CertificationType | null {
  if (doc.certificationType) {
    // 'narrative' y 'certificado' son el mismo documento; se unifican.
    return doc.certificationType === 'narrative' ? 'certificado' : doc.certificationType;
  }
  if (doc.templateType && POR_ETIQUETA[doc.templateType]) {
    return POR_ETIQUETA[doc.templateType];
  }
  return null;
}

/** Etiqueta visible de un documento, con salida para los que no declaran tipo. */
export function etiquetaDocumento(doc: ClinicalDocument): string {
  const tipo = tipoDocumento(doc);
  if (tipo) return ETIQUETA_TIPO[tipo];
  return doc.templateType || (doc.type === 'ai' ? 'Asistente IA' : 'Documento');
}
