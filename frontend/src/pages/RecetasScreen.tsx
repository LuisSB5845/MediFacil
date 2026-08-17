import React, { useEffect, useMemo, useRef, useState } from 'react';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { motion } from 'motion/react';
import {
  Pill, Search, ArrowLeft, FileDown, Printer, Loader2, FileText, Calendar,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { db } from '../lib/firebase';
import { ClinicalDocument, RecetaRxData, UserProfile } from '../types';
import { RecetaRxTemplate } from '../components/templates/RecetaRxTemplate';

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

const toDate = (createdAt: any): Date | null => {
  if (!createdAt) return null;
  if (typeof createdAt.toDate === 'function') return createdAt.toDate();
  const d = new Date(createdAt);
  return isNaN(d.getTime()) ? null : d;
};

const formatDate = (createdAt: any): string => {
  const d = toDate(createdAt);
  if (!d) return 'Sin fecha';
  return d.toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' });
};

/** Primeras líneas del cuerpo de la receta, para el preview de la tarjeta. */
const buildPreview = (data?: RecetaRxData, fallback?: string): string => {
  const raw = (data?.contenido || fallback || '').trim();
  if (!raw) return 'Sin contenido';
  return raw.split('\n').map(l => l.trim()).filter(Boolean).slice(0, 3).join(' · ');
};

export const RecetasScreen = ({
  doctorUid,
  profile,
}: {
  doctorUid: string;
  profile: UserProfile | null;
}) => {
  const [recetas, setRecetas] = useState<ClinicalDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ClinicalDocument | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const documentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!doctorUid) return;
    // Mismo patrón de query que el resto del proyecto. El filtro por
    // certificationType va en cliente a propósito: un `where` extra exigiría
    // un índice compuesto nuevo en Firestore.
    const q = query(
      collection(db, 'clinical_documents'),
      where('doctorUid', '==', doctorUid),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(
      q,
      snapshot => {
        setRecetas(
          snapshot.docs
            .map(d => ({ id: d.id, ...d.data() } as ClinicalDocument))
            .filter(d => d.certificationType === 'receta')
        );
        setIsLoading(false);
      },
      err => {
        console.error('Error cargando las recetas:', err);
        setError(err?.message || 'No se pudieron cargar las recetas.');
        setIsLoading(false);
      }
    );
  }, [doctorUid]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return recetas;
    return recetas.filter(r => {
      const data = r.structuredData as RecetaRxData | undefined;
      return (
        (r.patientName || '').toLowerCase().includes(term) ||
        (data?.contenido || r.content || '').toLowerCase().includes(term)
      );
    });
  }, [recetas, search]);

  const selectedData = selected?.structuredData as RecetaRxData | undefined;

  const handleExportPDF = async () => {
    if (!documentRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(documentRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Receta_${(selectedData?.nombrePaciente || 'paciente').replace(/\s+/g, '_')}.pdf`);
    } finally {
      setIsExporting(false);
    }
  };

  // --- Vista de detalle: la misma plantilla, con los datos guardados ---
  if (selected && selectedData) {
    return (
      <div className="p-4 md:p-10 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="btn-secondary flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Volver a las recetas
          </button>
          <div className="flex gap-4">
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
              className="h-11 px-6 bg-primary text-white rounded-xl text-xs font-black flex items-center gap-3 hover:bg-primary-container transition-all shadow-xl shadow-primary/20"
            >
              <Printer className="w-4 h-4" /> IMPRIMIR
            </button>
          </div>
        </div>

        <RecetaRxTemplate
          data={selectedData}
          documentRef={documentRef}
          doctorName={profile?.displayName || 'Médico'}
          specialty={profile?.specialty || ''}
          doctorInitials={buildInitials(profile?.displayName)}
          exequatur={profile?.exequatur}
          doctorLogoUrl={profile?.doctorLogoUrl}
          clinicLogoUrl={profile?.clinicLogoUrl}
          clinicName={profile?.clinicName}
          clinicTagline={profile?.clinicTagline}
          clinicAddress={profile?.clinicAddress}
          clinicSuite={profile?.clinicSuite}
          phoneOffice={profile?.phoneOffice}
          phoneExt={profile?.phoneExt}
          phoneCell={profile?.phoneCell}
        />
      </div>
    );
  }

  // --- Listado ---
  return (
    <div className="p-4 md:p-10 space-y-8">
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-high-contrast/20" />
        <input
          type="text"
          placeholder="Buscar por paciente o contenido..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field w-full pl-11"
        />
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm font-semibold">
          ⚠️ {error}
        </div>
      )}

      {isLoading ? (
        <div className="py-24 flex flex-col items-center gap-3 text-high-contrast/40">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-sm font-medium">Cargando recetas...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-24 text-center space-y-3">
          <div className="w-14 h-14 bg-surface-container-low rounded-full flex items-center justify-center mx-auto text-on-surface-variant/30">
            <Pill className="w-7 h-7" />
          </div>
          <p className="text-on-surface-variant text-sm font-medium">
            {recetas.length === 0
              ? 'Todavía no has emitido ninguna receta.'
              : 'Ninguna receta coincide con esa búsqueda.'}
          </p>
          {recetas.length === 0 && (
            <p className="text-xs text-high-contrast/40">
              Usa la acción rápida "Receta Rápida" del Dashboard para crear la primera.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((receta, i) => {
            const data = receta.structuredData as RecetaRxData | undefined;
            return (
              <motion.button
                key={receta.id}
                type="button"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                onClick={() => setSelected(receta)}
                disabled={!data?.contenido}
                className="card-atelier p-6 text-left space-y-4 border border-surface-container-high hover:shadow-ambient hover:border-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Pill className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-on-surface text-sm truncate">
                        {data?.nombrePaciente || receta.patientName || 'Sin paciente'}
                      </p>
                      <p className="text-[10px] text-on-surface-variant flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {data?.fecha || formatDate(receta.createdAt)}
                      </p>
                    </div>
                  </div>
                  <FileText className="w-4 h-4 text-high-contrast/20 shrink-0" />
                </div>
                <p className="text-xs text-high-contrast/60 leading-relaxed line-clamp-3">
                  {buildPreview(data, receta.content)}
                </p>
                <p className="text-[10px] font-bold text-high-contrast/30 uppercase tracking-widest">
                  Emitida el {formatDate(receta.createdAt)}
                </p>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
};
