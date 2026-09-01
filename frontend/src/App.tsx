/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  type User as FirebaseUser 
} from 'firebase/auth';
import {
  collection,
  collectionGroup,
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
  limit,
  increment,
  runTransaction
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
  generateClinicalDocumentStream,
  ClinicalDoc,
  createChat,
  analyzeMedicalImage
} from './lib/ai';
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
  CreditCard,
  FolderOpen,
  Pill,
  Menu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import PaymentPlans from './components/PaymentPlans';
import { AIAssistant } from './components/AIAssistant';
import { DocumentGenerator } from './components/DocumentGenerator';
import { PatientProfile } from './components/PatientProfile';
import { Patient, Consultation, UserProfile } from './types';
import { 
  canUseAI, 
  canAddPatient,
  canCreateConsultation,
  incrementAIUsage, 
  incrementConsultationUsage,
  resetMonthlyUsage, 
  shouldResetMonthlyUsage,
  formatUsageDisplay
} from './lib/usageLimits';

const ADMIN_EMAILS = ["androxus512rbm@gmail.com", "luise.sb5845@gmail.com"];

// --- Animation Components ---

const ScrollProgressBar = () => {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const updateScroll = () => {
      const currentScroll = window.scrollY;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight > 0) {
        setScrollProgress((currentScroll / scrollHeight) * 100);
      }
    };
    window.addEventListener("scroll", updateScroll);
    return () => window.removeEventListener("scroll", updateScroll);
  }, []);

  return (
    <div className="fixed top-0 left-0 w-full h-0.5 z-[200] pointer-events-none">
      <motion.div 
        className="h-full sidebar-gradient"
        style={{ width: `${scrollProgress}%` }}
      />
    </div>
  );
};

const CursorTrailer = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <motion.div
      className="fixed top-0 left-0 w-2 h-2 bg-[#191970]/40 rounded-full z-[300] pointer-events-none hidden md:block"
      animate={{ x: position.x - 4, y: position.y - 4 }}
      transition={{ type: "spring", stiffness: 500, damping: 28, mass: 0.5 }}
    />
  );
};

const Typewriter = ({ text, delay = 0 }: { text: string; delay?: number }) => {
  const words = text.split(" ");
  
  const container = {
    hidden: { opacity: 0 },
    visible: (i = 1) => ({
      opacity: 1,
      transition: { staggerChildren: 0.12, delayChildren: delay * i },
    }),
  } as const;

  const child = {
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 100,
      },
    },
    hidden: {
      opacity: 0,
      y: 20,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 100,
      },
    },
  } as const;

  return (
    <motion.div
      style={{ overflow: "hidden", display: "flex", flexWrap: "wrap" }}
      variants={container}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
    >
      {words.map((word, index) => (
        <motion.span
          variants={child}
          style={{ marginRight: "12px" }}
          key={index}
        >
          {word}
        </motion.span>
      ))}
    </motion.div>
  );
};

const CountUp = ({ value, duration = 2 }: { value: number; duration?: number }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useMemo(() => true, []); // Simplified for now or use useInView from framer-motion if version supports

  useEffect(() => {
    let start = 0;
    const end = value;
    const totalMiliseconds = duration * 1000;
    const incrementTime = totalMiliseconds / end;

    const timer = setInterval(() => {
      start += 1;
      setCount(start);
      if (start === end) clearInterval(timer);
    }, incrementTime);

    return () => clearInterval(timer);
  }, [value, duration]);

  return <span>{count}</span>;
};

