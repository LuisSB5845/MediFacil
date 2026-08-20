import React, { useMemo, useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { motion } from 'motion/react';
import {
  X, Search, Users, ChevronRight, Sparkles, Loader2,
  FileText, ArrowLeft, Check, Pill, FlaskConical,
} from 'lucide-react';
import { db } from '../lib/firebase';
import { generateStructuredCertification } from '../lib/ai';
import { Patient, UserProfile, RecetaRxData, OrdenLabData } from '../types';
import { RecetaRxTemplate } from './templates/RecetaRxTemplate';
import { OrdenLabTemplate } from './templates/OrdenLabTemplate';
import { ORDEN_LAB_COLUMNAS } from '../lib/ordenLabCatalog';

type DocTipo = 'rx' | 'lab';

const todayLabel = () => new Date().toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' });

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

export const RecetaRapidaModal = ({
  patients,
  profile,
  doctorUid,
  onClose,
}: {
  patients: Patient[];
  profile: UserProfile | null;
  doctorUid: string;
  onClose: () => void;
}) => {
  const [tipo, setTipo] = useState<DocTipo>('rx');
  const [step, setStep] = useState<'form' | 'preview'>('form');
  const [search, setSearch] = useState('');
  const [showPatientPicker, setShowPatientPicker] = useState(false);

  const [isFilling, setIsFilling] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nombrePaciente, setNombrePaciente] = useState('');
  const [fecha, setFecha] = useState(todayLabel());
  const [contenido, setContenido] = useState('');

  const filteredPatients = useMemo(
    () => patients.filter(p => p.name.toLowerCase().includes(search.toLowerCase())),
    [patients, search]
  );

  // Orden de laboratorio: selección manual de estudios, sin IA.
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [otrosRadiografias, setOtrosRadiografias] = useState('');
  const [otrosEstudios, setOtrosEstudios] = useState('');
  const [otros, setOtros] = useState('');

  const recetaData: RecetaRxData = useMemo(() => ({
    nombrePaciente: nombrePaciente.trim() || 'N/E',
    fecha: fecha.trim() || todayLabel(),
    contenido: contenido.trim(),
  }), [nombrePaciente, fecha, contenido]);

  const ordenLabData: OrdenLabData = useMemo(() => ({
    nombrePaciente: nombrePaciente.trim() || 'N/E',
    fecha: fecha.trim() || todayLabel(),
    seleccionados,
    otrosRadiografias: otrosRadiografias.trim(),
    otrosEstudios: otrosEstudios.trim(),
    otros: otros.trim(),
  }), [nombrePaciente, fecha, seleccionados, otrosRadiografias, otrosEstudios, otros]);

  const toggleEstudio = (item: string) => {
    setSeleccionados(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  /**
   * Mejora con IA (POST /api/ai/generate-certification, tipo 'receta').
   * La IA reescribe el mismo texto del doctor —ortografía, formato de lista—
   * sin agregar ni completar nada, y el resultado reemplaza el textarea.
   */
  const handleImproveWithAI = async () => {
    if (!contenido.trim()) {
      setError('Escribe primero el contenido de la receta.');
      return;
    }

    setError(null);
    setIsFilling(true);

    try {
      const contexto = [
        nombrePaciente.trim() ? `Paciente seleccionado: ${nombrePaciente.trim()}` : '',
        `Fecha de hoy: ${todayLabel()}`,
        `Médico: ${profile?.displayName || ''} (${profile?.specialty || 'Especialidad no indicada'})`,
      ].filter(Boolean).join('\n');

      const result = await generateStructuredCertification(contenido, contexto, 'receta');
      const data = result?.data as RecetaRxData | undefined;

      if (!data?.contenido?.trim()) {
        throw new Error('La IA no devolvió datos utilizables.');
      }

      // El doctor manda: si ya eligió paciente, no se pisa con lo que infiera la IA.
      if (!nombrePaciente.trim() && data.nombrePaciente) setNombrePaciente(data.nombrePaciente);
      if (data.fecha) setFecha(data.fecha);
      setContenido(data.contenido);
    } catch (err: any) {
      console.error('Error mejorando la receta con IA:', err);
      setError(err?.message || 'No se pudo mejorar la receta. Puedes escribirla a mano.');
    } finally {
      setIsFilling(false);
    }
  };

  const handleGeneratePreview = () => {
    if (!recetaData.nombrePaciente || recetaData.nombrePaciente === 'N/E') {
      setError('Indica el nombre del paciente antes de generar la vista previa.');
      return;
    }
    if (tipo === 'rx' && !recetaData.contenido) {
      setError('Escribe el contenido de la receta.');
      return;
    }
    if (tipo === 'lab' && seleccionados.length === 0 && !otros.trim()
        && !otrosRadiografias.trim() && !otrosEstudios.trim()) {
      setError('Marca al menos un estudio.');
      return;
    }
    setError(null);
    setStep('preview');
  };

  const handleConfirmSave = async () => {
    setIsSaving(true);
    setError(null);

    const esRx = tipo === 'rx';
    const data = esRx ? recetaData : ordenLabData;

    try {
      await addDoc(collection(db, 'clinical_documents'), {
        title: `${esRx ? 'Receta Rx' : 'Orden de Laboratorio'} - ${data.nombrePaciente}`,
        subtitle: esRx
          ? 'Generado hoy • Receta rápida'
          : `Generado hoy • ${ordenLabData.seleccionados.length} estudio${ordenLabData.seleccionados.length === 1 ? '' : 's'}`,
        type: 'structured_certification',
        certificationType: esRx ? 'receta' : 'orden_lab',
        structuredData: data,
        doctorUid,
        patientName: data.nombrePaciente,
        createdAt: serverTimestamp(),
        content: JSON.stringify(data, null, 2),
      });
      onClose();
    } catch (err: any) {
      console.error('Error guardando el documento:', err);
      setError(err?.message || 'No se pudo guardar el documento.');
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#191970]/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative card-atelier w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
      >
        {/* Cabecera */}
        <div className="p-6 md:p-8 pb-0 md:pb-0 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              {tipo === 'rx' ? <Pill className="w-5 h-5" /> : <FlaskConical className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="title-atelier text-primary">
                {tipo === 'rx' ? 'Receta Rápida' : 'Orden de Laboratorio'}
              </h3>
              <p className="text-xs text-high-contrast/50">
                {step === 'preview'
                  ? 'Revisa el documento antes de guardarlo'
                  : tipo === 'rx'
                    ? 'Dicta o escribe la receta y ajusta lo que haga falta'
                    : 'Marca los estudios que necesita el paciente'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-high rounded-full transition-colors">
            <X className="w-6 h-6 text-high-contrast/40" />
          </button>
        </div>

        {/* Selector de tipo de documento */}
        <div className="px-6 md:px-8 pt-5 pb-5 border-b border-surface-container-high shrink-0">
          <div className="inline-flex gap-1 p-1 bg-surface-container-high rounded-xl">
            {([
              { id: 'rx' as DocTipo, label: 'Receta Rx', icon: Pill },
              { id: 'lab' as DocTipo, label: 'Orden de Laboratorio', icon: FlaskConical },
            ]).map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => { setTipo(opt.id); setStep('form'); setError(null); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  tipo === opt.id
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-high-contrast/50 hover:text-high-contrast'
                }`}
              >
                <opt.icon className="w-4 h-4" />
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mx-6 md:mx-8 mt-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm font-semibold flex justify-between items-center shrink-0">
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 font-bold ml-4">✕</button>
          </div>
        )}

        {/* Cuerpo */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-6 md:p-8">
          {step === 'form' ? (
            <div className="space-y-8">

              {/* 1. Paciente */}
              <section className="space-y-3">
                <label className="label-atelier text-high-contrast/40 uppercase tracking-widest text-[10px]">Paciente</label>
                <div className="flex gap-3">
                  <input
                    className="input-field flex-1"
                    type="text"
                    placeholder="Nombre del paciente"
                    value={nombrePaciente}
                    onChange={(e) => setNombrePaciente(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPatientPicker(v => !v)}
                    className="btn-secondary flex items-center gap-2 px-4 whitespace-nowrap"
                  >
                    <Search className="w-4 h-4" />
                    {showPatientPicker ? 'Cerrar' : 'Buscar'}
                  </button>
                </div>

                {showPatientPicker && (
                  <div className="border border-surface-container-high rounded-2xl overflow-hidden bg-surface-low">
                    <div className="relative p-3 border-b border-surface-container-high">
                      <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
                      <input
                        className="w-full h-10 pl-10 pr-4 rounded-xl bg-white border-none focus:ring-2 focus:ring-primary/10 transition-all text-sm"
                        placeholder="Escriba el nombre del paciente..."
                        type="text"
                        autoFocus
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                    <div className="max-h-[30vh] overflow-y-auto no-scrollbar p-2 space-y-1">
                      {filteredPatients.length > 0 ? (
                        filteredPatients.map(patient => (
                          <button
                            key={patient.id}
                            type="button"
                            onClick={() => {
                              setNombrePaciente(patient.name);
                              setShowPatientPicker(false);
                              setSearch('');
                            }}
                            className="w-full p-3 flex items-center justify-between rounded-xl hover:bg-primary-fixed transition-colors text-left group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                {patient.name.split(' ').map(n => n[0]).join('')}
                              </div>
                              <div>
                                <p className="font-bold text-on-surface text-sm group-hover:text-primary">{patient.name}</p>
                                <p className="text-[10px] text-on-surface-variant">ID: #{patient.id.slice(-6).toUpperCase()}</p>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-on-surface-variant group-hover:text-primary" />
                          </button>
                        ))
                      ) : (
                        <div className="py-10 text-center space-y-3">
                          <div className="w-12 h-12 bg-surface-container-low rounded-full flex items-center justify-center mx-auto text-on-surface-variant/20">
                            <Users className="w-6 h-6" />
                          </div>
                          <p className="text-on-surface-variant text-sm font-medium">No se encontraron pacientes con ese nombre.</p>
                          <p className="text-xs text-high-contrast/40">Puedes escribir el nombre a mano en el campo de arriba.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </section>

              {/* 2. Contenido de la receta — texto libre + mejora con IA */}
              {tipo === 'rx' && (
              <section className="space-y-3">
                <label className="label-atelier text-high-contrast/40 uppercase tracking-widest text-[10px]">
                  Contenido de la receta
                </label>
                <textarea
                  className="input-field w-full resize-none !rounded-2xl px-5 py-4 leading-relaxed"
                  rows={8}
                  placeholder={'Ej:\nAmoxicilina 500mg cada 8 horas por 7 días\nTomar con alimentos'}
                  value={contenido}
                  onChange={(e) => setContenido(e.target.value)}
                />
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <p className="text-[11px] text-high-contrast/40">
                    Se imprime tal cual lo escribas, con los saltos de línea incluidos.
                  </p>
                  <button
                    type="button"
                    onClick={handleImproveWithAI}
                    disabled={isFilling}
                    className="btn-primary flex items-center gap-2 py-2.5 px-5 text-sm disabled:opacity-60"
                  >
                    {isFilling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {isFilling ? 'Mejorando...' : 'Mejorar con IA'}
                  </button>
                </div>
              </section>
              )}

              {/* 2b. Estudios de la orden de laboratorio — selección manual */}
              {tipo === 'lab' && (
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
                        onClick={() => setSeleccionados([])}
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
                              <label
                                key={item}
                                className="flex items-start gap-2 cursor-pointer group"
                              >
                                <input
                                  type="checkbox"
                                  checked={seleccionados.includes(item)}
                                  onChange={() => toggleEstudio(item)}
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
                                  ? setOtrosRadiografias(e.target.value)
                                  : setOtrosEstudios(e.target.value)
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
                    onChange={(e) => setOtros(e.target.value)}
                  />
                </div>
              </section>
              )}

              {/* 3. Datos del documento */}
              <section className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="label-atelier text-high-contrast/40 uppercase tracking-widest text-[10px]">Nombre del paciente</label>
                    <input
                      className="input-field w-full"
                      type="text"
                      value={nombrePaciente}
                      onChange={(e) => setNombrePaciente(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="label-atelier text-high-contrast/40 uppercase tracking-widest text-[10px]">Fecha</label>
                    <input
                      className="input-field w-full"
                      type="text"
                      value={fecha}
                      onChange={(e) => setFecha(e.target.value)}
                    />
                  </div>
                </div>
              </section>
            </div>
          ) : (
            <div className="bg-surface-low -m-6 md:-m-8 p-6 md:p-8">
              {tipo === 'rx' ? (
                <RecetaRxTemplate
                  data={recetaData}
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
              ) : (
                <OrdenLabTemplate
                  data={ordenLabData}
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
              )}
            </div>
          )}
        </div>

        {/* Pie de acciones */}
        <div className="p-6 bg-surface-container-low flex justify-between items-center gap-4 shrink-0 border-t border-surface-container-high">
          {step === 'form' ? (
            <>
              <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
              <button
                type="button"
                onClick={handleGeneratePreview}
                disabled={isFilling}
                className="btn-primary flex items-center gap-2 disabled:opacity-60"
              >
                <FileText className="w-4 h-4" /> Generar Preview
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep('form')}
                className="btn-secondary flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Volver a editar
              </button>
              <button
                type="button"
                onClick={handleConfirmSave}
                disabled={isSaving}
                className="btn-primary flex items-center gap-2 disabled:opacity-60"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {isSaving ? 'Guardando...' : 'Confirmar y Guardar'}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};
