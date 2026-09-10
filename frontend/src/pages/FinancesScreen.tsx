import React, { useEffect, useMemo, useRef, useState } from 'react';
import { collection, doc, onSnapshot, orderBy, query, updateDoc, where } from 'firebase/firestore';
import { motion } from 'motion/react';
import {
  Search, Loader2, DollarSign, Clock, CreditCard, Printer, FileDown,
  CheckCircle2, TrendingUp,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { PaymentRecord, UserProfile } from '../types';
import {
  METODOS_PAGO, ETIQUETA_METODO, formatearRD, fechaPago, formatearFechaPago,
} from '../lib/payments';

type Periodo = 'hoy' | 'semana' | 'mes' | 'todo';

const PERIODOS: { id: Periodo; label: string }[] = [
  { id: 'hoy', label: 'Hoy' },
  { id: 'semana', label: 'Esta Semana' },
  { id: 'mes', label: 'Este Mes' },
  { id: 'todo', label: 'Todo el Historial' },
];

/** Fecha de corte del periodo. null = sin corte. */
const desdeDe = (periodo: Periodo): Date | null => {
  const ahora = new Date();
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  if (periodo === 'hoy') return hoy;
  if (periodo === 'semana') {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() - 7);
    return d;
  }
  if (periodo === 'mes') return new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  return null;
};