const LandingPage = ({ onLogin }: { onLogin: () => void }) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const benefits = [
    {
      icon: FolderOpen,
      title: "Expedientes completos",
      description: "Historial clínico, alergias, consultas anteriores y datos del paciente en un solo lugar."
    },
    {
      icon: Stethoscope,
      title: "Consultas sin fricción",
      description: "Registra hallazgos, diagnósticos y planes de tratamiento en segundos. Sin formularios complejos."
    },
    {
      icon: Bot,
      title: "IA clínica integrada",
      description: "Consulta dudas clínicas, redacta documentos y verifica información con un asistente entrenado para el entorno médico."
    },
    {
      icon: FileText,
      title: "Documentos en segundos",
      description: "Genera plantillas médicas personalizadas basadas en el perfil del paciente con un solo clic."
    }
  ];

  const [formSubmitted, setFormSubmitted] = useState(false);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#F3F4F5] font-manrope selection:bg-primary/10 selection:text-primary overflow-x-hidden">
      <ScrollProgressBar />
      <CursorTrailer />

      {/* NAVBAR */}
      <nav className={cn(
        "fixed top-0 inset-x-0 z-[100] transition-all duration-500 px-6 py-4",
        scrolled ? "bg-white/80 backdrop-blur-xl border-b border-black/5 shadow-lg" : "bg-transparent"
      )}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <motion.div 
            animate={{ scale: scrolled ? 0.9 : 1 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl sidebar-gradient flex items-center justify-center shadow-lg shadow-primary/20 hover:shadow-white/20 transition-shadow duration-300">
              <BriefcaseMedical className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#191970] leading-none">MediFácil</h1>
              <p className="text-[10px] font-black text-[#191970]/40 uppercase tracking-[0.2em] mt-1">The Clinical Atelier</p>
            </div>
          </motion.div>

          <div className="hidden md:flex items-center gap-8">
            <button onClick={onLogin} className="relative text-sm font-bold text-[#191970]/60 hover:text-[#191970] transition-colors group">
              Iniciar sesión
              <span className="absolute -bottom-1 left-1/2 w-0 h-0.5 bg-primary group-hover:w-full group-hover:left-0 transition-all duration-300" />
            </button>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onLogin} 
              className="px-6 py-2.5 sidebar-gradient text-white text-sm font-bold rounded-xl shadow-lg shadow-primary/20"
            >
              Comenzar gratis
            </motion.button>
          </div>
          
          <button className="md:hidden p-2 text-primary">
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </nav>

      <header className="relative min-h-[100vh] flex items-center justify-center pt-20 overflow-hidden sidebar-gradient animate-aurora">
        {/* Decorative Elements */}
        <div className="absolute top-20 left-10 w-64 h-64 bg-white/5 rounded-full border border-white/5 blur-sm rotate-animation pointer-events-none" style={{ animation: 'aurora 20s linear infinite' }}></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/5 rounded-full border border-white/5 blur-sm rotate-animation-reverse pointer-events-none" style={{ animation: 'aurora 15s linear infinite reverse' }}></div>
        
        {/* Background Patterns */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[size:32px_32px]"></div>

        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
          <div className="text-white space-y-8">
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/10 backdrop-blur-md"
            >
              <Sparkles className="w-3 h-3 text-secondary" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Para Médicos Profesionales</span>
            </motion.div>
            
            <h2 className="text-5xl md:text-7xl font-black leading-[1.1] tracking-tight min-h-[2.2em]">
              <Typewriter text="Tu consulta merece una herramienta a su altura." />
            </h2>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.8 }}
              className="text-lg md:text-xl text-white/70 font-medium leading-relaxed max-w-xl"
            >
              Gestiona expedientes, consultas y documentos clínicos con la precisión de un atelier. Simple, seguro y pensado para médicos.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.6, type: "spring", stiffness: 200, damping: 20 }}
              className="flex flex-wrap items-center gap-4 pt-4"
            >
              <button 
                onClick={onLogin}
                className="px-8 py-4 bg-white text-[#191970] text-sm font-black uppercase tracking-widest rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all"
              >
                Comenzar gratis
              </button>
              <a 
                href="#planes"
                className="px-8 py-4 bg-transparent border border-white/20 text-white text-sm font-black uppercase tracking-widest rounded-2xl hover:bg-white/5 transition-all"
              >
                Ver planes →
              </a>
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 1 }}
            className="hidden lg:block relative animate-float"
          >
            {/* Mockup Presentation */}
            <div className="relative z-10 w-full aspect-video bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8 overflow-hidden group">
               <div className="flex items-center gap-4 mb-8">
                  <div className="w-3 h-3 rounded-full bg-red-400/80 shadow-[0_0_10px_rgba(248,113,113,0.4)]" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400/80 shadow-[0_0_10px_rgba(250,204,21,0.4)]" />
                  <div className="w-3 h-3 rounded-full bg-green-400/80 shadow-[0_0_10px_rgba(74,222,128,0.4)]" />
               </div>
               <div className="space-y-4">
                  <div className="w-1/2 h-8 bg-white/10 rounded-lg animate-pulse" />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-24 bg-white/5 rounded-2xl border border-white/10 group-hover:bg-white/10 transition-colors duration-500" />
                    <div className="h-24 bg-white/5 rounded-2xl border border-white/10 group-hover:bg-white/10 transition-colors duration-500" />
                  </div>
                  <div className="h-40 bg-white/5 rounded-2xl border border-white/10 group-hover:bg-white/10 transition-colors duration-500" />
               </div>
            </div>
            
            {/* Decorative circles */}
            <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/5 backdrop-blur-xl border border-white/20 rounded-3xl rotate-12 flex items-center justify-center shadow-2xl animate-float" style={{ animationDelay: '1s' }}>
              <Stethoscope className="w-16 h-16 text-white/50" />
            </div>
            
            <motion.div 
              whileHover={{ scale: 1.1 }}
              className="absolute -bottom-6 -left-6 px-6 py-4 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl flex items-center gap-4 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center">
                <BadgeCheck className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Seguridad</p>
                <p className="text-sm font-bold text-white tracking-tight">Datos Encriptados</p>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Waves Separator */}
        <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-[#F3F4F5] to-transparent"></div>
      </header>

      <section className="py-32 px-6 bg-[#F3F4F5] relative overflow-hidden">
        <div className="max-w-7xl mx-auto space-y-20">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center space-y-4"
          >
            <p className="label-atelier text-primary tracking-[0.3em]">Beneficios</p>
            <h3 className="headline-atelier text-[#191970]">Diseñado para la excelencia médica</h3>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.15 }}
                whileHover={{ y: -10, scale: 1.04, boxShadow: "0 0 30px rgba(25, 25, 112, 0.15)" }}
                className="group p-8 rounded-[2.5rem] bg-white border border-black/5 shadow-signature transition-all duration-300"
              >
                <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center mb-8 group-hover:sidebar-gradient group-hover:shadow-lg group-hover:shadow-primary/20 group-hover:animate-pulse-slow transition-all">
                  <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.8 }}>
                    <benefit.icon className="w-7 h-7 text-primary group-hover:text-white transition-colors" />
                  </motion.div>
                </div>
                <h4 className="title-atelier text-[#191970] mb-4">{benefit.title}</h4>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                  {benefit.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="planes" className="py-32 px-6 sidebar-gradient relative overflow-hidden">
        {/* SVG Animated Lines Background */}
        <div className="absolute inset-0 pointer-events-none opacity-10">
          <svg className="w-full h-full" viewBox="0 0 1000 1000" preserveAspectRatio="none">
            <motion.path 
              d="M0,500 C200,400 300,600 500,500 C700,400 800,600 1000,500" 
              fill="none" stroke="white" strokeWidth="2"
              initial={{ pathLength: 0, opacity: 0 }}
              whileInView={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 3, repeat: Infinity, repeatType: "reverse" }}
            />
            <motion.path 
              d="M0,300 C200,200 300,400 500,300 C700,200 800,400 1000,300" 
              fill="none" stroke="white" strokeWidth="1"
              initial={{ pathLength: 0, opacity: 0 }}
              whileInView={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 4, delay: 1, repeat: Infinity, repeatType: "reverse" }}
            />
          </svg>
        </div>
        
        <div className="max-w-7xl mx-auto space-y-20 relative z-10">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="text-center space-y-4"
          >
            <h3 className="headline-atelier text-white">Elige tu plan</h3>
            <p className="text-lg text-white/60 font-medium">Comienza gratis, escala cuando lo necesites.</p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-center">
            {/* PLAN FREE */}
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              whileHover={{ scale: 1.03, boxShadow: "0 20px 60px rgba(25,25,112,0.25)" }}
              className="p-10 rounded-[3rem] bg-white/5 backdrop-blur-xl border border-white/10 text-white space-y-10 flex flex-col"
            >
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Gratis</span>
                <h4 className="text-4xl font-black">$0</h4>
              </div>
              <ul className="space-y-6 flex-grow">
                {[
                  "15 pacientes total",
                  "20 consultas/mes",
                  "5 documentos/mes",
                  "20 mensajes de IA/mes"
                ].map((f, i) => (
                  <motion.li 
                    key={i} 
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i*0.1 }}
                    className="flex items-center gap-3 text-sm font-semibold text-white/80"
                  >
                    <CheckCircle2 className="w-4 h-4 text-secondary flex-shrink-0" />
                    {f}
                  </motion.li>
                ))}
              </ul>
              <button 
                onClick={onLogin}
                className="w-full h-14 rounded-2xl bg-white/10 border border-white/10 text-white text-xs font-black uppercase tracking-widest hover:bg-white/20 transition-all active:scale-95"
              >
                Comenzar gratis
              </button>
            </motion.div>

            {/* PLAN MÉDICO - POPULAR */}
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              whileHover={{ scale: 1.03, boxShadow: "0 20px 60px rgba(25,25,112,0.3)" }}
              className="p-12 rounded-[3.5rem] bg-white/10 backdrop-blur-2xl border border-white/30 text-white space-y-10 flex flex-col scale-105 shadow-2xl relative overflow-hidden group"
            >
              {/* Shimmer border wrapper */}
              <div className="absolute inset-0 shimmer-border opacity-30 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

              <div className="relative z-10">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-secondary text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg animate-pulse">
                  Más Popular
                </div>
                <div className="space-y-2 mt-4">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary">Plan Médico</span>
                  <div className="flex items-baseline gap-1">
                    <h4 className="text-5xl font-black">
                      $<CountUp value={12} />
                    </h4>
                    <span className="text-white/40 font-bold">/mes</span>
                  </div>
                </div>
                <ul className="space-y-6 flex-grow my-10">
                  {[
                    "Pacientes ilimitados",
                    "Consultas ilimitadas",
                    "Documentos ilimitados",
                    "IA ilimitada",
                    "Soporte prioritario"
                  ].map((f, i) => (
                    <motion.li 
                      key={i} 
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + i*0.1 }}
                      className="flex items-center gap-3 text-sm font-semibold"
                    >
                      <CheckCircle2 className="w-5 h-5 text-secondary flex-shrink-0" />
                      {f}
                    </motion.li>
                  ))}
                </ul>
                <button 
                  onClick={onLogin}
                  className="w-full h-16 rounded-3xl bg-white text-[#191970] flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl relative overflow-hidden group/btn"
                >
                  <span className="relative z-10">Elegir Plan Médico</span>
                  <motion.div 
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent -translate-x-full"
                    animate={{ translateX: ["100%", "-100%"] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  />
                </button>
              </div>
            </motion.div>

            {/* PLAN CLÍNICA */}
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              whileHover={{ scale: 1.03, boxShadow: "0 20px 60px rgba(25,25,112,0.25)" }}
              className="p-10 rounded-[3rem] bg-white/5 backdrop-blur-xl border border-white/10 text-white space-y-10 flex flex-col"
            >
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#A3E635]">Ahorra 30%</span>
                <div className="flex items-baseline gap-1">
                  <h4 className="text-4xl font-black">$99</h4>
                  <span className="text-white/40 font-bold">/año</span>
                </div>
                <p className="text-[10px] font-bold text-white/30 tracking-widest uppercase">~$8.25/mes</p>
              </div>
              <ul className="space-y-6 flex-grow">
                {[
                  "Todo lo del Plan Médico",
                  "Badge Doctor Pro ✦",
                  "Acceso anticipado a nuevas funciones"
                ].map((f, i) => (
                  <motion.li 
                    key={i} 
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + i*0.1 }}
                    className="flex items-center gap-3 text-sm font-semibold text-white/80"
                  >
                    <CheckCircle2 className="w-4 h-4 text-secondary flex-shrink-0" />
                    {f}
                  </motion.li>
                ))}
              </ul>
              <button 
                onClick={onLogin}
                className="w-full h-14 rounded-2xl bg-white/10 border border-white/10 text-white text-xs font-black uppercase tracking-widest hover:bg-white/20 transition-all active:scale-95 flex items-center justify-center"
              >
                Elegir Plan Anual Médico
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-32 px-6 bg-[#F3F4F5]">
        <div className="max-w-4xl mx-auto space-y-16">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center space-y-4"
          >
            <h3 className="headline-atelier text-[#191970]">¿Tienes preguntas?</h3>
            <p className="text-lg text-slate-500 font-medium">Estamos aquí para ayudarte.</p>
          </motion.div>

          <div className="perspective-1000">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              animate={formSubmitted ? { rotateY: 180 } : {}}
              transition={{ duration: 0.8, type: "spring" }}
              className="relative p-10 rounded-[3rem] bg-white border border-black/5 shadow-signature min-h-[400px] flex items-center justify-center overflow-hidden"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Front: Form */}
              <div 
                className="w-full h-full backface-hidden"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <form onSubmit={handleContactSubmit} className={cn("space-y-6 transition-opacity duration-500", formSubmitted && "opacity-0 pointer-events-none")}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 group">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#191970]/40 px-1 group-focus-within:text-primary transition-colors">Nombre</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="Dr. Julián Rivera"
                        className="w-full h-14 bg-slate-50 border-none rounded-2xl px-6 font-semibold focus:ring-2 focus:ring-primary/15 transition-all outline-none placeholder:text-black/10" 
                      />
                    </div>
                    <div className="space-y-2 group">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#191970]/40 px-1 group-focus-within:text-primary transition-colors">Email profesional</label>
                      <input 
                        type="email" 
                        required 
                        placeholder="julian@clinica.com"
                        className="w-full h-14 bg-slate-50 border-none rounded-2xl px-6 font-semibold focus:ring-2 focus:ring-primary/15 transition-all outline-none placeholder:text-black/10" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2 group">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#191970]/40 px-1 group-focus-within:text-primary transition-colors">Mensaje</label>
                    <textarea 
                      required 
                      rows={4} 
                      placeholder="¿Cómo podemos ayudarte?"
                      className="w-full py-6 bg-slate-50 border-none rounded-[2rem] px-6 font-semibold focus:ring-2 focus:ring-primary/15 transition-all resize-none outline-none placeholder:text-black/10" 
                    />
                  </div>
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-4">
                    <div className="text-left">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#191970]/40">Email de contacto</p>
                        <p className="text-sm font-bold text-primary">soporte@medifacil.app</p>
                    </div>
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="submit" 
                      className="px-12 h-16 sidebar-gradient text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl transition-all"
                    >
                      Enviar mensaje
                    </motion.button>
                  </div>
                </form>
              </div>

              {/* Back: Success Message */}
              <div 
                className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-10 bg-white rounded-[3rem] backface-hidden"
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              >
                <div className="w-20 h-20 rounded-full bg-secondary/10 flex items-center justify-center mb-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={formSubmitted ? { scale: 1 } : {}}
                    transition={{ type: "spring", delay: 0.5 }}
                  >
                    <CheckCircle2 className="w-12 h-12 text-secondary" />
                  </motion.div>
                </div>
                <h4 className="title-atelier text-[#191970] mb-2">¡Mensaje Enviado!</h4>
                <p className="text-center text-slate-500 font-medium">Gracias por contactarnos. Un especialista se comunicará contigo en menos de 24 horas.</p>
                <button 
                  onClick={() => setFormSubmitted(false)}
                  className="mt-8 text-xs font-black uppercase tracking-widest text-primary/40 hover:text-primary transition-colors underline underline-offset-4"
                >
                  Enviar otro mensaje
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SECCIÓN 5: FOOTER */}
      <footer className="bg-[#191970] py-20 px-6 text-white/60">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-3 group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors group-hover:shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                <BriefcaseMedical className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">MediFácil</h1>
            </motion.div>
            <p className="text-sm font-medium">© 2026 MediFácil. Todos los derechos reservados.</p>
          </div>
          
          <div className="flex flex-wrap gap-8 md:justify-end text-sm font-bold">
            {["Términos de uso", "Privacidad", "Contacto"].map((link, i) => (
              <a 
                key={i} 
                href="#" 
                className="relative hover:text-white transition-colors group"
              >
                {link}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-secondary group-hover:w-full transition-all duration-300" />
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
};

// Global interfaces and sub-component-specific components are now imported from ./types and ./components

// --- Components ---

const Sidebar = ({ activeTab, setActiveTab, user, onLogout, isAdmin, onClearPatient, isOpen, onClose }: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: UserProfile | null;
  onLogout: () => void;
  isAdmin: boolean;
  onClearPatient: () => void;
  isOpen: boolean;
  onClose: () => void;
}) => {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'patients', label: 'Pacientes', icon: Users },
    { id: 'generate', label: 'Generar Documento', icon: FileText },
    { id: 'recetas', label: 'Recetas', icon: Pill },
    { id: 'assistant', label: 'Asistente de IA', icon: Bot },
    { id: 'plans', label: 'Planes de Pago', icon: CreditCard },
    ...(isAdmin ? [{ id: 'admin', label: 'Gestión de Usuarios', icon: ShieldCheck }] : []),
  ];

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-[45] md:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <aside className={cn(
        "fixed inset-y-0 left-0 flex flex-col justify-between py-6 px-4 sidebar-gradient h-screen w-64 overflow-y-auto z-50 shadow-ambient no-scrollbar transition-transform duration-300 md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="space-y-8">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-md border border-white/10 shadow-lg">
                <BriefcaseMedical className="w-7 h-7 text-white fill-white/20" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white leading-none">MediFácil</h1>
                <p className="text-[9px] uppercase tracking-[0.25em] text-white/40 font-extrabold mt-1">THE CLINICAL ATELIER</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="md:hidden p-2 text-white/70 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  onClearPatient();
                  if (window.innerWidth < 768) onClose();
                }}
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
        {/* Upgrade CTA */}
        {user?.plan === 'free' && (
          <div className="px-4 mb-4">
            <button 
              onClick={() => setActiveTab('plans')}
              className="w-full p-4 rounded-xl relative overflow-hidden group transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-lg"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-secondary via-[#2a2a9a] to-primary opacity-90 group-hover:opacity-100 transition-opacity"></div>
              <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_3s_infinite] group-hover:animate-[shimmer_1.5s_infinite]"></div>
              <div className="relative flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-md">
                  <Sparkles className="w-4 h-4 text-white animate-pulse" />
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest leading-none mb-1">Potencie su Clínica</p>
                  <p className="text-sm font-extrabold text-white leading-none">Actualizar a Pro</p>
                </div>
              </div>
            </button>
          </div>
        )}

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
    </>
  );
};

