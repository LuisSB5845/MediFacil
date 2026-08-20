/**
 * Catálogo de estudios de la orden de laboratorio, transcrito del formulario
 * impreso de la consulta. El orden de columnas y grupos replica el papel:
 * lo que se imprime debe leerse igual que el talonario físico.
 *
 * El identificador de cada estudio ES su etiqueta: se guarda tal cual en
 * Firestore, así el documento sigue siendo legible sin este catálogo delante.
 */

export interface OrdenLabGrupo {
  titulo: string;
  items: string[];
  /** Renglón "Otros: ____" al pie del grupo, con su clave en los datos. */
  otrosKey?: 'otrosRadiografias' | 'otrosEstudios';
}

export const ORDEN_LAB_COLUMNAS: OrdenLabGrupo[][] = [
  // Columna 1
  [
    {
      titulo: 'Panel de Salud General',
      items: [
        'Hemograma',
        'Tipificación',
        'Ex. General Orina',
        'Glucosa',
        'Urea',
        'Creatinina',
        'Ácido Úrico',
        'Colesterol Total',
        'Triglicéridos',
        'HDL Colesterol',
        'LDL Colesterol',
        'Proteínas Totales',
        'Albúminas',
        'SGPT',
        'SGOT',
        'Bilirrubinas',
        'Curva de Tolerancia oral de la Glucosa',
        'LDH',
      ],
    },
    {
      titulo: 'Coprología',
      items: ['Coprológico', 'Coprológico (seriado x2)'],
    },
    {
      titulo: 'Microbiología',
      items: ['Urocultivo', 'Coprocultivo', 'Hemocultivo', 'Secreciones'],
    },
    {
      titulo: 'Hematología',
      items: [
        'Vitamina D',
        'Eritrosedimentación',
        'Electroforesis de Hemoglobina',
        'Falcemia',
        'Tiempo de Coagulación',
        'Tiempo de Sangría',
        'Tiempo de Protrombina',
        'TPT',
        'Dímero D',
        'Test de Coombs Indirecto',
      ],
    },
  ],

  // Columna 2
  [
    {
      titulo: 'Proteínas Especiales',
      items: [
        'ASO',
        'Electroforesis de Hemoglobina (proteínas)',
        'H. Glucosilada (HbA1c)',
        'IgA',
        'IgG',
        'IgM',
        'PCR',
      ],
    },
    {
      titulo: 'Marcadores Tumorales',
      items: ['CEA', 'CA-15.3', 'CA-19.9', 'CA-125', 'AFP', 'B-HCG'],
    },
    {
      titulo: 'Hormonas',
      items: [
        'HCG (Gestatest)',
        'Beta HCG Cuantitativa',
        'FSH',
        'LH',
        'Progesterona',
        'Prolactina',
        'T3',
        'T4',
        'T4 Libre',
        'TSH',
        'Testosterona',
        'Hormona Antimülleriana',
        'Androstenediona',
        'Insulina basal',
        'Cortisol',
        'Estradiol',
      ],
    },
    {
      titulo: 'Serología Infecciosa',
      items: [
        'Anti HIV 1/2',
        'HBs Ag',
        'Anti-HCV',
        'Toxo IgG',
        'Toxo IgM',
        'VDRL',
        'Chlamydia',
        'CMV IgG',
        'CMV IgM',
      ],
    },
  ],

  // Columna 3
  [
    {
      titulo: 'Radiografías',
      items: [
        'Rx de Tórax PA',
        'Rx de Abdomen simple de pie',
        'Rx de Columna Dorsolumbar AP y Lateral',
      ],
      otrosKey: 'otrosRadiografias',
    },
    {
      titulo: 'Sonografías',
      items: [
        'Sonografía Abdominal',
        'Sonografía Obstétrica',
        'Sonografía Pélvica Transvaginal',
        'Sonografía de Tiroides',
        'Sonografía Suprapúbica',
        'Sonografía de partes Blandas',
      ],
    },
    {
      titulo: 'Mamas',
      items: ['Sonomamografía', 'Mamografía'],
    },
    {
      titulo: 'Tamizaje',
      items: [
        'Tamizaje del Primer Trimestre',
        'Tamizaje del Segundo Trimestre',
        'Perfil Biofísico Fetal',
      ],
    },
    {
      titulo: 'Estudios Especiales',
      items: [
        'TAC de Tórax',
        'TAC de Abdomen',
        'TAC de Pelvis',
        'Histerosalpingografía',
        'Densitometría Ósea de Cadera',
        'Electrocardiograma',
        'Termosíntesis de Mama',
      ],
      otrosKey: 'otrosEstudios',
    },
  ],
];

/** Todos los estudios del catálogo, en una sola lista. */
export const ORDEN_LAB_ITEMS: string[] = ORDEN_LAB_COLUMNAS.flatMap(columna =>
  columna.flatMap(grupo => grupo.items)
);