export const FinancesScreen = ({
  doctorUid,
  profile,
}: {
  doctorUid: string;
  profile: UserProfile | null;
}) => {
  const [pagos, setPagos] = useState<PaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [search, setSearch] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [marcando, setMarcando] = useState<string | null>(null);

  const reporteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!doctorUid) return;
    const q = query(
      collection(db, 'consultation_payments'),
      where('doctorUid', '==', doctorUid),
      orderBy('date', 'desc')
    );
    return onSnapshot(
      q,
      snapshot => {
        setPagos(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PaymentRecord)));
        setIsLoading(false);
      },
      error => {
        setIsLoading(false);
        handleFirestoreError(error, OperationType.LIST, 'consultation_payments');
      }
    );
  }, [doctorUid]);

  // --- Periodo + buscador ---
  const delPeriodo = useMemo(() => {
    const desde = desdeDe(periodo);
    if (!desde) return pagos;
    return pagos.filter(p => {
      const d = fechaPago(p.date);
      return d ? d >= desde : true; // un cobro recién creado aún no tiene timestamp del servidor
    });
  }, [pagos, periodo]);

  const visibles = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return delPeriodo;
    return delPeriodo.filter(p =>
      (p.patientName || '').toLowerCase().includes(term) ||
      (p.concept || '').toLowerCase().includes(term)
    );
  }, [delPeriodo, search]);

  // --- KPIs, sobre el periodo completo (no sobre el buscador) ---
  const kpis = useMemo(() => {
    const cobrados = delPeriodo.filter(p => p.status === 'completed');
    const pendientes = delPeriodo.filter(p => p.status === 'pending');
    const suma = (lista: PaymentRecord[]) => lista.reduce((t, p) => t + (Number(p.amount) || 0), 0);

    const totalCobrado = suma(cobrados);
    const porMetodo = METODOS_PAGO.map(m => {
      const monto = suma(cobrados.filter(p => p.paymentMethod === m.id));
      return {
        ...m,
        monto,
        porcentaje: totalCobrado > 0 ? Math.round((monto / totalCobrado) * 100) : 0,
      };
    });

    return {
      totalCobrado,
      cantidadCobros: cobrados.length,
      totalPendiente: suma(pendientes),
      cantidadPendientes: pendientes.length,
      pacientesPendientes: new Set(pendientes.map(p => p.patientName)).size,
      porMetodo,
    };
  }, [delPeriodo]);

  const marcarPagado = async (pago: PaymentRecord) => {
    setMarcando(pago.id);
    try {
      await updateDoc(doc(db, 'consultation_payments', pago.id), { status: 'completed' });
    } catch (err) {
      console.error('Error marcando el cobro como pagado:', err);
    } finally {
      setMarcando(null);
    }
  };

  const handleExportPDF = async () => {
    if (!reporteRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(reporteRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Reporte_Financiero_${periodo}.pdf`);
    } finally {
      setIsExporting(false);
    }
  };

  const etiquetaPeriodo = PERIODOS.find(p => p.id === periodo)?.label || '';

  return (
    <div className="p-4 md:p-10 space-y-8">
      {/* Filtros y acciones */}
      <div className="no-print flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex gap-1 p-1 bg-surface-container-high rounded-xl">
          {PERIODOS.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriodo(p.id)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                periodo === p.id
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-high-contrast/50 hover:text-high-contrast'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
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
        </div>
      </div>

      {/* Todo lo que entra en el reporte impreso */}
      <div id="printable-document" ref={reporteRef} className="space-y-8 bg-white">
        <div className="hidden print:block space-y-1">
          <h1 className="text-2xl font-black text-high-contrast">Reporte Financiero</h1>
          <p className="text-sm text-high-contrast/60">
            {profile?.displayName || 'Consultorio'} · {etiquetaPeriodo} · Generado el{' '}
            {new Date().toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {isLoading ? (
          <div className="py-24 flex flex-col items-center gap-3 text-high-contrast/40">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-sm font-medium">Cargando cobros...</p>
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="card-atelier p-7 border border-surface-container-high space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <p className="label-atelier text-high-contrast/40 uppercase tracking-widest text-[10px]">
                    Ingresos del período
                  </p>
                </div>
                <p className="text-3xl font-black text-high-contrast">{formatearRD(kpis.totalCobrado)}</p>
                <p className="text-xs font-medium text-high-contrast/40">
                  {kpis.cantidadCobros} cobro{kpis.cantidadCobros === 1 ? '' : 's'} · {etiquetaPeriodo}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="card-atelier p-7 border border-surface-container-high space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                    <Clock className="w-5 h-5" />
                  </div>
                  <p className="label-atelier text-high-contrast/40 uppercase tracking-widest text-[10px]">
                    Pendiente por cobrar
                  </p>
                </div>
                <p className="text-3xl font-black text-high-contrast">{formatearRD(kpis.totalPendiente)}</p>
                <p className="text-xs font-medium text-high-contrast/40">
                  {kpis.cantidadPendientes} cobro{kpis.cantidadPendientes === 1 ? '' : 's'} ·{' '}
                  {kpis.pacientesPendientes} paciente{kpis.pacientesPendientes === 1 ? '' : 's'}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="card-atelier p-7 border border-surface-container-high space-y-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <p className="label-atelier text-high-contrast/40 uppercase tracking-widest text-[10px]">
                    Por método de pago
                  </p>
                </div>
                <div className="space-y-2">
                  {kpis.porMetodo.map(m => (
                    <div key={m.id} className="space-y-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-xs font-bold text-high-contrast/70">{m.label}</span>
                        <span className="text-xs font-black text-high-contrast whitespace-nowrap">
                          {formatearRD(m.monto)} · {m.porcentaje}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${m.porcentaje}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Buscador */}
            <div className="no-print relative max-w-md">
              <Search className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-high-contrast/20" />
              <input
                type="text"
                placeholder="Buscar por paciente o concepto..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-14 pl-12 pr-4 bg-white border border-surface-container-high rounded-2xl text-sm font-bold focus:outline-none focus:border-primary transition-all"
              />
            </div>

            {/* Movimientos */}
            {visibles.length > 0 ? (
              <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-[0px_10px_40px_rgba(25,25,112,0.03)] border border-outline-variant/10">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px] text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-container-low/50">
                        <th className="px-6 py-4 text-[10px] font-extrabold text-outline-variant uppercase tracking-[0.2em]">Fecha</th>
                        <th className="px-6 py-4 text-[10px] font-extrabold text-outline-variant uppercase tracking-[0.2em]">Paciente</th>
                        <th className="px-6 py-4 text-[10px] font-extrabold text-outline-variant uppercase tracking-[0.2em]">Concepto</th>
                        <th className="px-6 py-4 text-[10px] font-extrabold text-outline-variant uppercase tracking-[0.2em]">Método</th>
                        <th className="px-6 py-4 text-[10px] font-extrabold text-outline-variant uppercase tracking-[0.2em] text-right">Monto</th>
                        <th className="px-6 py-4 text-[10px] font-extrabold text-outline-variant uppercase tracking-[0.2em] text-right">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibles.map(pago => (
                        <tr key={pago.id} className="border-t border-outline-variant/10 hover:bg-surface-container-low/40 transition-colors">
                          <td className="px-6 py-4 text-xs font-bold text-high-contrast/60 whitespace-nowrap">
                            {formatearFechaPago(pago.date)}
                          </td>
                          <td className="px-6 py-4 text-sm font-bold text-on-surface">{pago.patientName}</td>
                          <td className="px-6 py-4 text-sm text-high-contrast/70">
                            {pago.concept}
                            {pago.notes && (
                              <span className="block text-[11px] text-high-contrast/40 truncate max-w-xs">{pago.notes}</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-xs font-bold text-high-contrast/60 whitespace-nowrap">
                            {ETIQUETA_METODO[pago.paymentMethod] || pago.paymentMethod}
                          </td>
                          <td className="px-6 py-4 text-sm font-black text-high-contrast text-right whitespace-nowrap">
                            {formatearRD(pago.amount)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              {pago.status === 'completed' ? (
                                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest border border-emerald-200 whitespace-nowrap">
                                  Pagado
                                </span>
                              ) : (
                                <>
                                  <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-widest border border-amber-200 whitespace-nowrap">
                                    Pendiente
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => marcarPagado(pago)}
                                    disabled={marcando === pago.id}
                                    title="Marcar como pagado"
                                    className="no-print p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                                  >
                                    {marcando === pago.id
                                      ? <Loader2 className="w-4 h-4 animate-spin" />
                                      : <CheckCircle2 className="w-4 h-4" />}
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="py-24 text-center space-y-3">
                <div className="w-14 h-14 bg-surface-container-low rounded-full flex items-center justify-center mx-auto text-on-surface-variant/30">
                  <TrendingUp className="w-7 h-7" />
                </div>
                <p className="text-on-surface-variant text-sm font-medium">
                  {pagos.length === 0
                    ? 'Todavía no has registrado ningún cobro.'
                    : 'No hay movimientos en este período o búsqueda.'}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
