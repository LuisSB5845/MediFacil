import React, { useState, useEffect } from 'react';
import { query, collection, orderBy, onSnapshot } from 'firebase/firestore';
import { X, Calendar, History } from 'lucide-react';
import { motion } from 'motion/react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Patient, Consultation } from '../types';

export const ConsultationSearchModal = ({ 
  patient, 
  onClose, 
  onSelect 
}: { 
  patient: Patient; 
  onClose: () => void; 
  onSelect: (c: Consultation) => void;
}) => {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });

  useEffect(() => {
    const q = query(
      collection(db, 'patients', patient.id, 'consultations'),
      orderBy('date', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      setConsultations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Consultation)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `patients/${patient.id}/consultations`);
    });
  }, [patient.id]);

  const filteredConsultations = consultations.filter(c => {
    const cDate = new Date(c.date?.toDate?.() || c.date);
    const start = dateFilter.start ? new Date(dateFilter.start) : null;
    const end = dateFilter.end ? new Date(dateFilter.end) : null;
    
    if (start && cDate < start) return false;
    if (end) {
      const endOfDay = new Date(end);
      endOfDay.setHours(23, 59, 59, 999);
      if (cDate > endOfDay) return false;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#191970]/40 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative card-atelier w-full max-w-2xl overflow-hidden"
      >
        <div className="p-8 flex justify-between items-center border-b border-surface-container-high">
          <h3 className="title-atelier text-primary">Buscar Consulta Anterior</h3>
          <button onClick={onClose} className="p-2 hover:bg-surface-high rounded-full transition-colors">
            <X className="w-6 h-6 text-high-contrast/40" />
          </button>
        </div>
        
        <div className="p-8 bg-surface-low border-b border-surface-container-high">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <input 
                type="date" 
                className="bg-white border border-surface-high rounded-lg text-xs font-bold text-high-contrast focus:ring-primary p-2"
                value={dateFilter.start}
                onChange={(e) => setDateFilter({ ...dateFilter, start: e.target.value })}
              />
            </div>
            <span className="text-high-contrast/20 text-xs font-bold">a</span>
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                className="bg-white border border-surface-high rounded-lg text-xs font-bold text-high-contrast focus:ring-primary p-2"
                value={dateFilter.end}
                onChange={(e) => setDateFilter({ ...dateFilter, end: e.target.value })}
              />
            </div>
            {(dateFilter.start || dateFilter.end) && (
              <button 
                onClick={() => setDateFilter({ start: '', end: '' })}
                className="text-xs font-bold text-red-500 hover:underline"
              >
                Limpiar Filtros
              </button>
            )}
          </div>
        </div>

        <div className="p-8 space-y-4 max-h-[50vh] overflow-y-auto no-scrollbar">
          {filteredConsultations.length > 0 ? (
            filteredConsultations.map((c) => (
              <button
                key={c.id}
                onClick={() => onSelect(c)}
                className="w-full text-left p-4 rounded-xl bg-white border border-surface-high hover:border-primary hover:shadow-md transition-all group"
              >
                <div className="flex justify-between items-start mb-2">
                  <p className="font-bold text-primary group-hover:text-secondary transition-colors">{c.title || "Consulta Médica"}</p>
                  <p className="text-[10px] font-black text-high-contrast/40 uppercase">{new Date(c.date?.toDate?.() || c.date).toLocaleDateString()}</p>
                </div>
                <p className="text-xs text-high-contrast/60 line-clamp-2">{c.diagnosis}</p>
              </button>
            ))
          ) : (
            <div className="text-center py-12">
              <History className="w-12 h-12 text-high-contrast/10 mx-auto mb-4" />
              <p className="text-high-contrast/40 font-bold">No se encontraron consultas</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
