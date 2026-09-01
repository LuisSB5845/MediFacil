import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { X, FileDown, Printer, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { ClinicalDocument, UserProfile } from '../types';
import { RecetaRxTemplate } from './templates/RecetaRxTemplate';
import { OrdenLabTemplate } from './templates/OrdenLabTemplate';
import { CertificadoMedicoTemplate } from './templates/CertificadoMedicoTemplate';
import { ConstanciaNacimientoTemplate } from './templates/ConstanciaNacimientoTemplate';
import { PresupuestoMedicoTemplate } from './templates/PresupuestoMedicoTemplate';

/**
 * Visor de solo lectura de un documento ya guardado: elige la plantilla según
 * su tipo y permite reimprimirlo o exportarlo a PDF. No edita nada.
 */

/** Iniciales del doctor a partir del nombre: "Dra. Isabel Beato" -> "I.B." */
const buildInitials = (displayName?: string): string | undefined => {
  if (!displayName) return undefined;
  const parts = displayName
    .trim()
    .split(/\s+/)
    .filter(p => !/^(dr|dra|dr\.|dra\.)$/i.test(p));
  if (parts.length === 0) return undefined;
  return parts.slice(0, 2).map(p => `${p[0].toUpperCase()}.`).join('');
};

export const DocumentViewerModal = ({
  doc,
  profile,
  onClose,
}: {
  doc: ClinicalDocument;
  profile: UserProfile | null;
  onClose: () => void;
}) => {
  const documentRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const data: any = doc.structuredData;

  const handleExportPDF = async () => {
    if (!documentRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(documentRef.current, { scale: 2, useCORS: true });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${(doc.title || 'Documento').replace(/\s+/g, '_')}.pdf`);
    } finally {
      setIsExporting(false);
    }
  };

  const marca = {
    doctorName: profile?.displayName || 'Médico',
    specialty: profile?.specialty || '',
    exequatur: profile?.exequatur,
    doctorLogoUrl: profile?.doctorLogoUrl,
    clinicLogoUrl: profile?.clinicLogoUrl,
    clinicName: profile?.clinicName,
    clinicTagline: profile?.clinicTagline,
    clinicAddress: profile?.clinicAddress,
    clinicSuite: profile?.clinicSuite,
    phoneOffice: profile?.phoneOffice,
    phoneExt: profile?.phoneExt,
    phoneCell: profile?.phoneCell,
  };

  const renderDocumento = () => {
    if (!data) {
      // Documentos antiguos guardados solo como texto plano.
      return (
        <div className="receta-hoja bg-white rounded-[2rem] border border-surface-container-high p-14 min-h-[1056px] w-full max-w-[816px] mx-auto">
          <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-base leading-relaxed text-high-contrast">
            {doc.content}
          </p>
        </div>
      );
    }

    switch (doc.certificationType) {
      case 'receta':
        return (
          <RecetaRxTemplate
            data={data}
            documentRef={documentRef}
            doctorInitials={buildInitials(profile?.displayName)}
            {...marca}
          />
        );
      case 'orden_lab':
        return <OrdenLabTemplate data={data} documentRef={documentRef} {...marca} />;
      case 'birth':
        return <ConstanciaNacimientoTemplate data={data} profile={profile} documentRef={documentRef} />;
      case 'presupuesto':
        return <PresupuestoMedicoTemplate data={data} profile={profile} documentRef={documentRef} />;
      default:
        // 'certificado' y las plantillas guardadas desde Generar Documento.
        if (doc.templateType === 'Constancia de Nacimiento') {
          return <ConstanciaNacimientoTemplate data={data} profile={profile} documentRef={documentRef} />;
        }
        if (doc.templateType === 'Presupuesto Médico') {
          return <PresupuestoMedicoTemplate data={data} profile={profile} documentRef={documentRef} />;
        }
        return <CertificadoMedicoTemplate data={data} profile={profile} documentRef={documentRef} />;
    }
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#191970]/40 backdrop-blur-sm no-print"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative card-atelier w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden"
      >
        <div className="no-print p-6 flex justify-between items-center border-b border-surface-container-high shrink-0 gap-4">
          <div className="min-w-0">
            <h3 className="title-atelier text-primary truncate">{doc.title}</h3>
            <p className="text-xs text-high-contrast/50">{doc.subtitle}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleExportPDF}
              disabled={isExporting}
              className="h-11 px-5 bg-white border border-surface-container-high rounded-xl text-xs font-black flex items-center gap-2 hover:shadow-lg transition-all disabled:opacity-60"
            >
              {isExporting
                ? <Loader2 className="w-4 h-4 text-primary animate-spin" />
                : <FileDown className="w-4 h-4 text-primary" />}
              PDF
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="h-11 px-5 bg-primary text-white rounded-xl text-xs font-black flex items-center gap-2 hover:bg-primary-container transition-all"
            >
              <Printer className="w-4 h-4" /> IMPRIMIR
            </button>
            <button onClick={onClose} className="p-2 hover:bg-surface-high rounded-full transition-colors">
              <X className="w-6 h-6 text-high-contrast/40" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar bg-surface-low p-6 md:p-8">
          <div id="printable-document">{renderDocumento()}</div>
        </div>
      </motion.div>
    </div>
  );
};
