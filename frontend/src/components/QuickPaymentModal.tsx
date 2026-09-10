import React, { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, getDocs, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { motion } from 'motion/react';
import { X, Search, Users, ChevronRight, Loader2, Check, DollarSign, Stethoscope, AlertCircle } from 'lucide-react';
import { db } from '../lib/firebase';
import { Patient, PaymentRecord, Consultation } from '../types';
import { METODOS_PAGO, ESTADOS_PAGO } from '../lib/payments';

/** Conceptos habituales, para no escribirlos a mano cada vez. */
const CONCEPTOS_SUGERIDOS = [
  'Consulta de Seguimiento',
  'Consulta General',
  'Papanicolaou',
  'Sonografía',
  'Procedimiento Menor',
];

export const QuickPaymentModal = ({
  patients,
  doctorUid,
  paciente,
  onClose,
}: {
  patients: Patient[];
  doctorUid: string;
  /** Paciente preseleccionado, si el cobro se abre desde su expediente. */
  paciente?: Patient | null;
  onClose: () => void;
}) => {
  const [search, setSearch] = useState('');
  const [showPatientPicker, setShowPatientPicker] = useState(false);

  const [patientId, setPatientId] = useState(paciente?.id || '');
  const [patientName, setPatientName] = useState(paciente?.name || '');
  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentRecord['paymentMethod']>('cash');
  const [status, setStatus] = useState<PaymentRecord['status']>('completed');
  const [notes, setNotes] = useState('');

  // Todo cobro va atado a una consulta: es lo que lo hace rastreable.
  const [consultas, setConsultas] = useState<Consultation[]>([]);
  const [consultationId, setConsultationId] = useState('');
  const [cargandoConsultas, setCargandoConsultas] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredPatients = useMemo(
    () => patients.filter(p => p.name.toLowerCase().includes(search.toLowerCase())),
    [patients, search]
  );

  // Al elegir paciente se traen sus consultas para asociar el cobro.
  useEffect(() => {
    setConsultationId('');
    setConsultas([]);
    if (!patientId) return;

    let vigente = true;
    setCargandoConsultas(true);
    (async () => {
      try {
        const snap = await getDocs(
          query(collection(db, 'patients', patientId, 'consultations'), orderBy('date', 'desc'))
        );
        if (!vigente) return;
        const lista = snap.docs.map(d => ({ id: d.id, ...d.data() } as Consultation));
        setConsultas(lista);
        // Con una sola consulta no hay nada que elegir.
        if (lista.length === 1) setConsultationId(lista[0].id);
      } catch (err) {
        console.error('Error cargando las consultas del paciente:', err);
      } finally {
        if (vigente) setCargandoConsultas(false);
      }
    })();

    return () => { vigente = false; };
  }, [patientId]);

  const etiquetaConsulta = (c: Consultation) => {
    const d = c.date?.toDate ? c.date.toDate() : new Date(c.date);
    const fecha = isNaN(d.getTime())
      ? 'Sin fecha'
      : d.toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' });
    const detalle = (c.diagnosis || c.type || '').trim();
    return detalle ? `${fecha} · ${detalle}` : fecha;
  };

  const handleSave = async () => {
    if (!patientId) {
      setError('Selecciona el paciente con el botón Buscar.');
      return;
    }
    if (!consultationId) {
      setError('Selecciona la consulta a la que corresponde este cobro.');
      return;
    }
    if (!concept.trim()) {
      setError('Escribe el concepto del cobro.');
      return;
    }
    const monto = Number(amount);
    if (!monto || monto <= 0) {
      setError('El monto debe ser mayor que cero.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await addDoc(collection(db, 'consultation_payments'), {
        doctorUid,
        patientId,
        patientName: patientName.trim(),
        consultationId,
        concept: concept.trim(),
        amount: monto,
        paymentMethod,
        status,
        notes: notes.trim(),
        date: serverTimestamp(),
      });
      onClose();
    } catch (err: any) {
      console.error('Error guardando el cobro:', err);
      setError(err?.message || 'No se pudo registrar el cobro.');
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
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
        className="relative card-atelier w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden"
      >
        <div className="p-6 md:p-8 flex justify-between items-center border-b border-surface-container-high shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="title-atelier text-primary">Registrar Cobro</h3>
              <p className="text-xs text-high-contrast/50">Ingreso del consultorio, atado a una consulta del paciente</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-high rounded-full transition-colors">
            <X className="w-6 h-6 text-high-contrast/40" />
          </button>
        </div>

        {error && (
          <div className="mx-6 md:mx-8 mt-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm font-semibold flex justify-between items-center shrink-0">
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 font-bold ml-4">✕</button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto no-scrollbar p-6 md:p-8 space-y-7">
          {/* Paciente */}
          <section className="space-y-3">
            <label className="label-atelier text-high-contrast/40 uppercase tracking-widest text-[10px]">Paciente</label>
            <div className="flex gap-3">
              <input
                className="input-field flex-1"
                type="text"
                readOnly
                placeholder="Selecciona el paciente con Buscar"
                value={patientName}
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
                    filteredPatients.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setPatientId(p.id);
                          setPatientName(p.name);
                          setShowPatientPicker(false);
                          setSearch('');
                        }}
                        className="w-full p-3 flex items-center justify-between rounded-xl hover:bg-primary-fixed transition-colors text-left group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                            {p.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <p className="font-bold text-on-surface text-sm group-hover:text-primary">{p.name}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-on-surface-variant group-hover:text-primary" />
                      </button>
                    ))
                  ) : (
                    <div className="py-10 text-center space-y-3">
                      <div className="w-12 h-12 bg-surface-container-low rounded-full flex items-center justify-center mx-auto text-on-surface-variant/20">
                        <Users className="w-6 h-6" />
                      </div>
                      <p className="text-on-surface-variant text-sm font-medium">No se encontraron pacientes.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Consulta asociada */}
          <section className="space-y-3">
            <label className="label-atelier text-high-contrast/40 uppercase tracking-widest text-[10px]">
              Consulta asociada
            </label>

            {!patientId ? (
              <p className="text-xs text-high-contrast/40 px-1">
                Selecciona primero el paciente para ver sus consultas.
              </p>
            ) : cargandoConsultas ? (
              <div className="flex items-center gap-2 text-xs text-high-contrast/40 px-1">
                <Loader2 className="w-4 h-4 animate-spin text-primary" /> Cargando consultas...
              </div>
            ) : consultas.length === 0 ? (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 font-medium leading-relaxed">
                  Este paciente no tiene consultas registradas, así que el cobro no se podría rastrear.
                  Registra primero la consulta —desde ahí puedes cobrarla en el mismo paso.
                </div>
              </div>
            ) : (
              <div className="relative">
                <Stethoscope className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-high-contrast/20 pointer-events-none" />
                <select
                  className="input-field w-full pl-12"
                  value={consultationId}
                  onChange={(e) => setConsultationId(e.target.value)}
                >
                  <option value="">Selecciona la consulta...</option>
                  {consultas.map(c => (
                    <option key={c.id} value={c.id}>{etiquetaConsulta(c)}</option>
                  ))}
                </select>
              </div>
            )}
          </section>

          {/* Concepto */}
          <section className="space-y-3">
            <label className="label-atelier text-high-contrast/40 uppercase tracking-widest text-[10px]">Concepto</label>
            <input
              className="input-field w-full"
              type="text"
              placeholder="Ej: Consulta de Seguimiento"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              {CONCEPTOS_SUGERIDOS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setConcept(c)}
                  className="px-3 py-1.5 rounded-full bg-surface-low border border-surface-container-high text-[11px] font-bold text-high-contrast/60 hover:border-primary/30 hover:text-primary transition-colors"
                >
                  {c}
                </button>
              ))}
            </div>
          </section>

          {/* Monto, metodo y estado */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-2">
              <label className="label-atelier text-high-contrast/40 uppercase tracking-widest text-[10px]">Monto (RD$)</label>
              <input
                className="input-field w-full"
                type="number"
                min="0"
                placeholder="2500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="label-atelier text-high-contrast/40 uppercase tracking-widest text-[10px]">Método de pago</label>
              <select
                className="input-field w-full"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentRecord['paymentMethod'])}
              >
                {METODOS_PAGO.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="label-atelier text-high-contrast/40 uppercase tracking-widest text-[10px]">Estado</label>
              <select
                className="input-field w-full"
                value={status}
                onChange={(e) => setStatus(e.target.value as PaymentRecord['status'])}
              >
                {ESTADOS_PAGO.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
              </select>
            </div>
          </section>

          {/* Notas */}
          <section className="space-y-2">
            <label className="label-atelier text-high-contrast/40 uppercase tracking-widest text-[10px]">Notas (opcional)</label>
            <textarea
              className="input-field w-full resize-none !rounded-2xl px-5 py-4"
              rows={2}
              placeholder="Ej: Abonó la mitad, resta el balance."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </section>
        </div>

        <div className="p-6 bg-surface-container-low flex justify-between items-center gap-4 shrink-0 border-t border-surface-container-high">
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !consultationId}
            className="btn-primary flex items-center gap-2 disabled:opacity-60"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {isSaving ? 'Guardando...' : 'Registrar Cobro'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
