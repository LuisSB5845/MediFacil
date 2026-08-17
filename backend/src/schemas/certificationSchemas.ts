import { z } from 'zod';

export const NarrativeCertificationSchema = z.object({
  patientName: z.string().describe('Nombre completo del paciente'),
  patientId: z.string().optional().describe('Cédula o documento de identidad del paciente si se menciona'),
  diagnosis: z.string().describe('Diagnóstico clínico detallado o motivo de consulta'),
  restDays: z.string().optional().describe('Días de reposo médico indicados si aplican'),
  recommendations: z.string().optional().describe('Recomendaciones médicas o tratamiento prescrito'),
  issuerDoctor: z.string().describe('Nombre del médico emisor'),
  date: z.string().describe('Fecha de emisión del certificado'),
});

export const BirthCertificationSchema = z.object({
  nombreMadre: z.string().describe('Nombre completo de la madre'),
  cedulaMadre: z.string().nullable().describe('Número de cédula/documento de identidad de la madre o null si no se especifica'),
  sexoProducto: z.enum(['Masculino', 'Femenino']).describe('Sexo del recién nacido'),
  peso: z.string().describe('Peso del recién nacido (ejemplo: 7 lbs 4 oz o 3.2 kg)'),
  hora: z.string().describe('Hora exacta del nacimiento (ejemplo: 08:45 AM)'),
  dia: z.string().describe('Día del nacimiento (ejemplo: 15)'),
  mes: z.string().describe('Nombre del mes del nacimiento (ejemplo: Julio)'),
  anio: z.string().describe('Año del nacimiento (ejemplo: 2026)'),
  medicoTratante: z.string().describe('Nombre completo del médico tratante u obstetra'),
  fechaExpedicion: z.string().describe('Fecha de expedición del documento en formato legible'),
});

/**
 * Receta Rx: el cuerpo es texto libre tal cual lo escribe el doctor.
 * La IA solo reescribe/corrige ese texto, no lo descompone en campos.
 */
export const RecetaRxSchema = z.object({
  nombrePaciente: z.string(),
  fecha: z.string(),
  contenido: z.string().min(1, 'La receta no puede estar vacía.'),
});

/**
 * Registro central de tipos de documento estructurado.
 * Cada entrada asocia el esquema Zod con su system prompt; agregar un tipo
 * nuevo es añadir una entrada aquí, sin tocar el controlador.
 */
export const CERT_REGISTRY = {
  narrative: {
    schema: NarrativeCertificationSchema,
    systemPrompt: `Eres un asistente médico experto en la emisión de certificados médicos narrativos. Extrae e infiere la información requerida cumpliendo con el esquema.`,
  },
  birth: {
    schema: BirthCertificationSchema,
    systemPrompt: `Eres un asistente médico experto en extracción y formalización de certificaciones y constancias de nacimiento. Extrae e infiere los datos requeridos cumpliendo estrictamente con los campos descritos en el esquema.`,
  },
  receta: {
    schema: RecetaRxSchema,
    systemPrompt: `Eres el redactor y corrector de recetas médicas (Rx) de un doctor. Recibes el dictado tal cual lo escribió y devuelves ESE MISMO contenido en el campo 'contenido', solo que mejor redactado: ortografía y acentuación corregidas, abreviaturas médicas normalizadas y, si el dictado enumera varios medicamentos, presentado como lista numerada (ej. "1. Amoxicilina 500mg cada 8 horas por 7 días").

REGLAS ESTRICTAS:
1. NO eres un extractor ni un asistente clínico: no inventes, agregues, sugieras ni completes medicamentos, dosis, frecuencias, duraciones ni indicaciones que el doctor no haya mencionado.
2. Si algo está ambiguo, truncado o incompleto, déjalo EXACTAMENTE como el doctor lo escribió. Nunca lo completes por tu cuenta ni lo marques como faltante.
3. NINGUNA palabra del dictado puede perderse. Todo fragmento de texto debe aparecer en 'contenido'.
4. Respeta la separación en líneas del dictado: cada medicamento o instrucción en su propia línea.
5. 'nombrePaciente' y 'fecha' se toman del contexto si están disponibles; si no, déjalos como cadena vacía. Nunca los inventes.`,
  },
} as const;

export type CertificationType = keyof typeof CERT_REGISTRY;

export const CERTIFICATION_TYPES = Object.keys(CERT_REGISTRY) as [CertificationType, ...CertificationType[]];

export const AISchema = z.object({
  body: z.object({
    prompt: z.string().min(1).max(5000),
    context: z.string().optional(),
    certificationType: z.enum(CERTIFICATION_TYPES).optional().default('narrative'),
  }),
});
