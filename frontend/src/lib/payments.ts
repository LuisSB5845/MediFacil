import { PaymentRecord } from '../types';

/** Etiquetas y utilidades compartidas por el módulo de cobros. */

export const METODOS_PAGO: { id: PaymentRecord['paymentMethod']; label: string }[] = [
  { id: 'cash', label: 'Efectivo' },
  { id: 'card', label: 'Tarjeta' },
  { id: 'transfer', label: 'Transferencia' },
  { id: 'insurance', label: 'Seguro Médico' },
];

export const ETIQUETA_METODO: Record<PaymentRecord['paymentMethod'], string> =
  Object.fromEntries(METODOS_PAGO.map(m => [m.id, m.label])) as Record<
    PaymentRecord['paymentMethod'],
    string
  >;

export const ESTADOS_PAGO: { id: PaymentRecord['status']; label: string }[] = [
  { id: 'completed', label: 'Pagado' },
  { id: 'pending', label: 'Pendiente' },
];

export const formatearRD = (monto: number): string =>
  `RD$ ${(Number(monto) || 0).toLocaleString('es-DO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

/** Fecha de un cobro, venga como Timestamp de Firestore o como Date. */
export const fechaPago = (valor: any): Date | null => {
  if (!valor) return null;
  const d = valor?.toDate ? valor.toDate() : new Date(valor);
  return isNaN(d.getTime()) ? null : d;
};

export const formatearFechaPago = (valor: any): string => {
  const d = fechaPago(valor);
  return d ? d.toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
};
