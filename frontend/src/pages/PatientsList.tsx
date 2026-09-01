import React, { useState, useMemo } from 'react';
import { Search, Plus, FileText, ChevronDown, History, Edit3, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Patient } from '../types';
import { cn } from '../lib/utils';

export const PatientsList = ({ 
  patients, 
  onSelectPatient, 
  onAddPatient, 
  onEditPatient, 
  onDeletePatient, 
  onStartConsultation, 
  search, 
  onSearchChange,
  dateFilter,
  onDateFilterChange
}: { 
  patients: Patient[]; 
  onSelectPatient: (p: Patient) => void;
  onAddPatient: () => void;
  onEditPatient: (p: Patient) => void;
  onDeletePatient: (id: string) => void;
  onStartConsultation: (p: Patient) => void;
  search: string;
  onSearchChange: (s: string) => void;
  dateFilter: 'today' | 'week' | 'month' | 'all';
  onDateFilterChange: (f: 'today' | 'week' | 'month' | 'all') => void;
}) => {
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const sortedPatients = useMemo(() => {
    return [...patients].sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return dateB.getTime() - dateA.getTime();
    });
  }, [patients]);

  const filteredPatients = useMemo(() => {
    let filtered = sortedPatients.filter(p => 
      p.name.toLowerCase().includes(search.toLowerCase()) || 
      p.id.toLowerCase().includes(search.toLowerCase())
    );

    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(p => {
        if (!p.createdAt) return false;
        const createdAt = p.createdAt.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
        
        if (dateFilter === 'today') {
          return createdAt >= today;
        } else if (dateFilter === 'week') {
          const weekAgo = new Date(today);
          weekAgo.setDate(today.getDate() - 7);
          return createdAt >= weekAgo;
        } else if (dateFilter === 'month') {
          const monthAgo = new Date(today);
          monthAgo.setMonth(today.getMonth() - 1);
          return createdAt >= monthAgo;
        }
        return true;
      });
    }

    return filtered;
  }, [patients, search, dateFilter]);

  const filterLabels = {
    today: 'Hoy',
    week: 'Esta Semana',
    month: 'Este Mes',
    all: 'Todos'
  };

  const recentPatients = sortedPatients.slice(0, 6);

  return (
    <div className="p-4 md:p-10 space-y-8 md:space-y-12">
      {/* Zone 1: Agregar paciente. El buscador vive junto a la lista general,
          que es la sección que realmente filtra. */}
      <section>
        <div className="flex justify-end">
          <button
            onClick={onAddPatient}
            className="h-14 md:h-16 px-8 sidebar-gradient text-white rounded-2xl md:rounded-full font-bold flex items-center justify-center gap-3 shadow-lg hover:shadow-primary/20 transition-all active:scale-95"
          >
            <Plus className="w-6 h-6" />
            <span>Agregar Paciente</span>
          </button>
        </div>
      </section>

      {/* Zone 2: Recent Patients */}
      {recentPatients.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <h3 className="text-lg md:text-xl font-bold tracking-tight text-[#191970]">Vistos recientemente</h3>
            <div className="hidden sm:block h-[2px] flex-grow mx-8 bg-gradient-to-r from-outline-variant/20 to-transparent"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {recentPatients.map(patient => (
              <div key={patient.id} className="group bg-surface-container-lowest rounded-xl p-5 shadow-[0px_10px_30px_rgba(25,25,112,0.04)] hover:shadow-xl transition-all border border-outline-variant/10 flex flex-col justify-between h-44 md:h-48">
                <div className="flex items-start justify-between">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-primary/5 flex items-center justify-center text-primary font-bold text-lg md:text-xl border border-primary/10">
                      {patient.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h4 className="font-bold text-[#191970] text-base md:text-lg group-hover:text-primary transition-colors line-clamp-1">{patient.name}</h4>
                      <p className="text-[10px] md:text-xs font-bold text-outline-variant uppercase tracking-widest mt-0.5">{patient.age} años</p>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => onStartConsultation(patient)}
                  className="w-full h-10 md:h-12 rounded-lg bg-surface-container-low text-primary font-bold text-sm hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-2 group/btn"
                >
                  <FileText className="w-4 h-4 md:w-5 md:h-5" />
                  Nueva Consulta
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Zone 3: General List */}
      <section className="mb-20">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 md:mb-8">
          <h3 className="text-lg md:text-xl font-bold tracking-tight text-[#191970]">Lista General de Pacientes</h3>
          <div className="flex items-center gap-2 relative w-full sm:w-auto">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Filtrar:</span>
            <button 
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className="flex-grow sm:flex-grow-0 px-4 py-1.5 rounded-full bg-white text-xs font-bold text-[#191970] border border-outline-variant/30 flex items-center justify-between sm:justify-start gap-2 hover:bg-surface-container-low transition-colors"
            >
              {filterLabels[dateFilter]} <ChevronDown className={cn("w-4 h-4 transition-transform", showFilterMenu && "rotate-180")} />
            </button>

            <AnimatePresence>
              {showFilterMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowFilterMenu(false)} />
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-outline-variant/10 py-2 z-20"
                  >
                    {(['all', 'today', 'week', 'month'] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => {
                          onDateFilterChange(f);
                          setShowFilterMenu(false);
                        }}
                        className={cn(
                          "w-full px-4 py-2 text-left text-xs font-bold transition-colors hover:bg-surface-container-low",
                          dateFilter === f ? "text-primary bg-primary/5" : "text-on-surface-variant"
                        )}
                      >
                        {filterLabels[f]}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
        <div className="relative mb-6 md:mb-8">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-on-surface-variant w-5 h-5 md:w-6 md:h-6" />
          <input
            className="w-full h-14 md:h-16 pl-14 md:pl-16 pr-6 rounded-2xl md:rounded-full bg-surface-container-low border-none focus:ring-2 focus:ring-primary/10 focus:bg-white transition-all text-base md:text-lg font-medium placeholder:text-on-surface-variant/60"
            placeholder="Buscar por nombre o cédula..."
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-[0px_10px_40px_rgba(25,25,112,0.03)] border border-outline-variant/10">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left border-collapse">
              <thead>
              <tr className="bg-surface-container-low/50">
                <th className="px-8 py-5 text-[10px] font-extrabold text-outline-variant uppercase tracking-[0.2em]">Nombre del Paciente</th>
                <th className="px-8 py-5 text-[10px] font-extrabold text-outline-variant uppercase tracking-[0.2em]">Cédula / ID</th>
                <th className="px-8 py-5 text-[10px] font-extrabold text-outline-variant uppercase tracking-[0.2em]">Última Visita</th>
                <th className="px-8 py-5 text-[10px] font-extrabold text-outline-variant uppercase tracking-[0.2em] text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {filteredPatients.map(patient => (
                <tr key={patient.id} className="hover:bg-surface-container-low/30 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-xs font-bold text-primary">
                        {patient.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className="font-bold text-on-surface group-hover:text-primary">{patient.name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-sm font-semibold text-on-surface-variant">#{patient.id.slice(-8).toUpperCase()}</td>
                  <td className="px-8 py-6 text-sm font-semibold text-on-surface">
                    {patient.createdAt ? new Date(patient.createdAt?.toDate ? patient.createdAt.toDate() : patient.createdAt).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-100 translate-x-0 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-300 lg:translate-x-2 lg:group-hover:translate-x-0">
                      <button 
                        onClick={() => onSelectPatient(patient)}
                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-primary/5 rounded-lg text-primary transition-all border border-transparent hover:border-primary/10" 
                      >
                        <History className="w-4 h-4" />
                        <span className="font-bold uppercase tracking-widest text-[9px]">Historial</span>
                      </button>
                      <button 
                        onClick={() => onEditPatient(patient)}
                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-secondary/5 rounded-lg text-secondary transition-all border border-transparent hover:border-secondary/10" 
                      >
                        <Edit3 className="w-4 h-4" />
                        <span className="font-bold uppercase tracking-widest text-[9px]">Editar</span>
                      </button>
                      <button 
                        onClick={() => onDeletePatient(patient.id)}
                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-error/5 rounded-lg text-error transition-all border border-transparent hover:border-error/10" 
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="font-bold uppercase tracking-widest text-[9px]">Eliminar</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div className="px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface-container-low/20">
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Mostrando 1-{filteredPatients.length} de {patients.length} pacientes</p>
            <div className="flex items-center gap-2">
              <button className="w-10 h-10 flex items-center justify-center rounded-lg border border-outline-variant/30 text-on-surface-variant hover:bg-white transition-all">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary text-white font-bold shadow-md">1</button>
              <button className="w-10 h-10 flex items-center justify-center rounded-lg border border-outline-variant/30 text-[#191970] font-bold hover:bg-white transition-all">2</button>
              <button className="w-10 h-10 flex items-center justify-center rounded-lg border border-outline-variant/30 text-[#191970] font-bold hover:bg-white transition-all">3</button>
              <button className="w-10 h-10 flex items-center justify-center rounded-lg border border-outline-variant/30 text-on-surface-variant hover:bg-white transition-all">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
