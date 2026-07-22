import React, { useMemo } from 'react';
import { CalendarDays, Users, History, FileText, Stethoscope, UserPlus } from 'lucide-react';
import { Patient, UserProfile } from '../types';

export const Dashboard = ({ 
  patients, 
  onSelectPatient, 
  onAddPatient, 
  onNewConsultation, 
  onStartConsultation, 
  search, 
  onSearchChange, 
  user, 
  setActiveTab, 
  consultationsToday, 
  totalConsultations 
}: {
  patients: Patient[];
  onSelectPatient: (p: Patient) => void;
  onAddPatient: () => void;
  onNewConsultation: () => void;
  onStartConsultation: (p: Patient) => void;
  search: string;
  onSearchChange: (s: string) => void;
  user: UserProfile | null;
  setActiveTab: (tab: string) => void;
  consultationsToday: number;
  totalConsultations: number;
}) => {
  const sortedPatients = useMemo(() => {
    return [...patients].sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return dateB.getTime() - dateA.getTime();
    });
  }, [patients]);

  const filteredPatients = sortedPatients.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.id.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 4);

  const patientsThisMonth = patients.filter(p => {
    if (!p.createdAt) return false;
    const createdAt = p.createdAt?.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
    const now = new Date();
    return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear();
  }).length;

  const lastPatient = sortedPatients.length > 0 ? sortedPatients[0] : null;

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      {/* Banner Section */}
      <section className="relative h-[200px] md:h-[280px] rounded-xl overflow-hidden shadow-xl">
        <img 
          src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=1000" 
          alt="Clinical Atelier Header" 
          className="absolute inset-0 w-full h-full object-cover" 
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/50 to-transparent flex items-center px-6 md:px-12">
          <div className="max-w-xl space-y-2 md:space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
              <span className="w-2 h-2 bg-secondary rounded-full"></span>
              <span className="text-[8px] md:text-[10px] text-white uppercase font-bold tracking-widest">Sistema Operativo v2.4</span>
            </div>
            <h2 className="text-3xl md:text-[4rem] font-bold text-white leading-tight tracking-tight">
              {user?.gender === 'female' ? "Bienvenida, Dra. " : "Bienvenido, Dr. "}
              <span className="block md:inline">
                {user?.displayName ? (
                  (() => {
                    const parts = user.displayName.trim().split(/\s+/);
                    return parts.length >= 2 ? `${parts[0]} ${parts[1]}` : parts[0];
                  })()
                ) : "Especialista"}
              </span>
            </h2>
            <p className="text-sm md:text-xl text-white/80 font-medium">Gestione sus consultas con precisión digital.</p>
          </div>
        </div>
      </section>

      {/* Metrics Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Consultas Hoy */}
        <div className="bg-surface-container-lowest p-6 rounded-xl border-l-4 border-primary shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-primary-fixed rounded-lg">
              <CalendarDays className="text-primary w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">+12% vs ayer</span>
          </div>
          <p className="text-on-surface-variant uppercase tracking-widest font-bold text-[10px]">Consultas Hoy</p>
          <h3 className="text-3xl font-extrabold text-on-surface mt-1">{consultationsToday}</h3>
          <div className="mt-4 h-1 bg-surface-container-high rounded-full overflow-hidden">
            <div className="h-full bg-primary w-[70%]"></div>
          </div>
        </div>

        {/* Pacientes Este Mes */}
        <div className="bg-surface-container-lowest p-6 rounded-xl border-l-4 border-secondary shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-secondary-container rounded-lg">
              <Users className="text-secondary w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">+5.2%</span>
          </div>
          <p className="text-on-surface-variant uppercase tracking-widest font-bold text-[10px]">Pacientes Este Mes</p>
          <h3 className="text-3xl font-extrabold text-on-surface mt-1">{patientsThisMonth}</h3>
          <div className="mt-4 flex gap-1 items-end h-8">
            <div className="w-2 bg-secondary/20 h-[40%] rounded-t"></div>
            <div className="w-2 bg-secondary/30 h-[60%] rounded-t"></div>
            <div className="w-2 bg-secondary/40 h-[50%] rounded-t"></div>
            <div className="w-2 bg-secondary/60 h-[80%] rounded-t"></div>
            <div className="w-2 bg-secondary h-full rounded-t"></div>
          </div>
        </div>

        {/* Último Paciente */}
        <div className="bg-surface-container-lowest p-6 rounded-xl border-l-4 border-primary shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-primary-fixed rounded-lg">
              <History className="text-primary w-5 h-5" />
            </div>
          </div>
          <p className="text-on-surface-variant uppercase tracking-widest font-bold text-[10px]">Último Paciente Visto</p>
          <h3 className="text-xl font-bold text-on-surface mt-1 truncate">{lastPatient?.name || "No hay pacientes"}</h3>
          <p className="text-xs text-on-surface-variant mt-1">Hace pocos minutos</p>
        </div>

        {/* Documentos Generados */}
        <div className="bg-surface-container-lowest p-6 rounded-xl border-l-4 border-primary shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-primary-fixed rounded-lg">
              <FileText className="text-primary w-5 h-5" />
            </div>
          </div>
          <p className="text-on-surface-variant uppercase tracking-widest font-bold text-[10px]">Total Consultas</p>
          <h3 className="text-3xl font-extrabold text-on-surface mt-1">{totalConsultations}</h3>
          <p className="text-xs text-on-surface-variant mt-1">Registradas en el sistema</p>
        </div>
      </section>

      {/* Quick Actions & Recent Patients Grid */}
      <section className="grid grid-cols-12 gap-8">
        {/* Recent Patients */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight text-on-surface">Pacientes recientes</h2>
            <button 
              onClick={() => setActiveTab('patients')}
              className="text-primary text-sm font-bold hover:underline"
            >
              Ver todos los registros
            </button>
          </div>
          <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left border-collapse">
                <thead className="bg-surface-container-low">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Paciente</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Última Visita</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high">
                {filteredPatients.map(patient => (
                  <tr key={patient.id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold">
                          {patient.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-on-surface">{patient.name}</p>
                          <p className="text-xs text-on-surface-variant">ID: #{patient.id.slice(-6).toUpperCase()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-on-surface">Reciente</p>
                      <p className="text-xs text-on-surface-variant">Chequeo General</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => onSelectPatient(patient)}
                          className="px-4 py-1.5 border border-outline-variant text-primary text-xs font-bold rounded hover:bg-primary-fixed transition-colors"
                        >
                          Ver Expediente
                        </button>
                        <button 
                          onClick={() => onStartConsultation(patient)}
                          className="px-4 py-1.5 bg-primary text-white text-xs font-bold rounded hover:bg-primary-container transition-colors"
                        >
                          Nueva Consulta
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <h2 className="text-2xl font-bold tracking-tight text-on-surface">Acciones rápidas</h2>
          <div className="grid grid-cols-1 gap-4">
            <button 
              onClick={onNewConsultation}
              className="group flex items-center gap-6 p-6 bg-gradient-to-br from-primary to-[#2a2a9a] rounded-xl text-white shadow-lg hover:shadow-primary/20 transition-all hover:-translate-y-1"
            >
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md group-hover:scale-110 transition-transform">
                <Stethoscope className="w-8 h-8 text-white" />
              </div>
              <div className="text-left">
                <h4 className="text-xl font-bold">Nueva Consulta</h4>
                <p className="text-white/70 text-sm">Iniciar registro clínico ahora</p>
              </div>
            </button>
            <button 
              onClick={onAddPatient}
              className="group flex items-center gap-6 p-6 bg-surface-container-lowest border border-outline-variant rounded-xl text-on-surface shadow-sm hover:shadow-md transition-all hover:-translate-y-1"
            >
              <div className="w-14 h-14 rounded-full bg-primary-fixed flex items-center justify-center group-hover:scale-110 transition-transform">
                <UserPlus className="w-8 h-8 text-primary" />
              </div>
              <div className="text-left">
                <h4 className="text-xl font-bold">Agregar Paciente</h4>
                <p className="text-on-surface-variant text-sm">Crear nuevo expediente digital</p>
              </div>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
