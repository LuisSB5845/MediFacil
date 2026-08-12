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

export const AISchema = z.object({
  body: z.object({
    prompt: z.string().min(1).max(5000),
    context: z.string().optional(),
    certificationType: z.enum(['narrative', 'birth']).optional().default('narrative'),
  }),
});
