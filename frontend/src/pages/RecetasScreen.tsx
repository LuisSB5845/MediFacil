import React, { useEffect, useMemo, useRef, useState } from 'react';
import { collection, doc, onSnapshot, orderBy, query, updateDoc, where } from 'firebase/firestore';
import { motion } from 'motion/react';
import {
  Pill, Search, ArrowLeft, FileDown, Printer, Loader2, FileText, Calendar,
  Eye, Edit3, Trash2, Check, FlaskConical,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { db } from '../lib/firebase';
import { ClinicalDocument, OrdenLabData, RecetaRxData, UserProfile } from '../types';
import { RecetaRxTemplate } from '../components/templates/RecetaRxTemplate';
import { OrdenLabTemplate } from '../components/templates/OrdenLabTemplate';

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

const esLab = (doc: ClinicalDocument) => doc.certificationType === 'orden_lab';

/** Resumen corto para la tarjeta: primeras líneas de la receta o estudios pedidos. */
const buildPreview = (doc: ClinicalDocument): string => {
  if (esLab(doc)) {
    const data = doc.structuredData as OrdenLabData | undefined;
    const items = data?.seleccionados || [];
    if (items.length === 0) return data?.otros?.trim() || 'Sin estudios';
    const visibles = items.slice(0, 4).join(' · ');
    return items.length > 4 ? `${visibles} · +${items.length - 4} más` : visibles;
  }
  const data = doc.structuredData as RecetaRxData | undefined;
  const raw = (data?.contenido || doc.content || '').trim();
  if (!raw) return 'Sin contenido';
  return raw.split('\n').map(l => l.trim()).filter(Boolean).slice(0, 3).join(' · ');
};

export const RecetasScreen = ({
  doctorUid,
  profile,
  onDeleteReceta,
}: {
  doctorUid: string;
  profile: UserProfile | null;
  /** Usa el mismo modal de confirmación que el historial médico. */
  onDeleteReceta: (recetaId: string) => void;
}) => {
  const [recetas, setRecetas] = useState<ClinicalDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ClinicalDocument | null>(null);
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [isExporting, setIsExporting] = useState(false);

  // Borrador de edición
  const [editPaciente, setEditPaciente] = useState('');
  const [editFecha, setEditFecha] = useState('');
  const [editContenido, setEditContenido] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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
        const docs = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() } as ClinicalDocument))
          .filter(d => d.certificationType === 'receta' || d.certificationType === 'orden_lab');
        setRecetas(docs);
        // Si la receta abierta se borró o cambió en otra pestaña, se refleja aquí.
        setSelected(prev => (prev ? docs.find(d => d.id === prev.id) || null : null));
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
      return (
        (r.patientName || '').toLowerCase().includes(term) ||
        buildPreview(r).toLowerCase().includes(term)
      );
    });
  }, [recetas, search]);

  const selectedEsLab = selected ? esLab(selected) : false;
  const selectedData = selected?.structuredData as RecetaRxData | undefined;
  const selectedLabData = selected?.structuredData as OrdenLabData | undefined;

  const openReceta = (receta: ClinicalDocument, nextMode: 'view' | 'edit') => {
    const data = receta.structuredData as RecetaRxData | undefined;
    setSelected(receta);
    setMode(nextMode);
    setError(null);
    setEditPaciente(data?.nombrePaciente || receta.patientName || '');
    setEditFecha(data?.fecha || '');
    setEditContenido(data?.contenido || '');
  };

  const handleSaveEdit = async () => {
    if (!selected) return;
    if (!editPaciente.trim()) {
      setError('Indica el nombre del paciente.');
      return;
    }
    if (!editContenido.trim()) {
      setError('La receta no puede quedar vacía.');
      return;
    }

    setIsSaving(true);
    setError(null);

    const data: RecetaRxData = {
      nombrePaciente: editPaciente.trim(),
      fecha: editFecha.trim(),
      contenido: editContenido.trim(),
    };

    try {
      await updateDoc(doc(db, 'clinical_documents', selected.id), {
        structuredData: data,
        patientName: data.nombrePaciente,
        title: `Receta Rx - ${data.nombrePaciente}`,
        content: JSON.stringify(data, null, 2),
      });
      // El onSnapshot refresca `selected`; solo cambiamos de modo.
      setMode('view');
    } catch (err: any) {
      console.error('Error actualizando la receta:', err);
      setError(err?.message || 'No se pudo guardar la receta.');
    } finally {
      setIsSaving(false);
    }
  };

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
      const prefijo = selectedEsLab ? 'Orden_Laboratorio' : 'Receta';
      pdf.save(`${prefijo}_${(selectedData?.nombrePaciente || 'paciente').replace(/\s+/g, '_')}.pdf`);
    } finally {
      setIsExporting(false);
    }
  };

  // --- Vista de detalle: la misma plantilla, con los datos guardados ---
  if (selected && selectedData) {
    return (
      <div className="p-4 md:p-10 space-y-8">
        <div className="no-print flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="btn-secondary flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Volver al listado
          </button>
          <div className="flex flex-wrap gap-4">
            {!selectedEsLab && (
            <button
              type="button"
              onClick={() => setMode(mode === 'edit' ? 'view' : 'edit')}
              className="h-11 px-5 bg-white border border-surface-container-high rounded-xl text-xs font-black flex items-center gap-2 hover:shadow-lg transition-all"
            >
              {mode === 'edit'
                ? <><Eye className="w-4 h-4 text-primary" /> VER</>
                : <><Edit3 className="w-4 h-4 text-primary" /> EDITAR</>}
            </button>
            )}
            <button
              type="button"
              onClick={() => onDeleteReceta(selected.id)}
              className="h-11 px-5 rounded-xl bg-red-50 text-red-600 border border-red-100 text-xs font-black flex items-center gap-2 hover:bg-red-100 transition-all"
            >
              <Trash2 className="w-4 h-4" /> BORRAR
            </button>
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

        {error && (
          <div className="no-print p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm font-semibold">
            ⚠️ {error}
          </div>
        )}

        {mode === 'edit' && (
          <div className="no-print card-atelier p-6 md:p-8 space-y-6 border border-surface-container-high">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="label-atelier text-high-contrast/40 uppercase tracking-widest text-[10px]">Paciente</label>
                <input
                  className="input-field w-full"
                  type="text"
                  value={editPaciente}
                  onChange={e => setEditPaciente(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="label-atelier text-high-contrast/40 uppercase tracking-widest text-[10px]">Fecha</label>
                <input
                  className="input-field w-full"
                  type="text"
                  value={editFecha}
                  onChange={e => setEditFecha(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="label-atelier text-high-contrast/40 uppercase tracking-widest text-[10px]">Contenido de la receta</label>
              <textarea
                className="input-field w-full resize-none !rounded-2xl px-5 py-4 leading-relaxed"
                rows={10}
                value={editContenido}
                onChange={e => setEditContenido(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => { setMode('view'); setError(null); }}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="btn-primary flex items-center gap-2 disabled:opacity-60"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {isSaving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        )}

        {/* El id es el gancho de las reglas @media print de index.css:
            solo lo que esté aquí dentro llega al papel. */}
        <div id="printable-document">
          {selectedEsLab && selectedLabData ? (
            <OrdenLabTemplate
              data={selectedLabData}
              documentRef={documentRef}
              doctorName={profile?.displayName || 'Médico'}
              specialty={profile?.specialty || ''}
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
          ) : (
            <RecetaRxTemplate
              data={mode === 'edit'
                ? { nombrePaciente: editPaciente, fecha: editFecha, contenido: editContenido }
                : selectedData!}
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
          )}
        </div>
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
              ? 'Todavía no has emitido ninguna receta ni orden de laboratorio.'
              : 'Nada coincide con esa búsqueda.'}
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
            const lab = esLab(receta);
            const data = receta.structuredData as RecetaRxData | undefined;
            // Las recetas del modelo estructurado viejo no tienen `contenido`:
            // se listan, pero no se abren ni se editan (solo se pueden borrar).
            const abrible = lab ? Boolean(receta.structuredData) : Boolean(data?.contenido);
            return (
              <motion.div
                key={receta.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                className="card-atelier p-6 text-left space-y-4 border border-surface-container-high hover:shadow-ambient hover:border-primary/20 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      {lab ? <FlaskConical className="w-5 h-5" /> : <Pill className="w-5 h-5" />}
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
                  {buildPreview(receta)}
                </p>
                <p className="text-[10px] font-bold text-high-contrast/30 uppercase tracking-widest">
                  {lab ? 'Orden de laboratorio' : 'Receta Rx'} · {formatDate(receta.createdAt)}
                </p>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-surface-container-low">
                  <button
                    type="button"
                    onClick={() => openReceta(receta, 'view')}
                    disabled={!abrible}
                    title={abrible ? 'Ver receta' : 'Receta de un formato anterior: no se puede abrir'}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white font-black text-[10px] shadow-lg shadow-blue-600/30 hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all uppercase tracking-widest border-2 border-blue-500/20 disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <Eye className="w-4 h-4" /> Ver
                  </button>
                  {!lab && (
                  <button
                    type="button"
                    onClick={() => openReceta(receta, 'edit')}
                    disabled={!abrible}
                    title={abrible ? 'Editar receta' : 'Receta de un formato anterior: no se puede editar'}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white font-black text-[10px] shadow-lg shadow-primary/30 hover:bg-primary-container hover:scale-105 active:scale-95 transition-all uppercase tracking-widest border-2 border-primary/20 disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <Edit3 className="w-4 h-4" /> Editar
                  </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onDeleteReceta(receta.id)}
                    title="Eliminar receta"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 text-white font-black text-[10px] shadow-lg shadow-red-500/30 hover:bg-red-600 hover:scale-105 active:scale-95 transition-all uppercase tracking-widest border-2 border-red-400/20"
                  >
                    <Trash2 className="w-4 h-4" /> Borrar
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
