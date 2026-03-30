/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  type User as FirebaseUser 
} from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  addDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { 
  auth, 
  db, 
  googleProvider, 
  OperationType, 
  handleFirestoreError,
  testConnection 
} from './lib/firebase';
import { 
  generateClinicalDocument, 
  analyzeMedicalImage, 
  createChat 
} from './lib/gemini';
import { cn } from './lib/utils';
import { 
  LayoutDashboard, 
  FileText, 
  Bot, 
  Search, 
  LogOut, 
  Plus, 
  Mic, 
  MicOff, 
  Sparkles, 
  Stethoscope, 
  Users, 
  BadgeCheck, 
  ArrowRight, 
  History, 
  Activity, 
  Settings, 
  Camera, 
  Upload, 
  Download, 
  Printer, 
  ChevronRight, 
  ChevronLeft,
  ChevronDown,
  Trash2, 
  Eye, 
  Edit3, 
  X,
  MessageSquare, 
  ShieldCheck, 
  Gavel, 
  Paperclip, 
  Send, 
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  CalendarDays,
  Calendar,
  Copy,
  UserPlus,
  BriefcaseMedical,
  Lightbulb,
  QrCode,
  PenTool,
  CreditCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import PaymentPlans from './components/PaymentPlans';

const ADMIN_EMAILS = ["androxus512rbm@gmail.com", "luise.sb5845@gmail.com"];

// --- Types ---

interface Patient {
  id: string;
  name: string;
  gender: string;
  age: number;
  bloodType: string;
  allergies: string;
  height: number;
  weight: number;
  bmi: number;
  doctorUid: string;
  createdAt: any;
}

interface Consultation {
  id: string;
  patientId: string;
  doctorUid: string;
  date: any;
  type: string;
  title: string;
  findings: string;
  diagnosis: string;
  plan: string;
  vitals: {
    bloodPressure: string;
    heartRate: number;
  };
}

interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  specialty?: string;
  professionalId?: string;
  bio?: string;
  phone?: string;
  officeLocation?: string;
  role?: 'doctor' | 'admin';
  plan?: 'free' | 'pro' | 'whitelisted';
  usageThisMonth?: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: any;
}

// --- Components ---

const Sidebar = ({ activeTab, setActiveTab, user, onLogout, isAdmin }: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: UserProfile | null;
  onLogout: () => void;
  isAdmin: boolean;
}) => {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'patients', label: 'Pacientes', icon: Users },
    { id: 'generate', label: 'Generar Documento', icon: FileText },
    { id: 'assistant', label: 'Asistente de IA', icon: Bot },
    { id: 'plans', label: 'Planes de Pago', icon: CreditCard },
    ...(isAdmin ? [{ id: 'admin', label: 'Gestión de Usuarios', icon: ShieldCheck }] : []),
  ];

  return (
    <aside className="fixed inset-y-0 left-0 flex flex-col justify-between py-6 px-4 bg-gradient-to-br from-[#191970] to-[#083825] h-screen w-64 overflow-y-auto z-50 shadow-[0px_10px_30px_rgba(25,25,112,0.08)] no-scrollbar">
      <div className="space-y-8">
        <div className="flex items-center gap-4 px-4">
          <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-md border border-white/10 shadow-lg">
            <BriefcaseMedical className="w-7 h-7 text-white fill-white/20" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white leading-none">MediFácil</h1>
            <p className="text-[9px] uppercase tracking-[0.25em] text-white/40 font-extrabold mt-1">THE CLINICAL ATELIER</p>
          </div>
        </div>
        <nav className="space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 transition-all duration-200",
                activeTab === tab.id 
                  ? "bg-white/10 backdrop-blur-md rounded-lg text-white font-bold scale-95 active:scale-90" 
                  : "text-white/70 hover:text-white hover:bg-white/5"
              )}
            >
              <tab.icon className={cn("w-5 h-5", activeTab === tab.id && "fill-current")} />
              <span className="text-sm">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>
      <div className="space-y-4">
        <div className="px-4 flex items-center gap-3">
          <div className="relative">
            <img 
              src={user?.photoURL || "https://picsum.photos/seed/doctor/200"} 
              alt="Doctor Portrait" 
              className="w-10 h-10 rounded-full object-cover border-2 border-white/20"
            />
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-secondary border-2 border-[#191970] rounded-full"></div>
          </div>
          <div>
            <p className="text-sm font-bold text-white">{user?.displayName || "Dr. Julián Rivera"}</p>
            <p className="text-[10px] text-white/50 uppercase tracking-tighter">{user?.specialty || "Cardiólogo Senior"}</p>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
};

const Header = ({ title, subtitle, search, onSearchChange, setActiveTab }: { title: string; subtitle?: string; search: string; onSearchChange: (s: string) => void; setActiveTab: (t: string) => void }) => {
  return (
    <header className="sticky top-0 z-40 flex justify-between items-center w-full px-8 py-4 bg-white/70 backdrop-blur-xl transition-all focus-within:ring-1 ring-[#191970]/15">
      <div className="flex items-center flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            className="w-full bg-surface-container-high border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary-container placeholder:text-slate-400 outline-none" 
            placeholder="Buscar pacientes, documentos o citas..." 
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button 
          onClick={() => setActiveTab('settings')}
          className="hover:bg-slate-100 rounded-full p-2 transition-all"
        >
          <Settings className="w-6 h-6 text-on-surface-variant" />
        </button>
      </div>
    </header>
  );
};