const Header = ({ title, subtitle, search, onSearchChange, setActiveTab, onToggleSidebar }: { title: string; subtitle?: string; search: string; onSearchChange: (s: string) => void; setActiveTab: (t: string) => void; onToggleSidebar: () => void }) => {
  return (
    <header className="sticky top-0 z-40 flex justify-between items-center w-full px-4 md:px-8 py-4 bg-white/70 backdrop-blur-xl transition-all focus-within:ring-1 ring-[#191970]/15 gap-4">
      <div className="flex items-center gap-3">
        <button 
          onClick={onToggleSidebar}
          className="md:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors text-primary"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="hidden sm:block">
          <h2 className="text-lg font-bold text-primary truncate max-w-[150px] md:max-w-none">{title}</h2>
          {subtitle && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[150px] md:max-w-none">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 md:w-5 h-4 md:h-5" />
          <input 
            className="w-full bg-surface-container-high border-none rounded-full py-2 pl-9 md:pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary-container placeholder:text-slate-400 outline-none" 
            placeholder="Buscar..." 
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

import { PatientsList } from './pages/PatientsList';
import { Dashboard } from './pages/Dashboard';
import { SettingsScreen } from './pages/SettingsScreen';
import { AdminPanel } from './pages/AdminPanel';
import { ConsultationSearchModal } from './components/ConsultationSearchModal';
import { RecetaRapidaModal } from './components/RecetaRapidaModal';
import { RecetasScreen } from './pages/RecetasScreen';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = location.pathname.substring(1) || 'dashboard';
  const setActiveTab = (tab: string) => navigate(`/${tab}`);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [search, setSearch] = useState('');
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [showAddConsultation, setShowAddConsultation] = useState(false);
  const [showEditPatient, setShowEditPatient] = useState(false);
  const [showPatientSearchModal, setShowPatientSearchModal] = useState(false);
  const [showConsultationSearchModal, setShowConsultationSearchModal] = useState(false);
  const [showRecetaRapida, setShowRecetaRapida] = useState(false);
  const [showViewConsultation, setShowViewConsultation] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfig, setDeleteConfig] = useState<{ message: string, onConfirm: () => void } | null>(null);
  const [patientDateFilter, setPatientDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const isAdmin = (profile?.email || user?.email) 
    ? ADMIN_EMAILS.includes((profile?.email || user?.email || "").toLowerCase().trim()) 
    : false;

  // Form states
  const [newPatient, setNewPatient] = useState({
    name: '',
    age: 30,
    gender: 'Femenino',
    bloodType: 'O+',
    allergies: '',
    height: 1.75,
    weight: 70,
    address: '',
    phone: '',
    personalHistory: '',
    familyHistory: ''
  });

  const [newConsultation, setNewConsultation] = useState({
    type: 'Consulta General',
    title: '',
    findings: '',
    diagnosis: '',
    plan: '',
    vitals: {
      bloodPressure: '120/80',
      labGabinete: ''
    }
  });

  useEffect(() => {
    testConnection();
    let profileUnsubscribe: () => void;

    const authUnsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      // Limpiar escucha previa si existe
      if (profileUnsubscribe) profileUnsubscribe();

      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        
        // 🚀 ESCUCHA EN TIEMPO REAL DEL PERFIL
        profileUnsubscribe = onSnapshot(userRef, async (userDoc) => {
          if (userDoc.exists()) {
            const existingData = userDoc.data() as UserProfile;
            
            // Lógica de mantenimiento del perfil (displayName, role, usage)
            let needsUpdate = false;
            let updatePayload: any = {};

            if (!existingData.displayName && firebaseUser.displayName) {
              needsUpdate = true;
              updatePayload.displayName = firebaseUser.displayName;
              updatePayload.photoURL = firebaseUser.photoURL || existingData.photoURL;
            }

            if (ADMIN_EMAILS.includes((firebaseUser.email || "").toLowerCase().trim()) && existingData.role !== 'admin') {
              needsUpdate = true;
              updatePayload.role = 'admin';
            }

            if (shouldResetMonthlyUsage(existingData.usageLastReset || existingData.usageResetDate)) {
               await resetMonthlyUsage(firebaseUser.uid);
               return; // El reset disparará de nuevo este onSnapshot
            }

            if (needsUpdate) {
              await updateDoc(userRef, updatePayload);
            }

            // Detección de éxito de pago (Legacy para URL, pero ahora onSnapshot lo captará del Webhook)
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('payment_success') === 'true' && existingData.plan === 'free') {
              await updateDoc(userRef, { plan: 'pro' });
              window.history.replaceState({}, document.title, window.location.pathname);
              alert("¡Felicidades! Tu plan ha sido actualizado a Pro exitosamente.");
            }

            setProfile(existingData);
          } else {
            // Inicializar perfil si no existe
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || '',
              email: firebaseUser.email || '',
              photoURL: firebaseUser.photoURL || '',
              plan: 'free',
              role: ADMIN_EMAILS.includes((firebaseUser.email || "").toLowerCase().trim()) ? 'admin' : 'doctor',
              consultationsThisMonth: 0,
              documentsThisMonth: 0,
              aiMessagesThisMonth: 0,
              usageResetDate: new Date(
                new Date().getFullYear(), 
                new Date().getMonth() + 1, 
                1
              ).toISOString()
            };
            await setDoc(userRef, newProfile);
          }
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      authUnsubscribe();
      if (profileUnsubscribe) profileUnsubscribe();
    };
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

  // Dashboard Stats: Escucha de documento ligero en vez de descarga masiva
  const [totalConsultations, setTotalConsultations] = useState(0);
  const [consultationsToday, setConsultationsToday] = useState(0);

  useEffect(() => {
    if (user) {
      const statsRef = doc(db, 'stats', user.uid);
      return onSnapshot(statsRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const todayStr = new Date().toISOString().split('T')[0];
          setTotalConsultations(data.total || 0);
          // Reinicia visualmente el contador diario si el documento tiene fecha vieja
          setConsultationsToday(data.date === todayStr ? (data.today || 0) : 0);
        } else {
          setTotalConsultations(0);
          setConsultationsToday(0);
        }
      }, (error) => {
        console.error('Error fetching stats:', error);
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

      try {
        const idToken = await user.getIdToken();
        const API_URL = (import.meta as any).env.VITE_API_URL || 
          (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:4000/api' : "/api");
        await fetch(`${API_URL}/user/profile`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
          },
          body: JSON.stringify(updates),
        });
      } catch (backendErr) {
        console.warn('Backend sync warning (Firestore updated successfully):', backendErr);
      }
      alert('¡Perfil e información institucional guardados con éxito!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const handleAddPatient = async () => {
    if (!user || !profile) return;
    
    const { allowed, limit } = canAddPatient(profile as any, patients.length);
    if (!allowed) {
      alert(`Has alcanzado el límite de ${limit} pacientes de tu plan gratuito. ¡Pásate al Plan Pro para registros ilimitados!`);
      setActiveTab('plans');
      return;
    }

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
        gender: 'Femenino',
        bloodType: 'O+',
        allergies: '',
        height: 1.75,
        weight: 70,
        address: '',
        phone: '',
        personalHistory: '',
        familyHistory: ''
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'patients');
    }
  };

  const handleAddConsultation = async () => {
    if (!user || !selectedPatient || !profile) return;

    // Consultations are currently unlimited as per user request, 
    // but we check anyway in case rules change in usageLimits.ts
    const { allowed } = canCreateConsultation(profile as any);
    if (!allowed) {
      alert("Has alcanzado el límite de consultas de tu plan.");
      setActiveTab('plans');
      return;
    }

    try {
      await addDoc(collection(db, 'patients', selectedPatient.id, 'consultations'), {
        ...newConsultation,
        doctorUid: user.uid,
        patientId: selectedPatient.id,
        date: serverTimestamp()
      });
      
      // Actualización atómica de estadísticas (Evita N+1 y descargas masivas)
      const todayStr = new Date().toISOString().split('T')[0];
      const statsRef = doc(db, 'stats', user.uid);
      const statsSnap = await getDoc(statsRef);
      if (!statsSnap.exists()) {
        await setDoc(statsRef, { total: 1, today: 1, date: todayStr });
      } else {
        const data = statsSnap.data();
        if (data.date !== todayStr) {
          // Es un nuevo día, reseteamos el contador de hoy
          await updateDoc(statsRef, { total: increment(1), today: 1, date: todayStr });
        } else {
          await updateDoc(statsRef, { total: increment(1), today: increment(1) });
        }
      }
      
      // Increment usage stats
      await incrementConsultationUsage(user.uid, profile.consultationsThisMonth || 0);

      setShowAddConsultation(false);
      setNewConsultation({
        type: 'Consulta General',
        title: '',
        findings: '',
        diagnosis: '',
        plan: '',
        vitals: {
          bloodPressure: '120/80',
          labGabinete: ''
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

  const handleDeleteReceta = async (recetaId: string) => {
    setDeleteConfig({
      message: '¿Está seguro de que desea eliminar esta receta? Esta acción no se puede deshacer.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'clinical_documents', recetaId));
          setShowDeleteConfirm(false);
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `clinical_documents/${recetaId}`);
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
    return <LandingPage onLogin={handleLogin} />;
  }

  return (
    <div className="flex min-h-screen bg-background overflow-x-hidden">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={profile}
        onLogout={handleLogout}
        isAdmin={isAdmin}
        onClearPatient={() => setSelectedPatient(null)}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen w-full">
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
                  : activeTab === 'recetas'
                  ? "Recetas"
                  : activeTab === 'assistant'
                    ? "Asistente de IA" 
                    : activeTab === 'plans'
                      ? "Planes de Pago"
                      : "Configuración"
          } 
          subtitle={
            selectedPatient
              ? selectedPatient.name
              : activeTab === 'recetas'
                ? "Historial de recetas emitidas"
                : undefined
          }
          search={search}
          onSearchChange={setSearch}
          setActiveTab={setActiveTab}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
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
                  profile={profile}
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
                      allergies: selectedPatient.allergies || '',
                      address: selectedPatient.address || '',
                      phone: selectedPatient.phone || '',
                      personalHistory: selectedPatient.personalHistory || '',
                      familyHistory: selectedPatient.familyHistory || ''
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
                      vitals: {
                        bloodPressure: c.vitals?.bloodPressure || '120/80',
                        labGabinete: c.vitals?.labGabinete || ''
                      }
                    });
                    setShowAddConsultation(true);
                  }}
                />
              ) : (
                <>
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={
                      <Dashboard
                        patients={patients}
                        onSelectPatient={setSelectedPatient}
                        onAddPatient={() => setShowAddPatient(true)}
                        onNewConsultation={() => {
                          setNewConsultation({
                            type: 'Consulta General',
                            title: '',
                            findings: '',
                            diagnosis: '',
                            plan: '',
                            vitals: {
                              bloodPressure: '120/80',
                              labGabinete: ''
                            }
                          });
                          setShowPatientSearchModal(true);
                        }}
                        onStartConsultation={(p) => {
                          setSelectedPatient(p);
                          setNewConsultation({
                            type: 'Consulta General',
                            title: '',
                            findings: '',
                            diagnosis: '',
                            plan: '',
                            vitals: {
                              bloodPressure: '120/80',
                              labGabinete: ''
                            }
                          });
                          setShowAddConsultation(true);
                        }}
                        onQuickRx={() => setShowRecetaRapida(true)}
                        search={search}
                        onSearchChange={setSearch}
                        user={profile}
                        setActiveTab={setActiveTab}
                        consultationsToday={consultationsToday}
                        totalConsultations={totalConsultations}
                      />
                    } />
                    <Route path="/patients" element={
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
                            allergies: p.allergies || '',
                            address: p.address || '',
                            phone: p.phone || '',
                            personalHistory: p.personalHistory || '',
                            familyHistory: p.familyHistory || ''
                          });
                          setShowEditPatient(true);
                        }}
                        onDeletePatient={handleDeletePatient}
                        onStartConsultation={(p) => {
                          setSelectedPatient(p);
                          setNewConsultation({
                            type: 'Consulta General',
                            title: '',
                            findings: '',
                            diagnosis: '',
                            plan: '',
                            vitals: {
                              bloodPressure: '120/80',
                              labGabinete: ''
                            }
                          });
                          setShowAddConsultation(true);
                        }}
                        search={search}
                        onSearchChange={setSearch}
                        dateFilter={patientDateFilter}
                        onDateFilterChange={setPatientDateFilter}
                      />
                    } />
                    <Route path="/generate" element={<DocumentGenerator user={user} profile={profile} />} />
                    <Route path="/recetas" element={<RecetasScreen doctorUid={user?.uid || ''} profile={profile} onDeleteReceta={handleDeleteReceta} />} />
                    <Route path="/assistant" element={<AIAssistant user={user} profile={profile} />} />
                    <Route path="/plans" element={<PaymentPlans user={profile} />} />
                    <Route path="/settings" element={<SettingsScreen user={profile} onUpdate={handleUpdateProfile} />} />
                    <Route path="/admin" element={isAdmin ? <AdminPanel currentUserEmail={profile?.email || ''} /> : <Navigate to="/dashboard" replace />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
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
                    <div className="input-field w-full bg-surface-low/50 flex items-center px-4 font-bold text-primary">
                      Femenino
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="label-atelier text-high-contrast/40 px-1">Teléfono</label>
                    <input 
                      className="input-field w-full" 
                      type="tel" 
                      placeholder="Ej: +1 809 000 0000"
                      value={newPatient.phone}
                      onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label className="label-atelier text-high-contrast/40 px-1">Dirección</label>
                    <input 
                      className="input-field w-full" 
                      type="text" 
                      placeholder="Ej: Calle 123, Ensanche Naco"
                      value={newPatient.address}
                      onChange={(e) => setNewPatient({ ...newPatient, address: e.target.value })}
                    />
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
                    rows={2}
                    value={newPatient.allergies}
                    onChange={(e) => setNewPatient({ ...newPatient, allergies: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="label-atelier text-high-contrast/40 px-1">Antecedentes Personales</label>
                    <textarea 
                      className="input-field w-full resize-none" 
                      rows={3}
                      value={newPatient.personalHistory}
                      onChange={(e) => setNewPatient({ ...newPatient, personalHistory: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="label-atelier text-high-contrast/40 px-1">Antecedentes Familiares</label>
                    <textarea 
                      className="input-field w-full resize-none" 
                      rows={3}
                      value={newPatient.familyHistory}
                      onChange={(e) => setNewPatient({ ...newPatient, familyHistory: e.target.value })}
                    />
                  </div>
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
                <div className="space-y-2">
                  <label className="label-atelier text-high-contrast/40 px-1">Laboratorio / Gabinete</label>
                  <textarea 
                    className="input-field w-full resize-none" 
                    rows={2}
                    placeholder="Ej: Hemograma, Química, Rayos X..."
                    value={newConsultation.vitals.labGabinete}
                    onChange={(e) => setNewConsultation({ ...newConsultation, vitals: { ...newConsultation.vitals, labGabinete: e.target.value } })}
                  />
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
                    <div className="input-field w-full bg-surface-low/50 flex items-center px-4 font-bold text-primary">
                      Femenino
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-6">
                  <div className="col-span-1 space-y-2">
                    <label className="label-atelier text-high-contrast/40 px-1">Teléfono</label>
                    <input 
                      className="input-field w-full" 
                      type="tel" 
                      value={newPatient.phone}
                      onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label className="label-atelier text-high-contrast/40 px-1">Dirección</label>
                    <input 
                      className="input-field w-full" 
                      type="text" 
                      value={newPatient.address}
                      onChange={(e) => setNewPatient({ ...newPatient, address: e.target.value })}
                    />
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
                    rows={2}
                    value={newPatient.allergies}
                    onChange={(e) => setNewPatient({ ...newPatient, allergies: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="label-atelier text-high-contrast/40 px-1">Antecedentes Personales</label>
                    <textarea 
                      className="input-field w-full resize-none" 
                      rows={3}
                      value={newPatient.personalHistory}
                      onChange={(e) => setNewPatient({ ...newPatient, personalHistory: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="label-atelier text-high-contrast/40 px-1">Antecedentes Familiares</label>
                    <textarea 
                      className="input-field w-full resize-none" 
                      rows={3}
                      value={newPatient.familyHistory}
                      onChange={(e) => setNewPatient({ ...newPatient, familyHistory: e.target.value })}
                    />
                  </div>
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

        {showRecetaRapida && user && (
          <RecetaRapidaModal
            patients={patients}
            profile={profile}
            doctorUid={user.uid}
            onClose={() => setShowRecetaRapida(false)}
          />
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
                vitals: {
                  bloodPressure: c.vitals?.bloodPressure || '120/80',
                  labGabinete: c.vitals?.labGabinete || ''
                }
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
                <div className="grid grid-cols-3 gap-6">
                  <div className="p-4 bg-surface-low rounded-xl border border-surface-high">
                    <p className="label-atelier text-high-contrast/40 uppercase tracking-widest text-[10px] mb-1">Presión Arterial</p>
                    <p className="body-atelier font-bold text-primary text-lg">{selectedConsultation.vitals?.bloodPressure || 'N/A'}</p>
                  </div>
                  <div className="p-4 bg-surface-low rounded-xl border border-surface-high">
                    <p className="label-atelier text-high-contrast/40 uppercase tracking-widest text-[10px] mb-1">Laboratorio / Gabinete</p>
                    <p className="body-atelier font-bold text-secondary text-lg">{selectedConsultation.vitals?.labGabinete || 'Ninguno'}</p>
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
