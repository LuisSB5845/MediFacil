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
  incrementAIUsage, 
  resetMonthlyUsage, 
  shouldResetMonthlyUsage,
  formatUsageDisplay
} from './lib/usageLimits';

const ADMIN_EMAILS = ["androxus512rbm@gmail.com", "luise.sb5845@gmail.com"];

const STRIPE_MONTHLY_URL = "https://buy.stripe.com/test_28E3cxfmlb6Ha5b6zz6kg04";
const STRIPE_YEARLY_URL = "https://buy.stripe.com/test_14A28tded4Ija5b3nn6kg05";

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
                <a 
                  href={STRIPE_MONTHLY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-16 rounded-3xl bg-white text-[#191970] flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl relative overflow-hidden group/btn"
                >
                  <span className="relative z-10">Elegir Plan Médico</span>
                  <motion.div 
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent -translate-x-full"
                    animate={{ translateX: ["100%", "-100%"] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  />
                </a>
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
              <a 
                href={STRIPE_YEARLY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-14 rounded-2xl bg-white/10 border border-white/10 text-white text-xs font-black uppercase tracking-widest hover:bg-white/20 transition-all active:scale-95 flex items-center justify-center"
              >
                Elegir Plan Anual Médico
              </a>
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
  consultationsThisMonth: number;
  documentsThisMonth: number;
  aiMessagesThisMonth: number;
  usageResetDate: string;
  // Legacy fields for compatibility
  usageThisMonth?: number;
  usageLastReset?: any;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: any;
}

// --- Components ---

const Sidebar = ({ activeTab, setActiveTab, user, onLogout, isAdmin, onClearPatient }: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: UserProfile | null;
  onLogout: () => void;
  isAdmin: boolean;
  onClearPatient: () => void;
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
    <aside className="fixed inset-y-0 left-0 flex flex-col justify-between py-6 px-4 sidebar-gradient h-screen w-64 overflow-y-auto z-50 shadow-ambient no-scrollbar">
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
              onClick={() => {
                setActiveTab(tab.id);
                onClearPatient();
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

const Dashboard = ({ patients, onSelectPatient, onAddPatient, onNewConsultation, onStartConsultation, search, onSearchChange, user, setActiveTab, consultationsToday, totalConsultations }: {
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
            <h2 className="text-[4rem] font-bold text-white leading-tight tracking-tight">
              {user?.gender === 'female' ? "Bienvenida, Dra. " : "Bienvenido, Dr. "}{user?.displayName?.split(' ')[0] || "Especialista"}
            </h2>
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


const DocumentGenerator = () => {
  return (
    <div className="flex-1 flex items-center justify-center p-12 bg-surface-container-low min-h-[600px]">
      <div className="text-center space-y-8 max-w-2xl p-16 bg-white rounded-[32px] shadow-premium-soft border border-primary/5 animate-in zoom-in duration-700">
        <div className="w-28 h-28 bg-primary/10 rounded-[28px] flex items-center justify-center mx-auto mb-4 rotate-3 hover:rotate-0 transition-transform duration-500">
          <FileText className="w-14 h-14 text-primary" />
        </div>
        <div className="space-y-4">
          <h3 className="text-4xl font-headline font-black text-primary tracking-tight">Generador de Documentos</h3>
          <p className="text-on-surface-variant text-lg leading-relaxed max-w-md mx-auto">
            Estamos perfeccionando nuestro motor de transcripción IA para brindarle la máxima precisión médica.
          </p>
        </div>
        <div className="inline-flex items-center gap-3 px-8 py-4 bg-secondary/10 rounded-2xl border border-secondary/20 group cursor-default">
          <div className="w-3 h-3 bg-secondary rounded-full animate-pulse" />
          <span className="text-secondary font-black tracking-widest text-sm uppercase">Próximamente disponible en su región</span>
        </div>
      </div>
    </div>
  );
};

const AIAssistant = () => {
  return (
    <div className="flex-1 flex items-center justify-center p-12 bg-surface-container-low">
      <div className="text-center space-y-8 max-w-2xl p-16 bg-white rounded-[32px] shadow-premium-soft border border-primary/5 animate-in slide-in-from-bottom-8 duration-700">
        <div className="w-28 h-28 sidebar-gradient rounded-[28px] flex items-center justify-center mx-auto mb-4 shadow-xl -rotate-3 hover:rotate-0 transition-transform duration-500">
          <Bot className="w-14 h-14 text-white" />
        </div>
        <div className="space-y-4">
          <h3 className="text-4xl font-headline font-black text-primary tracking-tight">Asistente Clínico IA</h3>
          <p className="text-on-surface-variant text-lg leading-relaxed max-w-md mx-auto">
            Estamos integrando Gemini 1.5 Pro para ofrecerle análisis diagnósticos de última generación con total privacidad.
          </p>
        </div>
        <div className="inline-flex items-center gap-4 px-8 py-4 bg-primary/5 rounded-2xl border border-primary/10">
          <Sparkles className="w-5 h-5 text-primary animate-pulse" />
          <span className="text-primary font-black tracking-widest text-sm uppercase">Fase de pruebas Beta</span>
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
              <div className="space-y-2">
                <label className="label-atelier text-high-contrast/40 px-1 uppercase tracking-widest text-[10px]">Género / Trato</label>
                <div className="flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setFormData({ ...formData, gender: 'male' })}
                    className={cn(
                      "flex-1 p-4 rounded-xl border-2 transition-all font-bold text-sm flex items-center justify-center gap-2",
                      formData.gender === 'male' 
                        ? "bg-primary/5 border-primary text-primary" 
                        : "bg-surface-low border-surface-container-high text-high-contrast/40 hover:border-primary/30"
                    )}
                  >
                    <UserIcon className="w-4 h-4" />
                    Dr. (Masculino)
                  </button>
                  <button 
                    type="button"
                    onClick={() => setFormData({ ...formData, gender: 'female' })}
                    className={cn(
                      "flex-1 p-4 rounded-xl border-2 transition-all font-bold text-sm flex items-center justify-center gap-2",
                      formData.gender === 'female' 
                        ? "bg-secondary/5 border-secondary text-secondary" 
                        : "bg-surface-low border-surface-container-high text-high-contrast/40 hover:border-secondary/30"
                    )}
                  >
                    <UserIcon className="w-4 h-4" />
                    Dra. (Femenino)
                  </button>
                </div>
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
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'users'));
        setUsers(snapshot.docs.map(d => ({ 
          uid: d.id, 
          ...d.data() 
        } as UserProfile)));
      } catch (err) {
        console.error('Error fetching users:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleChangePlan = (uid: string, newPlan: 'free' | 'pro' | 'whitelisted') => {
    setConfirmConfig({
      title: "Confirmar Cambio de Plan",
      message: `¿Estás seguro que deseas cambiar el plan de este usuario a ${newPlan.toUpperCase()}?`,
      onConfirm: async () => {
        setUpdatingId(uid);
        try {
          await updateDoc(doc(db, 'users', uid), { plan: newPlan });
          setUsers(prev => prev.map(u => u.uid === uid ? { ...u, plan: newPlan } : u));
        } catch (err) {
          console.error('Error updating plan:', err);
        } finally {
          setUpdatingId(null);
          setConfirmConfig(null);
        }
      }
    });
  };

  const handleChangeRole = (uid: string, newRole: 'doctor' | 'admin') => {
    setConfirmConfig({
      title: "Confirmar Cambio de Rol",
      message: `¿Estás seguro que deseas cambiar el rol de este usuario a ${newRole.toUpperCase()}? El acceso administrativo otorga control total sobre la plataforma.`,
      onConfirm: async () => {
        setUpdatingId(uid);
        try {
          await updateDoc(doc(db, 'users', uid), { role: newRole });
          setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role: newRole } : u));
        } catch (err) {
          console.error('Error updating role:', err);
        } finally {
          setUpdatingId(null);
          setConfirmConfig(null);
        }
      }
    });
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
      <AnimatePresence>
        {confirmConfig && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmConfig(null)}
              className="absolute inset-0 bg-[#191970]/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative card-atelier w-full max-w-md p-8 border-none shadow-2xl"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="title-atelier text-primary">{confirmConfig.title}</h3>
              </div>
              <p className="body-atelier text-high-contrast/70 mb-8 leading-relaxed">
                {confirmConfig.message}
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setConfirmConfig(null)}
                  className="flex-1 btn-secondary"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmConfig.onConfirm}
                  className="flex-1 btn-primary"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div>
        <h2 className="text-3xl font-bold text-primary tracking-tight">Gestión de Usuarios</h2>
        <p className="text-high-contrast/60 text-sm mt-1 font-medium">
          {users.length} usuarios registrados · Acceso administrativo exclusivo
        </p>
      </div>

      <div className="space-y-3">
        {users.map(u => (
          <div
            key={u.uid}
            className="flex items-center justify-between p-5 rounded-2xl bg-white border border-surface-container-high shadow-ambient transition-all hover:shadow-lg hover:-translate-y-0.5"
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src={u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName)}&background=191970&color=fff`}
                  alt={u.displayName}
                  className="w-12 h-12 rounded-full object-cover border-2 border-surface-container-low"
                />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
              </div>
              <div>
                <p className="text-base font-bold text-primary">{u.displayName}</p>
                <p className="text-xs font-medium text-high-contrast/60">{u.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  {u.specialty && (
                    <p className="text-[10px] font-black uppercase tracking-widest text-high-contrast/30">{u.specialty}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full border ${getPlanBadge(u.plan)}`}>
                {u.plan || 'free'}
              </span>

              {u.email !== currentUserEmail && (
                <div className="flex items-center gap-2">
                  <div className="relative group">
                    <select
                      disabled={updatingId === u.uid}
                      value={u.plan || 'free'}
                      onChange={(e) => handleChangePlan(u.uid, e.target.value as any)}
                      className="text-xs font-bold bg-surface-container-low border border-surface-container-high rounded-xl px-4 py-2.5 text-primary hover:bg-white hover:border-primary/30 transition-all focus:outline-none focus:ring-2 focus:ring-primary/10 disabled:opacity-50 cursor-pointer appearance-none pr-10"
                    >
                      <option value="free">Free</option>
                      <option value="pro">Pro</option>
                      <option value="whitelisted">Whitelisted ✓</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-primary/40">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              )}

              {u.email === currentUserEmail && (
                <span className="text-[10px] font-bold text-high-contrast/30 uppercase tracking-widest bg-surface-container-low px-3 py-1.5 rounded-full">Admin Root</span>
              )}

              {updatingId === u.uid && (
                <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
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
      heartRate: 72,
      labGabinete: ''
    }
  });

  useEffect(() => {
    testConnection();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        
        if (userDoc.exists()) {
          const existingData = userDoc.data() as UserProfile;
          
          if (!existingData.displayName && firebaseUser.displayName) {
            await updateDoc(doc(db, 'users', firebaseUser.uid), {
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL || existingData.photoURL
            });
            existingData.displayName = firebaseUser.displayName;
            existingData.photoURL = firebaseUser.photoURL || existingData.photoURL;
          }
          
          // Legacy usage reset check (keeping for safety during transition)
          if (shouldResetMonthlyUsage(existingData.usageLastReset || existingData.usageResetDate)) {
            await resetMonthlyUsage(firebaseUser.uid);
            const refreshDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            setProfile(refreshDoc.data() as UserProfile);
          } else {
            // Ensure admin role for designated emails
            if (ADMIN_EMAILS.includes((firebaseUser.email || "").toLowerCase().trim()) && existingData.role !== 'admin') {
              const updatedData = { ...existingData, role: 'admin' as const };
              await updateDoc(doc(db, 'users', firebaseUser.uid), { role: 'admin' });
              setProfile(updatedData);
            } else {
              setProfile(existingData);
            }
          }

          // Payment success detection
          const urlParams = new URLSearchParams(window.location.search);
          if (urlParams.get('payment_success') === 'true' && existingData.plan === 'free') {
            await updateDoc(doc(db, 'users', firebaseUser.uid), { plan: 'pro' });
            setProfile({ ...existingData, plan: 'pro' });
            window.history.replaceState({}, document.title, window.location.pathname);
            alert("¡Felicidades! Tu plan ha sido actualizado a Pro exitosamente.");
          }
        } else {
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

  // Fetch all consultations for dashboard stats
  const [allConsultations, setAllConsultations] = useState<Consultation[]>([]);

  useEffect(() => {
    if (user) {
      const q = query(
        collectionGroup(db, 'consultations'),
        where('doctorUid', '==', user.uid),
        orderBy('date', 'desc')
      );
      return onSnapshot(q, (snapshot) => {
        setAllConsultations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Consultation)));
      }, (error) => {
        console.error('Error fetching consultations:', error);
      });
    }
  }, [user]);

  // Calculate stats for dashboard
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const consultationsToday = allConsultations.filter(c => {
    const cDate = new Date(c.date?.toDate?.() || c.date);
    cDate.setHours(0, 0, 0, 0);
    return cDate.getTime() === today.getTime();
  }).length;

  const totalConsultations = allConsultations.length;

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
          heartRate: 72,
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
    <div className="flex min-h-screen bg-background">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={profile}
        onLogout={handleLogout}
        isAdmin={isAdmin}
        onClearPatient={() => setSelectedPatient(null)}
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
                      vitals: c.vitals || { bloodPressure: '120/80', heartRate: 72, labGabinete: '' }
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
                      consultationsToday={consultationsToday}
                      totalConsultations={totalConsultations}
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
                        setShowAddConsultation(true);
                      }}
                      search={search}
                      onSearchChange={setSearch}
                      dateFilter={patientDateFilter}
                      onDateFilterChange={setPatientDateFilter}
                    />
                  )}
                  {activeTab === 'generate' && <DocumentGenerator user={user} profile={profile} />}
                  {activeTab === 'assistant' && <AIAssistant user={user} profile={profile} />}
                  {activeTab === 'plans' && <PaymentPlans user={profile} />}
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
                <div className="grid grid-cols-3 gap-6">
                  <div className="p-4 bg-surface-low rounded-xl border border-surface-high">
                    <p className="label-atelier text-high-contrast/40 uppercase tracking-widest text-[10px] mb-1">Presión Arterial</p>
                    <p className="body-atelier font-bold text-primary text-lg">{selectedConsultation.vitals?.bloodPressure || 'N/A'}</p>
                  </div>
                  <div className="p-4 bg-surface-low rounded-xl border border-surface-high">
                    <p className="label-atelier text-high-contrast/40 uppercase tracking-widest text-[10px] mb-1">Frecuencia Cardíaca</p>
                    <p className="body-atelier font-bold text-primary text-lg">{selectedConsultation.vitals?.heartRate || 'N/A'} <span className="text-[10px] font-medium text-high-contrast/40">LPM</span></p>
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