const PatientsList = ({ 
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
    <div className="p-10 space-y-12">
      {/* Zone 1: Search and Add */}
      <section>
        <div className="flex items-center gap-6">
          <div className="relative flex-grow">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-on-surface-variant w-6 h-6" />
            <input 
              className="w-full h-16 pl-16 pr-6 rounded-full bg-surface-container-low border-none focus:ring-2 focus:ring-primary/10 focus:bg-white transition-all text-lg font-medium placeholder:text-on-surface-variant/60" 
              placeholder="Buscar por nombre o cédula..." 
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
          <button 
            onClick={onAddPatient}
            className="h-16 px-8 bg-gradient-to-r from-[#191970] to-[#083825] text-white rounded-full font-bold flex items-center gap-3 shadow-lg hover:shadow-primary/20 transition-all active:scale-95"
          >
            <Plus className="w-6 h-6" />
            <span>Agregar Paciente</span>
          </button>
        </div>
      </section>

      {/* Zone 2: Recent Patients */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-bold tracking-tight text-[#191970]">Vistos recientemente</h3>
          <div className="h-[2px] flex-grow mx-8 bg-gradient-to-r from-outline-variant/20 to-transparent"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recentPatients.map(patient => (
            <div key={patient.id} className="group bg-surface-container-lowest rounded-xl p-5 shadow-[0px_10px_30px_rgba(25,25,112,0.04)] hover:shadow-xl transition-all border border-outline-variant/10 flex flex-col justify-between h-48">
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  <div className="w-14 h-14 rounded-full bg-primary/5 flex items-center justify-center text-primary font-bold text-xl border border-primary/10">
                    {patient.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h4 className="font-bold text-[#191970] text-lg group-hover:text-primary transition-colors">{patient.name}</h4>
                    <p className="text-xs font-bold text-outline-variant uppercase tracking-widest mt-0.5">{patient.age} años</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Última consulta</p>
                  <p className="text-sm font-semibold text-[#191970]">Reciente</p>
                </div>
              </div>
              <button 
                onClick={() => onStartConsultation(patient)}
                className="w-full h-12 rounded-lg bg-surface-container-low text-primary font-bold text-sm hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-2 group/btn"
              >
                <FileText className="w-5 h-5" />
                Nueva Consulta
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Zone 3: General List */}
      <section className="mb-20">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-bold tracking-tight text-[#191970]">Lista General de Pacientes</h3>
          <div className="flex items-center gap-2 relative">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Filtrar por:</span>
            <button 
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className="px-4 py-1.5 rounded-full bg-white text-xs font-bold text-[#191970] border border-outline-variant/30 flex items-center gap-2 hover:bg-surface-container-low transition-colors"
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
        <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-[0px_10px_40px_rgba(25,25,112,0.03)] border border-outline-variant/10">
          <table className="w-full text-left border-collapse">
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
                    <div className="flex items-center justify-end gap-3">
                      <button 
                        onClick={() => onSelectPatient(patient)}
                        className="p-2 hover:bg-primary/5 rounded-full text-primary transition-colors" 
                        title="Ver Historial"
                      >
                        <History className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => onEditPatient(patient)}
                        className="p-2 hover:bg-secondary/5 rounded-full text-secondary transition-colors" 
                        title="Editar"
                      >
                        <Edit3 className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => onDeletePatient(patient.id)}
                        className="p-2 hover:bg-error/5 rounded-full text-error transition-colors" 
                        title="Eliminar"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Pagination */}
          <div className="px-8 py-6 flex items-center justify-between bg-surface-container-low/20">
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

const Dashboard = ({ patients, onSelectPatient, onAddPatient, onNewConsultation, onStartConsultation, search, onSearchChange, user, setActiveTab }: { 
  patients: Patient[]; 
  onSelectPatient: (p: Patient) => void;
  onAddPatient: () => void;
  onNewConsultation: () => void;
  onStartConsultation: (p: Patient) => void;
  search: string;
  onSearchChange: (s: string) => void;
  user: UserProfile | null;
  setActiveTab: (tab: string) => void;
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
    <div className="p-8 space-y-8">
      {/* Banner Section */}
      <section className="relative h-[280px] rounded-xl overflow-hidden shadow-xl">
        <img 
          src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=1000" 
          alt="Clinical Atelier Header" 
          className="absolute inset-0 w-full h-full object-cover" 
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 via-primary/40 to-transparent flex items-center px-12">
          <div className="max-w-xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
              <span className="w-2 h-2 bg-secondary rounded-full"></span>
              <span className="text-[10px] text-white uppercase font-bold tracking-widest">Sistema Operativo v2.4</span>
            </div>
            <h2 className="text-5xl font-extrabold text-white tracking-tight">Bienvenido, {user?.displayName || "Dr. Julián Rivera"}</h2>
            <p className="text-xl text-white/80 font-medium">Gestione sus consultas con la precisión de un atelier digital.</p>
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
          <h3 className="text-3xl font-extrabold text-on-surface mt-1">14</h3>
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
          <p className="text-on-surface-variant uppercase tracking-widest font-bold text-[10px]">Documentos Generados</p>
          <h3 className="text-3xl font-extrabold text-on-surface mt-1">28</h3>
          <p className="text-xs text-on-surface-variant mt-1">Pendientes de firma: 2</p>
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
            <table className="w-full text-left border-collapse">
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

const DocumentGenerator = ({ user }: { user: UserProfile | null }) => {
  const [dictation, setDictation] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [document, setDocument] = useState<any>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'es-ES';

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            setDictation(prev => prev + event.results[i][0].transcript);
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
      };
    }
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
    setIsRecording(!isRecording);
  };

  const handleGenerate = async () => {
    if (!dictation) return;
    setIsGenerating(true);
    try {
      const doc = await generateClinicalDocument(dictation, `Doctor: ${user?.displayName}, Specialty: ${user?.specialty}`);
      setDocument(doc);
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="grid grid-cols-12 gap-8 items-start">
      {/* Left Column: Input Selection */}
      <div className="col-span-12 lg:col-span-5 space-y-8">
        <section className="space-y-6">
          <header>
            <h3 className="font-headline text-3xl font-extrabold text-primary-container tracking-tight">Atelier de Creación</h3>
            <p className="text-on-surface-variant mt-2">Defina el origen de su documento clínico para que nuestra IA estructure la consulta.</p>
          </header>
          <div className="space-y-4">
            {/* Option 1: Document Reference */}
            <div 
              onClick={() => document.getElementById('file-upload-doc')?.click()}
              className="group relative p-6 bg-surface-container-low hover:bg-surface-container-lowest transition-all duration-300 rounded-xl cursor-pointer shadow-sm hover:shadow-md border border-transparent hover:border-primary-container/10"
            >
              <input 
                id="file-upload-doc"
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) alert(`Archivo seleccionado: ${file.name}. La IA analizará este documento.`);
                }}
              />
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary-container text-white flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-primary-container">Documento de Referencia</h4>
                  <p className="text-sm text-on-surface-variant mt-1">Cargue una historia previa, examen de laboratorio o informe externo.</p>
                  <div className="mt-4 flex items-center gap-2 text-primary-container font-semibold text-sm">
                    <span>Seleccionar archivo</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
            {/* Option 2: Idea Base */}
            <div className="p-6 bg-surface-container-lowest rounded-xl shadow-[0px_10px_30px_rgba(25,25,112,0.04)] border-2 border-primary-container/5 space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-secondary text-white flex items-center justify-center">
                  <Lightbulb className="w-6 h-6 fill-white/20" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-primary-container">Idea Base / Dictado</h4>
                  <p className="text-sm text-on-surface-variant mt-1">Describa brevemente el propósito o use el dictado por voz para la IA.</p>
                </div>
              </div>
              <textarea 
                className="w-full bg-surface-container-low border-none rounded-lg p-4 text-sm focus:ring-2 focus:ring-secondary/20 transition-all resize-none" 
                placeholder="Ej: 'Necesito una orden de interconsulta para cardiología por sospecha de arritmia...'" 
                rows={4}
                value={dictation}
                onChange={(e) => setDictation(e.target.value)}
              />
              <div className="flex justify-between items-center">
                <button 
                  onClick={toggleRecording}
                  className={cn(
                    "flex items-center gap-2 text-secondary hover:bg-secondary/5 px-3 py-1.5 rounded-full transition-colors font-medium text-xs",
                    isRecording && "bg-red-500/10 text-red-500"
                  )}
                >
                  {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  <span>{isRecording ? "Detener Dictado" : "Iniciar Dictado"}</span>
                </button>
                <button 
                  onClick={handleGenerate}
                  disabled={isGenerating || !dictation}
                  className="bg-gradient-to-r from-primary-container to-secondary text-white px-6 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 hover:scale-[1.02] active:scale-95 transition-transform shadow-lg shadow-primary-container/20 disabled:opacity-50"
                >
                  {isGenerating ? <Activity className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>Generar con IA</span>
                </button>
              </div>
            </div>
          </div>
        </section>
        {/* Status Panel */}
        <div className="p-6 bg-white/70 backdrop-blur-md rounded-xl border border-white/40 shadow-sm">
          <h5 className="text-[10px] uppercase font-extrabold tracking-widest text-on-surface-variant mb-4">Métricas de Precisión IA</h5>
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <span className="text-sm font-medium">Contexto Médico</span>
              <span className="text-xs font-bold text-secondary">98% Óptimo</span>
            </div>
            <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
              <div className="h-full bg-secondary w-[98%] rounded-full"></div>
            </div>
            <div className="flex justify-between items-end">
              <span className="text-sm font-medium">Terminología Clínica</span>
              <span className="text-xs font-bold text-primary-container">Personalizada</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Document Preview / Template */}
      <div className="col-span-12 lg:col-span-7">
        <div className="bg-white rounded-xl shadow-[0px_20px_60px_rgba(0,0,0,0.05)] min-h-[800px] flex flex-col border border-primary-container/5 overflow-hidden">
          {/* Editor Toolbar */}
          <div className="bg-surface-container-low px-8 py-4 flex items-center justify-between border-b border-surface-container-high">
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold text-on-surface-variant bg-surface-container-highest px-3 py-1 rounded-full">BORRADOR IA</span>
              <h4 className="text-sm font-bold text-primary-container">Plantilla: Informe de Interconsulta V.1</h4>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => window.print()} className="p-2 hover:bg-white rounded-lg transition-colors text-on-surface-variant">
                <Printer className="w-5 h-5" />
              </button>
              <button 
                onClick={() => {
                  const content = `
                    MediFácil - Informe de Interconsulta
                    Paciente: ${document?.patientName || "Juan Alberto Pérez"}
                    Fecha: ${new Date().toLocaleDateString()}
                    Hallazgos: ${document?.findings || "N/A"}
                    Diagnóstico: ${document?.diagnosis || "N/A"}
                    Plan: ${document?.plan || "N/A"}
                  `;
                  const blob = new Blob([content], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `informe_${Date.now()}.txt`;
                  a.click();
                }} 
                className="p-2 hover:bg-white rounded-lg transition-colors text-on-surface-variant"
              >
                <Download className="w-5 h-5" />
              </button>
              <div className="w-px h-6 bg-surface-container-highest mx-2"></div>
              <button 
                onClick={() => {
                  setDocument(null);
                  setDictation('');
                }}
                className="bg-primary-container text-white px-5 py-2 rounded-lg font-bold text-sm"
              >
                Finalizar
              </button>
            </div>
          </div>
          {/* Document Body */}
          <div className="flex-1 p-16 space-y-12">
            {/* Header Section */}
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="font-black text-2xl text-primary-container tracking-tighter">MediFácil</p>
                <p className="text-[10px] text-on-surface-variant tracking-widest uppercase">Centro de Especialidades Avanzadas</p>
              </div>
              <div className="text-right space-y-1">
                <div className="w-24 h-24 bg-surface-container-low rounded-lg ml-auto flex items-center justify-center text-on-surface-variant/30">
                  <QrCode className="w-12 h-12" />
                </div>
                <p className="text-[9px] text-on-surface-variant mt-2 font-mono">ID-DOC: 4402-2910-MF</p>
              </div>
            </div>
            {/* Editable Fields Grid */}
            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest">Nombre del Paciente</label>
                  <div className="h-10 px-0 border-b-2 border-surface-container-high flex items-center">
                    <input className="w-full bg-transparent border-none p-0 focus:ring-0 font-bold text-primary-container" type="text" defaultValue={document?.patientName || "Juan Alberto Pérez"} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest">Fecha de Consulta</label>
                  <div className="h-10 px-0 border-b-2 border-surface-container-high flex items-center">
                    <input className="w-full bg-transparent border-none p-0 focus:ring-0 font-medium text-on-surface" type="text" defaultValue={new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })} />
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest">Motivo de Referencia / Hallazgos</label>
                <div className="p-6 bg-surface-container-low rounded-xl border-l-4 border-secondary/40">
                  <p className="text-on-surface text-sm leading-relaxed italic">
                    {document?.findings || '"Paciente masculino de 45 años que presenta cuadro clínico de palpitaciones recurrentes. Durante la exploración se detecta soplo sistólico grado II/IV en foco mitral. Se requiere valoración por sub-especialidad para ecocardiograma doppler..."'}
                  </p>
                </div>
                <p className="text-[9px] text-secondary font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Texto autogenerado basado en idea base. Click para editar.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest">Diagnóstico Presuntivo</label>
                  <div className="h-10 px-0 border-b-2 border-surface-container-high flex items-center">
                    <input className="w-full bg-transparent border-none p-0 focus:ring-0 font-medium text-on-surface" placeholder="I49.9 Arritmia cardíaca, no especificada" type="text" defaultValue={document?.diagnosis} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest">Plan de Manejo Inmediato</label>
                  <div className="min-h-[100px] py-4 px-0 border-b-2 border-surface-container-high">
                    <textarea className="w-full bg-transparent border-none p-0 focus:ring-0 text-sm leading-relaxed" placeholder="Indicar medicación o medidas preventivas..." rows={3} defaultValue={document?.plan}></textarea>
                  </div>
                </div>
              </div>
            </div>
            {/* Footer Signature */}
            <div className="pt-12 mt-12 border-t border-surface-container-high flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center">
                  <PenTool className="w-6 h-6 text-on-surface-variant" />
                </div>
                <div>
                  <p className="text-sm font-bold text-primary-container">{user?.displayName || "Dr. Julián Rivera"}</p>
                  <p className="text-[10px] text-on-surface-variant uppercase font-medium">Registro Médico: 882910-AR</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-on-surface-variant leading-tight">Documento verificado digitalmente por el sistema MediFácil AI v.2.4</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AIAssistant = ({ user }: { user: UserProfile | null }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const chatRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatRef.current = createChat();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input && !image) return;
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      let responseText = '';
      if (image) {
        responseText = await analyzeMedicalImage(image.split(',')[1], input || "Analyze this image.");
        setImage(null);
      } else {
        const result = await chatRef.current.sendMessage({ message: input });
        responseText = result.text;
      }

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: responseText,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="h-[calc(100vh-10rem)] flex flex-col bg-surface-low overflow-hidden rounded-2xl">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-10 py-8 space-y-10 no-scrollbar">
        <div className="max-w-4xl mx-auto text-center space-y-4 mb-12">
          <h2 className="title-atelier text-primary">Clinical Assistant</h2>
          <p className="body-atelier text-high-contrast/60 max-w-xl mx-auto">Verificación de pacientes, recomendaciones médicas basadas en evidencia y gestión automatizada de documentos en tiempo real.</p>
        </div>

        <div className="max-w-5xl mx-auto space-y-8">
          {messages.map((msg) => (
            <div key={msg.id} className={cn("flex gap-4 items-start", msg.role === 'user' ? "flex-row-reverse" : "")}>
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-lg",
                msg.role === 'model' ? "sidebar-gradient" : "bg-surface-high"
              )}>
                {msg.role === 'model' ? <Bot className="text-white w-5 h-5" /> : <UserIcon className="text-primary w-5 h-5" />}
              </div>
              <div className={cn(
                "p-6 rounded-2xl shadow-sm max-w-[85%]",
                msg.role === 'model' 
                  ? "bg-white/70 backdrop-blur-xl border border-white/40 rounded-tl-none" 
                  : "bg-primary text-white rounded-tr-none"
              )}>
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-full sidebar-gradient flex items-center justify-center shrink-0 shadow-lg">
                <Bot className="text-white w-5 h-5 animate-pulse" />
              </div>
              <div className="bg-white/70 backdrop-blur-xl p-6 rounded-2xl rounded-tl-none border border-white/40 shadow-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-primary/20 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-primary/20 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2 h-2 bg-primary/20 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-10 pt-4 pb-12 bg-surface-low">
        <div className="max-w-5xl mx-auto">
          {image && (
            <div className="mb-4 relative inline-block">
              <img src={image} alt="Preview" className="h-20 w-20 object-cover rounded-lg border-2 border-primary" />
              <button 
                onClick={() => setImage(null)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
          <div className="relative flex items-center gap-4 bg-white p-2 rounded-xl shadow-xl border border-white/80">
            <label className="p-2 text-high-contrast/40 hover:text-primary transition-colors cursor-pointer">
              <Paperclip className="w-5 h-5" />
              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
            </label>
            <input 
              className="flex-1 py-3 text-high-contrast bg-transparent border-none focus:ring-0 outline-none placeholder:text-high-contrast/20" 
              placeholder="Describe una acción médica o solicita un análisis..." 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <button 
              onClick={handleSend}
              disabled={isTyping || (!input && !image)}
              className="btn-primary flex items-center gap-3 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              Generar con IA
            </button>
          </div>
          <div className="mt-4 flex justify-center gap-6">
            <p className="label-atelier text-high-contrast/40 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              Encriptación de Grado Médico AES-256
            </p>
            <p className="label-atelier text-high-contrast/40 flex items-center gap-1">
              <Gavel className="w-3 h-3" />
              Cumple con Normativa HIPAA / GDPR
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const SettingsScreen = ({ user, onUpdate }: { user: UserProfile | null; onUpdate: (u: Partial<UserProfile>) => void }) => {
  const [formData, setFormData] = useState<Partial<UserProfile>>(user || {});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
  };

  return (
    <div className="p-12 max-w-6xl mx-auto">
      <div className="mb-12 flex items-end justify-between">
        <div>
          <span className="label-atelier text-secondary mb-2 block uppercase tracking-widest">Perfil Profesional</span>
          <h2 className="display-atelier text-primary">Configuración</h2>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setFormData(user || {})}
            className="btn-secondary"
          >
            Descartar
          </button>
          <button 
            onClick={handleSubmit}
            className="btn-primary"
          >
            Guardar Cambios
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-4 space-y-8">
          <div className="card-atelier p-8 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-2 sidebar-gradient" />
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-6">
                <div className="w-32 h-32 rounded-full border-4 border-surface-low p-1 bg-white shadow-inner">
                  <img src={user?.photoURL || "https://picsum.photos/seed/doctor/200"} alt="Profile" className="w-full h-full rounded-full object-cover" />
                </div>
                <button className="absolute bottom-1 right-1 bg-white p-2 rounded-full shadow-ambient text-primary hover:text-secondary transition-colors">
                  <Camera className="w-4 h-4" />
                </button>
              </div>
              <h3 className="title-atelier text-primary mb-1">{user?.displayName}</h3>
              <p className="text-secondary font-bold text-sm mb-4 body-atelier">{user?.specialty || "Especialidad no definida"}</p>
              <div className="flex items-center gap-2 bg-surface-low px-4 py-1.5 rounded-full">
                <BadgeCheck className="w-4 h-4 text-primary fill-current" />
                <span className="label-atelier text-primary font-bold">ID: {user?.professionalId || "82910-MX"}</span>
              </div>
            </div>
          </div>
          <div className="bg-surface-high p-8 rounded-2xl">
            <h4 className="label-atelier text-primary mb-6 uppercase tracking-widest">Estado de Cuenta</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="body-atelier text-high-contrast/60">Plan Actual</span>
                <span className="body-atelier font-bold text-primary">Premium Atelier</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="body-atelier text-high-contrast/60">Próximo Pago</span>
                <span className="body-atelier font-bold text-primary">12 Oct, 2026</span>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-8 space-y-8">
          <section className="card-atelier p-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
                <UserIcon className="w-5 h-5" />
              </div>
              <h3 className="title-atelier text-primary">Datos Personales</h3>
            </div>
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="label-atelier text-high-contrast/40 px-1 uppercase tracking-widest text-[10px]">Nombre Completo</label>
                <input 
                  className="input-field w-full" 
                  type="text" 
                  value={formData.displayName || ''}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="label-atelier text-high-contrast/40 px-1 uppercase tracking-widest text-[10px]">Correo Electrónico</label>
                <input 
                  className="input-field w-full opacity-60 cursor-not-allowed" 
                  type="email" 
                  value={formData.email || ''}
                  readOnly
                />
              </div>
              <div className="space-y-2">
                <label className="label-atelier text-high-contrast/40 px-1 uppercase tracking-widest text-[10px]">Teléfono de Contacto</label>
                <input 
                  className="input-field w-full" 
                  type="tel" 
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="label-atelier text-high-contrast/40 px-1 uppercase tracking-widest text-[10px]">Ubicación de Consultorio</label>
                <input 
                  className="input-field w-full" 
                  type="text" 
                  value={formData.officeLocation || ''}
                  onChange={(e) => setFormData({ ...formData, officeLocation: e.target.value })}
                />
              </div>
            </div>
          </section>

          <section className="card-atelier p-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-lg bg-secondary/5 flex items-center justify-center text-secondary">
                <Stethoscope className="w-5 h-5" />
              </div>
              <h3 className="title-atelier text-primary">Especialidad Médica</h3>
            </div>
            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="label-atelier text-high-contrast/40 px-1 uppercase tracking-widest text-[10px]">Especialidad Principal</label>
                  <input 
                    className="input-field w-full" 
                    type="text" 
                    value={formData.specialty || ''}
                    onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="label-atelier text-high-contrast/40 px-1 uppercase tracking-widest text-[10px]">Cédula Profesional</label>
                  <input 
                    className="input-field w-full" 
                    type="text" 
                    value={formData.professionalId || ''}
                    onChange={(e) => setFormData({ ...formData, professionalId: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="label-atelier text-high-contrast/40 px-1 uppercase tracking-widest text-[10px]">Resumen Profesional (Bio)</label>
                <textarea 
                  className="input-field w-full resize-none" 
                  rows={4}
                  value={formData.bio || ''}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

const PatientProfile = ({ patient, onBack, onAddConsultation, onEditPatient, onDeletePatient, onDeleteConsultation, onCopyConsultation, onViewConsultation }: { 
  patient: Patient; 
  onBack: () => void;
  onAddConsultation: () => void;
  onEditPatient: () => void;
  onDeletePatient: (id: string) => void;
  onDeleteConsultation: (pId: string, cId: string) => void;
  onCopyConsultation: (c: Consultation) => void;
  onViewConsultation: (c: Consultation) => void;
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
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-2 mb-8 text-high-contrast/60 text-sm font-medium">
        <button onClick={onBack} className="hover:text-primary transition-colors body-atelier">Pacientes</button>
        <ChevronRight className="w-4 h-4" />
        <span className="text-primary font-bold body-atelier">{patient.name}</span>
      </div>

      <div className="card-atelier p-8 mb-10">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="relative flex-shrink-0">
            <div className="w-32 h-32 rounded-3xl bg-primary/10 flex items-center justify-center text-primary text-4xl font-black ring-4 ring-surface-low">
              {patient.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="absolute -bottom-2 -right-2 bg-secondary text-white p-1.5 rounded-lg shadow-lg">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex-grow">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="headline-atelier text-primary">{patient.name}</h2>
                <p className="label-atelier text-high-contrast/40 flex items-center gap-2 mt-1">
                  <span className="bg-primary/5 px-2 py-0.5 rounded text-primary">#{patient.id.slice(-8).toUpperCase()}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-surface-high" />
                  <span>{patient.gender}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-surface-high" />
                  <span>{patient.age} Años</span>
                </p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={onEditPatient}
                  className="btn-primary flex items-center gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  Modificar Perfil
                </button>
                <button 
                  onClick={() => onDeletePatient(patient.id)}
                  className="px-6 py-3 rounded-[0.5rem] bg-red-50 text-red-600 font-bold text-sm hover:bg-red-600 hover:text-white transition-all flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 bg-surface-low p-6 rounded-2xl">
              <div className="space-y-1">
                <p className="label-atelier text-high-contrast/40">Alergias</p>
                <p className="font-bold text-red-500 flex items-center gap-1 body-atelier">
                  <AlertCircle className="w-3 h-3" />
                  {patient.allergies || "Ninguna"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="label-atelier text-high-contrast/40">Grupo Sanguíneo</p>
                <p className="font-bold text-primary text-lg body-atelier">{patient.bloodType}</p>
              </div>
              <div className="space-y-1">
                <p className="label-atelier text-high-contrast/40">Estatura</p>
                <p className="font-bold text-high-contrast text-lg body-atelier">{patient.height} m</p>
              </div>
              <div className="space-y-1">
                <p className="label-atelier text-high-contrast/40">Peso</p>
                <p className="font-bold text-high-contrast text-lg body-atelier">{patient.weight} kg</p>
              </div>
              <div className="space-y-1">
                <p className="label-atelier text-high-contrast/40">IMC</p>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-high-contrast text-lg body-atelier">{patient.bmi}</p>
                  <span className="text-[10px] px-1.5 py-0.5 bg-secondary/10 text-secondary rounded font-black uppercase">Normal</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <h3 className="title-atelier text-primary">Historial de Consultas <span className="text-high-contrast/40 font-medium ml-2">({filteredConsultations.length})</span></h3>
        
        <div className="flex flex-wrap items-center gap-4 bg-surface-low p-2 rounded-xl border border-surface-high">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <input 
              type="date" 
              className="bg-transparent border-none text-xs font-bold text-high-contrast focus:ring-0 p-1"
              value={dateFilter.start}
              onChange={(e) => setDateFilter({ ...dateFilter, start: e.target.value })}
            />
          </div>
          <span className="text-high-contrast/20 text-xs font-bold">a</span>
          <div className="flex items-center gap-2">
            <input 
              type="date" 
              className="bg-transparent border-none text-xs font-bold text-high-contrast focus:ring-0 p-1"
              value={dateFilter.end}
              onChange={(e) => setDateFilter({ ...dateFilter, end: e.target.value })}
            />
          </div>
          {(dateFilter.start || dateFilter.end) && (
            <button 
              onClick={() => setDateFilter({ start: '', end: '' })}
              className="p-1 hover:bg-surface-high rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-red-500" />
            </button>
          )}
        </div>

        <button 
          onClick={onAddConsultation}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nueva Consulta
        </button>
      </div>

      <div className="space-y-6">
        {filteredConsultations.length > 0 ? (
          filteredConsultations.map((consultation) => (
            <div key={consultation.id} className="card-atelier p-8 group relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-secondary/20 group-hover:bg-secondary transition-colors" />
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-surface-low flex items-center justify-center text-primary">
                    <History className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="body-atelier font-bold text-primary">{consultation.title || "Consulta Médica"}</p>
                    <p className="label-atelier text-high-contrast/40">{new Date(consultation.date?.toDate?.() || consultation.date).toLocaleDateString()} • {new Date(consultation.date?.toDate?.() || consultation.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => onCopyConsultation(consultation)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-high-contrast/40 hover:text-secondary hover:bg-secondary/10 transition-all text-[10px] font-black uppercase tracking-wider"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar</span>
                  </button>
                  <button 
                    onClick={() => onViewConsultation(consultation)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-high-contrast/40 hover:text-primary hover:bg-primary/10 transition-all text-[10px] font-black uppercase tracking-wider"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Ver</span>
                  </button>
                  <button 
                    onClick={() => onDeleteConsultation(patient.id, consultation.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-high-contrast/40 hover:text-red-500 hover:bg-red-50 transition-all text-[10px] font-black uppercase tracking-wider"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Borrar</span>
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-2">
                  <p className="label-atelier text-high-contrast/40 uppercase tracking-widest text-[10px]">Hallazgos</p>
                  <p className="body-atelier text-high-contrast line-clamp-3">{consultation.findings}</p>
                </div>
                <div className="space-y-2">
                  <p className="label-atelier text-high-contrast/40 uppercase tracking-widest text-[10px]">Diagnóstico</p>
                  <p className="body-atelier text-high-contrast font-medium">{consultation.diagnosis}</p>
                </div>
                <div className="space-y-2">
                  <p className="label-atelier text-high-contrast/40 uppercase tracking-widest text-[10px]">Tratamiento</p>
                  <p className="body-atelier text-high-contrast">{consultation.plan}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="card-atelier p-16 text-center">
            <div className="w-20 h-20 bg-surface-low rounded-full flex items-center justify-center mx-auto mb-6 text-high-contrast/20">
              <History className="w-10 h-10" />
            </div>
            <h4 className="title-atelier text-primary mb-2">Sin Historial</h4>
            <p className="body-atelier text-high-contrast/60">No se han registrado consultas para este paciente aún.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const ConsultationSearchModal = ({ 
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

const AdminPanel = ({ currentUserEmail }: { currentUserEmail: string }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'users'));
        setUsers(snapshot.docs.map(d => ({ ...d.data() } as UserProfile)));
      } catch (err) {
        console.error('Error fetching users:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleChangePlan = async (uid: string, newPlan: 'free' | 'pro' | 'whitelisted') => {
    setUpdatingId(uid);
    try {
      await updateDoc(doc(db, 'users', uid), { plan: newPlan });
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, plan: newPlan } : u));
    } catch (err) {
      console.error('Error updating plan:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const getPlanBadge = (plan?: string) => {
    switch (plan) {
      case 'whitelisted': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'pro': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      default: return 'bg-white/10 text-white/60 border-white/20';
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-2 border-white/20 border-t-white rounded-full" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-high-contrast">Gestión de Usuarios</h2>
        <p className="text-white/50 text-sm mt-1">
          {users.length} usuarios registrados · Solo visible para el administrador
        </p>
      </div>

      <div className="space-y-3">
        {users.map(u => (
          <div
            key={u.uid}
            className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md"
          >
            <div className="flex items-center gap-3">
              <img
                src={u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName)}&background=191970&color=fff`}
                alt={u.displayName}
                className="w-10 h-10 rounded-full object-cover border border-white/20"
              />
              <div>
                <p className="text-sm font-semibold text-high-contrast">{u.displayName}</p>
                <p className="text-xs text-white/50">{u.email}</p>
                {u.specialty && (
                  <p className="text-xs text-white/30">{u.specialty}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className={`text-xs px-2 py-1 rounded-full border font-medium ${getPlanBadge(u.plan)}`}>
                {u.plan || 'free'}
              </span>

              {u.email !== currentUserEmail && (
                <select
                  disabled={updatingId === u.uid}
                  value={u.plan || 'free'}
                  onChange={(e) => handleChangePlan(u.uid, e.target.value as any)}
                  className="text-xs bg-white/10 border border-white/20 rounded-lg px-2 py-1.5 text-white/80 focus:outline-none focus:border-white/40 disabled:opacity-50 cursor-pointer"
                >
                  <option value="free" className="bg-[#191970]">Free</option>
                  <option value="pro" className="bg-[#191970]">Pro</option>
                  <option value="whitelisted" className="bg-[#191970]">Whitelisted ✓</option>
                </select>
              )}

              {u.email === currentUserEmail && (
                <span className="text-xs text-white/30 italic">Tú (admin)</span>
              )}

              {updatingId === u.uid && (
                <div className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [search, setSearch] = useState('');
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [showAddConsultation, setShowAddConsultation] = useState(false);
  const [showEditPatient, setShowEditPatient] = useState(false);
  const [showPatientSearchModal, setShowPatientSearchModal] = useState(false);
  const [showConsultationSearchModal, setShowConsultationSearchModal] = useState(false);
  const [showViewConsultation, setShowViewConsultation] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfig, setDeleteConfig] = useState<{ message: string, onConfirm: () => void } | null>(null);
  const [patientDateFilter, setPatientDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('all');

  const isAdmin = profile?.email ? ADMIN_EMAILS.includes(profile.email) : false;

  // Form states
  const [newPatient, setNewPatient] = useState({
    name: '',
    age: 30,
    gender: 'Masculino',
    bloodType: 'O+',
    allergies: '',
    height: 1.75,
    weight: 70
  });

  const [newConsultation, setNewConsultation] = useState({
    type: 'Consulta General',
    title: '',
    findings: '',
    diagnosis: '',
    plan: '',
    vitals: {
      bloodPressure: '120/80',
      heartRate: 72
    }
  });

  useEffect(() => {
    testConnection();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setProfile(userDoc.data() as UserProfile);
        } else {
          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || 'Doctor',
            email: firebaseUser.email || '',
            photoURL: firebaseUser.photoURL || '',
            plan: 'free',
          };
          await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (user) {
      const q = query(collection(db, 'patients'), where('doctorUid', '==', user.uid));
      return onSnapshot(q, (snapshot) => {
        setPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient)));
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'patients');
      });
    }
  }, [user]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error(error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setActiveTab('dashboard');
      setSelectedPatient(null);
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpdateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), updates);
      setProfile(prev => prev ? { ...prev, ...updates } : null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const handleAddPatient = async () => {
    if (!user) return;
    try {
      const bmi = Number((newPatient.weight / (newPatient.height * newPatient.height)).toFixed(1));
      await addDoc(collection(db, 'patients'), {
        ...newPatient,
        bmi,
        doctorUid: user.uid,
        createdAt: serverTimestamp()
      });
      setShowAddPatient(false);
      setNewPatient({
        name: '',
        age: 30,
        gender: 'Masculino',
        bloodType: 'O+',
        allergies: '',
        height: 1.75,
        weight: 70
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'patients');
    }
  };

  const handleAddConsultation = async () => {
    if (!user || !selectedPatient) return;
    try {
      await addDoc(collection(db, 'patients', selectedPatient.id, 'consultations'), {
        ...newConsultation,
        doctorUid: user.uid,
        patientId: selectedPatient.id,
        date: serverTimestamp()
      });
      setShowAddConsultation(false);
      setNewConsultation({
        type: 'Consulta General',
        title: '',
        findings: '',
        diagnosis: '',
        plan: '',
        vitals: {
          bloodPressure: '120/80',
          heartRate: 72
        }
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `patients/${selectedPatient.id}/consultations`);
    }
  };

  const handleUpdatePatient = async () => {
    if (!selectedPatient) return;
    try {
      const bmi = Number((newPatient.weight / (newPatient.height * newPatient.height)).toFixed(1));
      await updateDoc(doc(db, 'patients', selectedPatient.id), {
        ...newPatient,
        bmi
      });
      setShowEditPatient(false);
      setSelectedPatient({ ...selectedPatient, ...newPatient, bmi, id: selectedPatient.id, doctorUid: selectedPatient.doctorUid, createdAt: selectedPatient.createdAt });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `patients/${selectedPatient.id}`);
    }
  };

  const handleDeletePatient = async (patientId: string) => {
    setDeleteConfig({
      message: '¿Está seguro de que desea eliminar este paciente y todo su historial? Esta acción no se puede deshacer.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'patients', patientId));
          setSelectedPatient(null);
          setShowDeleteConfirm(false);
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `patients/${patientId}`);
        }
      }
    });
    setShowDeleteConfirm(true);
  };

  const handleDeleteConsultation = async (patientId: string, consultationId: string) => {
    setDeleteConfig({
      message: '¿Está seguro de que desea eliminar esta consulta?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'patients', patientId, 'consultations', consultationId));
          setShowDeleteConfirm(false);
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `patients/${patientId}/consultations/${consultationId}`);
        }
      }
    });
    setShowDeleteConfirm(true);
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-surface">
        <Activity className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-surface-low p-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white p-10 rounded-3xl shadow-ambient text-center space-y-8"
        >
          <div className="w-20 h-20 rounded-2xl sidebar-gradient mx-auto flex items-center justify-center shadow-xl">
            <Stethoscope className="text-white w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h1 className="title-atelier text-3xl text-primary">MediFácil</h1>
            <p className="label-atelier text-high-contrast/60 uppercase tracking-widest">Clinical Atelier Dashboard</p>
          </div>
          <p className="body-atelier text-sm text-high-contrast/60">Inicie sesión con su cuenta profesional para acceder al panel de control clínico.</p>
          <button 
            onClick={handleLogin}
            className="btn-primary w-full py-4 flex items-center justify-center gap-3"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            Continuar con Google
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setSelectedPatient(null);
        }}
        user={profile}
        onLogout={handleLogout}
        isAdmin={isAdmin}
      />
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <Header 
          title={
            selectedPatient 
              ? "Expediente Clínico" 
              : activeTab === 'dashboard' 
                ? "Dashboard" 
                : activeTab === 'patients'
                  ? "Pacientes"
                : activeTab === 'generate' 
                  ? "Generar Documento" 
                  : activeTab === 'assistant' 
                    ? "Asistente de IA" 
                    : activeTab === 'plans'
                      ? "Planes de Pago"
                      : "Configuración"
          } 
          subtitle={selectedPatient ? selectedPatient.name : undefined}
          search={search}
          onSearchChange={setSearch}
          setActiveTab={setActiveTab}
        />
        <main className="flex-1 overflow-y-auto no-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedPatient ? `patient-${selectedPatient.id}` : activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {selectedPatient ? (
                <PatientProfile 
                  patient={selectedPatient} 
                  onBack={() => setSelectedPatient(null)} 
                  onAddConsultation={() => setShowAddConsultation(true)}
                  onEditPatient={() => {
                    setNewPatient({
                      name: selectedPatient.name,
                      age: selectedPatient.age,
                      gender: selectedPatient.gender,
                      bloodType: selectedPatient.bloodType,
                      height: selectedPatient.height,
                      weight: selectedPatient.weight,
                      allergies: selectedPatient.allergies || ''
                    });
                    setShowEditPatient(true);
                  }}
                  onDeletePatient={handleDeletePatient}
                  onDeleteConsultation={handleDeleteConsultation}
                  onViewConsultation={(c) => {
                    setSelectedConsultation(c);
                    setShowViewConsultation(true);
                  }}
                  onCopyConsultation={(c) => {
                    setNewConsultation({
                      type: c.type || 'Consulta General',
                      title: c.title || '',
                      findings: c.findings || '',
                      diagnosis: c.diagnosis || '',
                      plan: c.plan || '',
                      vitals: c.vitals || { bloodPressure: '120/80', heartRate: 72 }
                    });
                    setShowAddConsultation(true);
                  }}
                />
              ) : (
                <>
                  {activeTab === 'dashboard' && (
                    <Dashboard 
                      patients={patients} 
                      onSelectPatient={setSelectedPatient} 
                      onAddPatient={() => setShowAddPatient(true)}
                      onNewConsultation={() => setShowPatientSearchModal(true)}
                      onStartConsultation={(p) => {
                        setSelectedPatient(p);
                        setShowAddConsultation(true);
                      }}
                      search={search}
                      onSearchChange={setSearch}
                      user={profile}
                      setActiveTab={setActiveTab}
                    />
                  )}
                  {activeTab === 'patients' && (
                    <PatientsList 
                      patients={patients} 
                      onSelectPatient={setSelectedPatient} 
                      onAddPatient={() => setShowAddPatient(true)}
                      onEditPatient={(p) => {
                        setSelectedPatient(p);
                        setNewPatient({
                          name: p.name,
                          age: p.age,
                          gender: p.gender,
                          bloodType: p.bloodType,
                          height: p.height,
                          weight: p.weight,
                          allergies: p.allergies || ''
                        });
                        setShowEditPatient(true);
                      }}
                      onDeletePatient={handleDeletePatient}
                      onStartConsultation={(p) => {
                        setSelectedPatient(p);
                        setShowAddConsultation(true);
                      }}
                      search={search}
                      onSearchChange={setSearch}
                      dateFilter={patientDateFilter}
                      onDateFilterChange={setPatientDateFilter}
                    />
                  )}
                  {activeTab === 'generate' && <DocumentGenerator user={profile} />}
                  {activeTab === 'assistant' && <AIAssistant user={profile} />}
                  {activeTab === 'plans' && <PaymentPlans />}
                  {activeTab === 'settings' && <SettingsScreen user={profile} onUpdate={handleUpdateProfile} />}
                  {activeTab === 'admin' && isAdmin && (
                    <AdminPanel currentUserEmail={profile?.email || ''} />
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      
      {/* Modals */}
      <AnimatePresence>
        {showAddPatient && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddPatient(false)}
              className="absolute inset-0 bg-[#191970]/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative card-atelier w-full max-w-2xl overflow-hidden"
            >
              <div className="p-8 flex justify-between items-center">
                <h3 className="title-atelier text-primary">Nuevo Paciente</h3>
                <button onClick={() => setShowAddPatient(false)} className="p-2 hover:bg-surface-high rounded-full transition-colors">
                  <X className="w-6 h-6 text-high-contrast/40" />
                </button>
              </div>
              <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="label-atelier text-high-contrast/40 px-1">Nombre Completo</label>
                    <input 
                      className="input-field w-full" 
                      type="text" 
                      value={newPatient.name}
                      onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="label-atelier text-high-contrast/40 px-1">Edad</label>
                    <input 
                      className="input-field w-full" 
                      type="number" 
                      value={newPatient.age}
                      onChange={(e) => setNewPatient({ ...newPatient, age: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="label-atelier text-high-contrast/40 px-1">Género</label>
                    <select 
                      className="input-field w-full"
                      value={newPatient.gender}
                      onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}
                    >
                      <option>Masculino</option>
                      <option>Femenino</option>
                      <option>Otro</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="label-atelier text-high-contrast/40 px-1">Grupo Sanguíneo</label>
                    <input 
                      className="input-field w-full" 
                      type="text" 
                      value={newPatient.bloodType}
                      onChange={(e) => setNewPatient({ ...newPatient, bloodType: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="label-atelier text-high-contrast/40 px-1">Estatura (m)</label>
                    <input 
                      className="input-field w-full" 
                      type="number" 
                      step="0.01"
                      value={newPatient.height}
                      onChange={(e) => setNewPatient({ ...newPatient, height: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="label-atelier text-high-contrast/40 px-1">Peso (kg)</label>
                    <input 
                      className="input-field w-full" 
                      type="number" 
                      value={newPatient.weight}
                      onChange={(e) => setNewPatient({ ...newPatient, weight: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="label-atelier text-high-contrast/40 px-1">Alergias</label>
                  <textarea 
                    className="input-field w-full resize-none" 
                    rows={3}
                    value={newPatient.allergies}
                    onChange={(e) => setNewPatient({ ...newPatient, allergies: e.target.value })}
                  />
                </div>
              </div>
              <div className="p-8 bg-surface-high flex gap-4">
                <button onClick={() => setShowAddPatient(false)} className="flex-1 btn-secondary">Cancelar</button>
                <button onClick={handleAddPatient} className="flex-1 btn-primary">Crear Paciente</button>
              </div>
            </motion.div>
          </div>
        )}

        {showAddConsultation && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddConsultation(false)}
              className="absolute inset-0 bg-[#191970]/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative card-atelier w-full max-w-3xl overflow-hidden"
            >
              <div className="p-8 flex justify-between items-center">
                <h3 className="title-atelier text-primary">Nueva Consulta</h3>
                <button onClick={() => setShowAddConsultation(false)} className="p-2 hover:bg-surface-high rounded-full transition-colors">
                  <X className="w-5 h-5 text-high-contrast/40" />
                </button>
              </div>
              <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="label-atelier text-high-contrast/40 px-1">Tipo de Consulta</label>
                    <select 
                      className="input-field w-full"
                      value={newConsultation.type}
                      onChange={(e) => setNewConsultation({ ...newConsultation, type: e.target.value })}
                    >
                      <option>Consulta General</option>
                      <option>Especialidad</option>
                      <option>Urgencia</option>
                      <option>Seguimiento</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="label-atelier text-high-contrast/40 px-1">Título de la Consulta</label>
                    <input 
                      className="input-field w-full" 
                      type="text" 
                      placeholder="Ej: Control de Hipertensión"
                      value={newConsultation.title}
                      onChange={(e) => setNewConsultation({ ...newConsultation, title: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="label-atelier text-high-contrast/40 px-1">Presión Arterial</label>
                    <input 
                      className="input-field w-full" 
                      type="text" 
                      value={newConsultation.vitals.bloodPressure}
                      onChange={(e) => setNewConsultation({ ...newConsultation, vitals: { ...newConsultation.vitals, bloodPressure: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="label-atelier text-high-contrast/40 px-1">Frecuencia Cardíaca (bpm)</label>
                    <input 
                      className="input-field w-full" 
                      type="number" 
                      value={newConsultation.vitals.heartRate}
                      onChange={(e) => setNewConsultation({ ...newConsultation, vitals: { ...newConsultation.vitals, heartRate: parseInt(e.target.value) } })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="label-atelier text-high-contrast/40 px-1">Hallazgos / Motivo</label>
                  <textarea 
                    className="input-field w-full resize-none" 
                    rows={3}
                    value={newConsultation.findings}
                    onChange={(e) => setNewConsultation({ ...newConsultation, findings: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="label-atelier text-high-contrast/40 px-1">Diagnóstico</label>
                  <textarea 
                    className="input-field w-full resize-none" 
                    rows={2}
                    value={newConsultation.diagnosis}
                    onChange={(e) => setNewConsultation({ ...newConsultation, diagnosis: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="label-atelier text-high-contrast/40 px-1">Plan de Tratamiento</label>
                  <textarea 
                    className="input-field w-full resize-none" 
                    rows={3}
                    value={newConsultation.plan}
                    onChange={(e) => setNewConsultation({ ...newConsultation, plan: e.target.value })}
                  />
                </div>
              </div>
              <div className="p-8 bg-surface-high flex gap-4">
                <button onClick={() => setShowAddConsultation(false)} className="flex-1 btn-secondary text-xs">Cancelar</button>
                <button 
                  onClick={() => setShowConsultationSearchModal(true)} 
                  className="flex-1 btn-secondary text-xs flex items-center justify-center gap-2"
                >
                  <History className="w-4 h-4" />
                  Copiar Anterior
                </button>
                <button onClick={handleAddConsultation} className="flex-1 btn-primary text-xs">Registrar Consulta</button>
              </div>
            </motion.div>
          </div>
        )}

        {showEditPatient && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditPatient(false)}
              className="absolute inset-0 bg-[#191970]/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative card-atelier w-full max-w-2xl overflow-hidden"
            >
              <div className="p-8 flex justify-between items-center">
                <h3 className="title-atelier text-primary">Modificar Paciente</h3>
                <button onClick={() => setShowEditPatient(false)} className="p-2 hover:bg-surface-high rounded-full transition-colors">
                  <X className="w-6 h-6 text-high-contrast/40" />
                </button>
              </div>
              <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
                <div className="space-y-2">
                  <label className="label-atelier text-high-contrast/40 px-1">Nombre Completo</label>
                  <input 
                    className="input-field w-full" 
                    type="text" 
                    value={newPatient.name}
                    onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="label-atelier text-high-contrast/40 px-1">Edad</label>
                    <input 
                      className="input-field w-full" 
                      type="number" 
                      value={newPatient.age}
                      onChange={(e) => setNewPatient({ ...newPatient, age: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="label-atelier text-high-contrast/40 px-1">Género</label>
                    <select 
                      className="input-field w-full"
                      value={newPatient.gender}
                      onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}
                    >
                      <option value="Masculino">Masculino</option>
                      <option value="Femenino">Femenino</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="label-atelier text-high-contrast/40 px-1">Grupo Sanguíneo</label>
                    <input 
                      className="input-field w-full" 
                      type="text" 
                      value={newPatient.bloodType}
                      onChange={(e) => setNewPatient({ ...newPatient, bloodType: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="label-atelier text-high-contrast/40 px-1">Altura (m)</label>
                    <input 
                      className="input-field w-full" 
                      type="number" 
                      step="0.01"
                      value={newPatient.height}
                      onChange={(e) => setNewPatient({ ...newPatient, height: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="label-atelier text-high-contrast/40 px-1">Peso (kg)</label>
                    <input 
                      className="input-field w-full" 
                      type="number" 
                      value={newPatient.weight}
                      onChange={(e) => setNewPatient({ ...newPatient, weight: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="label-atelier text-high-contrast/40 px-1">Alergias</label>
                  <textarea 
                    className="input-field w-full resize-none" 
                    rows={3}
                    value={newPatient.allergies}
                    onChange={(e) => setNewPatient({ ...newPatient, allergies: e.target.value })}
                  />
                </div>
              </div>
              <div className="p-8 bg-surface-high flex gap-4">
                <button onClick={() => setShowEditPatient(false)} className="flex-1 btn-secondary">Cancelar</button>
                <button onClick={handleUpdatePatient} className="flex-1 btn-primary">Guardar Cambios</button>
              </div>
            </motion.div>
          </div>
        )}

        {showPatientSearchModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPatientSearchModal(false)}
              className="absolute inset-0 bg-[#191970]/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative card-atelier w-full max-w-2xl overflow-hidden"
            >
              <div className="p-8 flex justify-between items-center border-b border-surface-container-high">
                <h3 className="title-atelier text-primary">Buscar Paciente para Consulta</h3>
                <button onClick={() => setShowPatientSearchModal(false)} className="p-2 hover:bg-surface-high rounded-full transition-colors">
                  <X className="w-6 h-6 text-high-contrast/40" />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant w-5 h-5" />
                  <input 
                    className="w-full h-12 pl-12 pr-4 rounded-xl bg-surface-container-low border-none focus:ring-2 focus:ring-primary/10 transition-all" 
                    placeholder="Escriba el nombre del paciente..." 
                    type="text"
                    autoFocus
                    onChange={(e) => setSearch(e.target.value)}
                    value={search}
                  />
                </div>
                <div className="max-h-[40vh] overflow-y-auto space-y-2 no-scrollbar">
                  {patients.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).length > 0 ? (
                    patients.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).map(patient => (
                      <button 
                        key={patient.id}
                        onClick={() => {
                          setSelectedPatient(patient);
                          setShowPatientSearchModal(false);
                          setShowAddConsultation(true);
                        }}
                        className="w-full p-4 flex items-center justify-between rounded-xl hover:bg-primary-fixed transition-colors text-left group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                            {patient.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <p className="font-bold text-on-surface group-hover:text-primary">{patient.name}</p>
                            <p className="text-xs text-on-surface-variant">ID: #{patient.id.slice(-6).toUpperCase()}</p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-on-surface-variant group-hover:text-primary" />
                      </button>
                    ))
                  ) : (
                    <div className="py-12 text-center space-y-4">
                      <div className="w-16 h-16 bg-surface-container-low rounded-full flex items-center justify-center mx-auto text-on-surface-variant/20">
                        <Users className="w-8 h-8" />
                      </div>
                      <p className="text-on-surface-variant font-medium">No se encontraron pacientes con ese nombre.</p>
                      <button 
                        onClick={() => {
                          setShowPatientSearchModal(false);
                          setShowAddPatient(true);
                        }}
                        className="text-primary font-bold hover:underline"
                      >
                        Crear nuevo paciente
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-6 bg-surface-container-low flex justify-end">
                <button onClick={() => setShowPatientSearchModal(false)} className="btn-secondary">Cerrar</button>
              </div>
            </motion.div>
          </div>
        )}

        {showConsultationSearchModal && selectedPatient && (
          <ConsultationSearchModal 
            patient={selectedPatient}
            onClose={() => setShowConsultationSearchModal(false)}
            onSelect={(c) => {
              setNewConsultation({
                type: c.type || 'Consulta General',
                title: c.title || '',
                findings: c.findings || '',
                diagnosis: c.diagnosis || '',
                plan: c.plan || '',
                vitals: c.vitals || { bloodPressure: '120/80', heartRate: 72 }
              });
              setShowConsultationSearchModal(false);
              setShowAddConsultation(true);
            }}
          />
        )}

        {showViewConsultation && selectedConsultation && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowViewConsultation(false)}
              className="absolute inset-0 bg-[#191970]/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative card-atelier w-full max-w-2xl overflow-hidden"
            >
              <div className="p-8 flex justify-between items-center border-b border-surface-container-high">
                <div>
                  <h3 className="title-atelier text-primary">{selectedConsultation.title || "Detalle de Consulta"}</h3>
                  <p className="text-xs text-on-surface-variant font-bold uppercase tracking-widest mt-1">
                    {new Date(selectedConsultation.date?.toDate?.() || selectedConsultation.date).toLocaleDateString('es-ES', { dateStyle: 'full' })}
                  </p>
                </div>
                <button onClick={() => setShowViewConsultation(false)} className="p-2 hover:bg-surface-high rounded-full transition-colors">
                  <X className="w-6 h-6 text-high-contrast/40" />
                </button>
              </div>
              <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto no-scrollbar">
                <div className="grid grid-cols-2 gap-6">
                  <div className="p-4 bg-surface-low rounded-xl border border-surface-high">
                    <p className="label-atelier text-high-contrast/40 uppercase tracking-widest text-[10px] mb-1">Presión Arterial</p>
                    <p className="body-atelier font-bold text-primary text-xl">{selectedConsultation.vitals?.bloodPressure || 'N/A'}</p>
                  </div>
                  <div className="p-4 bg-surface-low rounded-xl border border-surface-high">
                    <p className="label-atelier text-high-contrast/40 uppercase tracking-widest text-[10px] mb-1">Frecuencia Cardíaca</p>
                    <p className="body-atelier font-bold text-primary text-xl">{selectedConsultation.vitals?.heartRate || 'N/A'} <span className="text-xs font-medium text-high-contrast/40">LPM</span></p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-4 bg-secondary rounded-full" />
                      <p className="label-atelier text-high-contrast/40 uppercase tracking-widest text-[10px]">Hallazgos Clínicos</p>
                    </div>
                    <div className="p-5 bg-surface-low rounded-2xl border border-surface-high">
                      <p className="body-atelier text-high-contrast leading-relaxed whitespace-pre-wrap">{selectedConsultation.findings}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-4 bg-primary rounded-full" />
                      <p className="label-atelier text-high-contrast/40 uppercase tracking-widest text-[10px]">Diagnóstico</p>
                    </div>
                    <div className="p-5 bg-surface-low rounded-2xl border border-surface-high">
                      <p className="body-atelier text-high-contrast font-bold text-lg leading-relaxed">{selectedConsultation.diagnosis}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-4 bg-secondary rounded-full" />
                      <p className="label-atelier text-high-contrast/40 uppercase tracking-widest text-[10px]">Plan de Tratamiento</p>
                    </div>
                    <div className="p-5 bg-surface-low rounded-2xl border border-surface-high">
                      <p className="body-atelier text-high-contrast leading-relaxed whitespace-pre-wrap">{selectedConsultation.plan}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-surface-container-low flex justify-end">
                <button onClick={() => setShowViewConsultation(false)} className="btn-primary px-10">Cerrar</button>
              </div>
            </motion.div>
          </div>
        )}

        {showDeleteConfirm && deleteConfig && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(false)}
              className="absolute inset-0 bg-red-950/20 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-red-100"
            >
              <div className="p-8 text-center space-y-6">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
                  <AlertCircle className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-primary">¿Confirmar eliminación?</h3>
                  <p className="text-on-surface-variant leading-relaxed">{deleteConfig.message}</p>
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-3 px-6 rounded-xl font-bold text-on-surface-variant hover:bg-surface-container-high transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={deleteConfig.onConfirm}
                    className="flex-1 py-3 px-6 rounded-xl font-bold bg-red-500 text-white shadow-lg shadow-red-200 hover:bg-red-600 transition-all active:scale-95"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
