import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Sparkles, 
  Download, 
  Upload,
  User as UserIcon,
  Search,
  Calendar,
  ArrowLeft,
  ChevronDown,
  FileDown,
  Printer as PrintIcon,
  Check,
  Loader2,
  Stethoscope,
  Info,
  X,
  FileBox,
  MessageSquare,
  FileEdit,
  MoreVertical,
  Bot,
  UserPlus,
  Gavel,
  Copy,
  Activity,
  BriefcaseMedical
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User as FirebaseUser } from 'firebase/auth';
import { collection, query, where, getDocs, limit, addDoc, serverTimestamp, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile, ClinicalDocument } from '../types';
import { cn } from '../lib/utils';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { createChat, analyzeMedicalImage, generateStructuredCertification } from '../lib/ai';
import { CertificateRenderer } from './templates/CertificateRenderer';
import { CertificadoMedicoTemplate } from './templates/CertificadoMedicoTemplate';
import { ConstanciaNacimientoTemplate } from './templates/ConstanciaNacimientoTemplate';
import {
  PresupuestoMedicoTemplate,
  formatearMonto,
  totalPresupuesto,
  type ProcedimientoPresupuesto,
} from './templates/PresupuestoMedicoTemplate';
import mammoth from 'mammoth';
import * as pdfjs from 'pdfjs-dist';


// Configurar el worker de PDF.js (necesario para que funcione en el navegador)
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

type DocView = 'selection' | 'template' | 'ai';

/** Las tres plantillas membretadas de la consulta. */
type PlantillaId = 'certificado' | 'nacimiento' | 'presupuesto';

/** Estilos compartidos por los campos de las plantillas. */
const LBL = 'text-[10px] font-black text-high-contrast/30 uppercase tracking-widest px-1';
const INPUT = 'w-full h-14 px-5 bg-surface-low border border-surface-container-high rounded-2xl text-sm font-bold focus:outline-none focus:border-primary transition-all hover:bg-white';

const PLANTILLAS: { id: PlantillaId; label: string }[] = [
  { id: 'certificado', label: 'Certificado Médico' },
  { id: 'nacimiento', label: 'Constancia de Nacimiento' },
  { id: 'presupuesto', label: 'Presupuesto Médico' },
];

export const DocumentGenerator = ({ user, profile }: { user: FirebaseUser | null, profile: UserProfile | null }) => {
  const [view, setView] = useState<DocView>('selection');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  const [recentDocuments, setRecentDocuments] = useState<ClinicalDocument[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<ClinicalDocument | null>(null);
  
  const documentRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Fetch real documents
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'clinical_documents'),
      where('doctorUid', '==', user.uid),
      orderBy('createdAt', 'desc'),
      // Se piden de más porque las recetas se descartan abajo y este generador
      // debe seguir mostrando 5 documentos propios.
      limit(20)
    );
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as ClinicalDocument))
        // Las recetas Rx tienen su propio flujo (Receta Rápida) y no se abren aquí.
        .filter(doc => doc.certificationType !== 'receta' && doc.certificationType !== 'orden_lab')
        .slice(0, 5);
      setRecentDocuments(docs);
    });
  }, [user]);

  // --- Plantillas: las tres del papel membretado de la consulta ---
  const hoy = new Date().toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const [plantilla, setPlantilla] = useState<PlantillaId>('certificado');

  // Certificado médico narrativo
  const [certPaciente, setCertPaciente] = useState('');
  const [certFecha, setCertFecha] = useState(hoy);
  const [certCuerpo, setCertCuerpo] = useState('');

  // Constancia de nacimiento
  const [nac, setNac] = useState({
    nombreMadre: '',
    cedulaMadre: '',
    sexoProducto: 'Masculino',
    peso: '',
    hora: '',
    dia: '',
    mes: '',
    anio: String(new Date().getFullYear()),
    medicoTratante: '',
    fechaExpedicion: hoy,
  });

  // Presupuesto médico
  const [presCedula, setPresCedula] = useState('');
  const [presPaciente, setPresPaciente] = useState('');
  const [presFecha, setPresFecha] = useState(hoy);
  const [presDiagnostico, setPresDiagnostico] = useState('');
  const [procedimientos, setProcedimientos] = useState<ProcedimientoPresupuesto[]>([
    { descripcion: '', monto: 0 },
  ]);

  const certData = { paciente: certPaciente, fecha: certFecha, cuerpo: certCuerpo };
  const nacData = { ...nac, medicoTratante: nac.medicoTratante || profile?.displayName || '' };
  const presData = {
    cedulaPaciente: presCedula,
    nombrePaciente: presPaciente,
    fecha: presFecha,
    medicoTratante: profile?.displayName || '',
    diagnostico: presDiagnostico,
    procedimientos,
  };

  /** Nombre de paciente y contenido con los que se guarda cada plantilla. */
  const resumenPlantilla = () => {
    if (plantilla === 'certificado') {
      return { paciente: certPaciente, contenido: certCuerpo, data: certData };
    }
    if (plantilla === 'nacimiento') {
      return { paciente: nacData.nombreMadre, contenido: JSON.stringify(nacData, null, 2), data: nacData };
    }
    return { paciente: presPaciente, contenido: JSON.stringify(presData, null, 2), data: presData };
  };


  // AI Assistant State
  const [aiPrompt, setAiPrompt] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [generatedDocContent, setGeneratedDocContent] = useState('');
  const [certificationType, setCertificationType] = useState<'narrative' | 'birth'>('narrative');
  const [structuredData, setStructuredData] = useState<any | null>(null);



  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setIsExtracting(true);
    setExtractedText('');
    console.log("DocumentGenerator: Extracting text from file:", file.name, file.type);

    try {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
          try {
            const base64 = reader.result as string;
            const text = await analyzeMedicalImage(base64, "Extrae fielmente todo el texto de este documento médico.");
            setExtractedText(text);
            console.log("DocumentGenerator: Image text extracted.");
          } catch (e) {
            console.error("Error analizando imagen:", e);
            alert("No se pudo extraer texto de la imagen.");
          }
        };
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        // Soporte para .docx usando mammoth
        const reader = new FileReader();
        reader.onload = async (e) => {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          try {
            const result = await mammoth.extractRawText({ arrayBuffer });
            setExtractedText(result.value);
            console.log("DocumentGenerator: .docx text extracted.");
          } catch (err) {
            console.error("Error con mammoth:", err);
            alert("Error al leer el archivo Word.");
          }
        };
        reader.readAsArrayBuffer(file);
      } else if (file.type === 'application/pdf') {
        // Soporte para .pdf usando pdfjs-dist
        const reader = new FileReader();
        reader.onload = async (e) => {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          try {
            const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;
            let fullText = "";
            console.log(`DocumentGenerator: PDF loaded. Total pages: ${pdf.numPages}`);
            
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const content = await page.getTextContent();
              const strings = content.items.map((item: any) => item.str);
              fullText += `--- PÁGINA ${i} ---\n${strings.join(" ")}\n\n`;
            }
            setExtractedText(fullText);
            console.log("DocumentGenerator: Multi-page PDF text extracted successfully.");
          } catch (err) {
            console.error("Error con PDF.js:", err);
            alert("Error al leer el archivo PDF.");
          }
        };
        reader.readAsArrayBuffer(file);
      } else if (file.type === 'text/plain') {
        // Soporte para .txt
        const reader = new FileReader();
        reader.onload = (e) => {
          setExtractedText(e.target?.result as string);
          console.log("DocumentGenerator: .txt text extracted.");
        };
        reader.readAsText(file);
      } else {
        alert("Formato de archivo no soportado para extracción de texto. Prueba con PDF, Word, Imagen o TXT.");
      }
    } catch (error) {
      console.error("Error extrayendo texto:", error);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleGenerate = async () => {
    console.log("DocumentGenerator: Starting generation...", { view });
    setIsGenerating(true);
    
    try {
      if (view === 'template') {
        // ... (resto del código de plantilla idéntico)
        if (user) {
          console.log("DocumentGenerator: Saving template document...");
          const etiqueta = PLANTILLAS.find(p => p.id === plantilla)?.label || 'Documento';
          const resumen = resumenPlantilla();
          await addDoc(collection(db, 'clinical_documents'), {
            title: `${etiqueta} - ${resumen.paciente || 'Paciente'}`,
            subtitle: `Generado hoy • Plantilla: ${etiqueta}`,
            type: 'template',
            doctorUid: user.uid,
            patientName: resumen.paciente,
            createdAt: serverTimestamp(),
            content: resumen.contenido,
            structuredData: resumen.data,
            templateType: etiqueta
          });
          console.log("DocumentGenerator: Template document saved.");
        }

        await new Promise(resolve => setTimeout(resolve, 800));
        alert("¡Documento generado y guardado con éxito!");
        setIsGenerating(false);
        return;
      }

      if (!aiPrompt.trim() && !extractedText) {
        alert("Por favor ingresa una descripción o sube un archivo.");
        setIsGenerating(false);
        return;
      }
      
      console.log("DocumentGenerator: Calling Structured AI Certification...", { certificationType });
      
      const documentContext = extractedText ? `DOCUMENTO DE REFERENCIA SUBIDO (Extraído):\n"""\n${extractedText}\n"""\n\n` : "";
      const fullContext = `${documentContext}Perfil Doctor: Dra. ${profile?.displayName || ''} (${profile?.specialty || ''})`;
      
      const result = await generateStructuredCertification(aiPrompt, fullContext, certificationType);
      
      if (result && result.data) {
        setStructuredData(result.data);
        const titleText = certificationType === 'birth'
          ? `Constancia de Nacimiento - ${result.data.nombreMadre || 'Recién Nacido'}`
          : `Certificado Médico - ${result.data.patientName || 'Paciente'}`;
          
        setGeneratedDocContent(JSON.stringify(result.data, null, 2));

        if (user) {
          console.log("DocumentGenerator: Saving Structured AI document...");
          await addDoc(collection(db, 'clinical_documents'), {
            title: titleText,
            subtitle: `Generado hoy • Certificación (${certificationType})`,
            type: 'structured_certification',
            certificationType: certificationType,
            structuredData: result.data,
            doctorUid: user.uid,
            createdAt: serverTimestamp(),
            content: JSON.stringify(result.data, null, 2)
          });
          console.log("DocumentGenerator: Structured document saved.");
        }
      }
    } catch (error: any) {
      console.error("DocumentGenerator Error:", error);
      alert(`Error generando certificado: ${error.message || "Error desconocido"}`);
    } finally {
      setIsGenerating(false);
    }
  };


  const handleExportPDF = async () => {
    if (!documentRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(documentRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Documento_${new Date().getTime()}.pdf`);
    } finally {
      setIsExporting(false);
    }
  };

  const renderHeader = () => {
    if (view === 'selection') {
      return (
        <div className="h-20 bg-transparent flex items-center justify-between px-12">
          <div className="relative w-96">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-high-contrast/20" />
            <input 
              type="text" 
              placeholder="Buscar pacientes o documentos..." 
              className="w-full h-10 pl-11 bg-white/50 border border-surface-container-high rounded-full text-xs font-medium focus:outline-none focus:border-primary transition-all shadow-sm"
            />
          </div>
          <div className="flex items-center gap-6">
            <button className="text-high-contrast/40 hover:text-primary transition-colors"><MessageSquare className="w-5 h-5" /></button>
            <button className="text-high-contrast/40 hover:text-primary transition-colors"><Info className="w-5 h-5" /></button>
            <div className="flex items-center gap-3 pl-6 border-l border-surface-container-high">
              <div className="w-9 h-9 bg-primary text-white rounded-full flex items-center justify-center font-bold text-xs shadow-lg shadow-primary/20">
                <UserIcon className="w-4 h-4" />
              </div>
              <p className="text-xs font-black text-high-contrast/60 tracking-tight">Dr. {profile?.displayName?.split(' ')[1] || 'García'}</p>
            </div>
          </div>
        </div>
      );
    }

    if (view === 'ai') {
      return (
        <div className="h-20 bg-white border-b border-surface-container-high flex items-center justify-between px-10">
          <h2 className="text-sm font-black text-primary uppercase tracking-widest">Asistente IA</h2>
          <div className="flex items-center gap-6">
            <button className="text-high-contrast/40 hover:text-primary transition-colors"><MessageSquare className="w-5 h-5" /></button>
            <button className="text-high-contrast/40 hover:text-primary transition-colors"><Info className="w-5 h-5" /></button>
            <div className="w-10 h-10 bg-surface-low rounded-full flex items-center justify-center text-high-contrast/40">
              <UserIcon className="w-5 h-5" />
            </div>
          </div>
        </div>
      );
    }

    // Template View Header
    return (
      <div className="h-20 bg-white border-b border-surface-container-high flex items-center justify-between px-10">
        <div className="flex items-center gap-8 flex-1">
          <h2 className="text-lg font-black text-primary shrink-0">Generar Documento</h2>
          <div className="relative max-w-md w-full">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-high-contrast/20" />
            <input 
              type="text" 
              placeholder="Buscar por paciente o folio..." 
              className="w-full h-10 pl-11 bg-surface-low rounded-2xl text-xs font-medium focus:outline-none focus:border-primary border border-transparent transition-all"
            />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <button className="text-high-contrast/40 hover:text-primary transition-colors"><MessageSquare className="w-5 h-5" /></button>
          <button className="text-high-contrast/40 hover:text-primary transition-colors"><Info className="w-5 h-5" /></button>
          <div className="w-10 h-10 bg-surface-low rounded-full flex items-center justify-center text-high-contrast/40">
            <UserIcon className="w-5 h-5" />
          </div>
        </div>
      </div>
    );
  };

  const handleViewDoc = (doc: ClinicalDocument) => {
    setSelectedDoc(doc);
    if (doc.type === 'template') {
      setView('template');
      // Reabre la plantilla con la que se creó y repuebla sus campos.
      const guardado: any = doc.structuredData || {};
      if (doc.templateType === 'Constancia de Nacimiento') {
        setPlantilla('nacimiento');
        setNac(prev => ({ ...prev, ...guardado }));
      } else if (doc.templateType === 'Presupuesto Médico') {
        setPlantilla('presupuesto');
        setPresCedula(guardado.cedulaPaciente || '');
        setPresPaciente(guardado.nombrePaciente || doc.patientName || '');
        setPresFecha(guardado.fecha || hoy);
        setPresDiagnostico(guardado.diagnostico || '');
        setProcedimientos(
          Array.isArray(guardado.procedimientos) && guardado.procedimientos.length > 0
            ? guardado.procedimientos
            : [{ descripcion: '', monto: 0 }]
        );
      } else {
        setPlantilla('certificado');
        setCertPaciente(guardado.paciente || doc.patientName || '');
        setCertFecha(guardado.fecha || hoy);
        setCertCuerpo(guardado.cuerpo || doc.content || '');
      }
    } else {
      setView('ai');
      setGeneratedDocContent(doc.content || '');
      setStructuredData(doc.structuredData || null);
      // Este generador solo maneja 'narrative' y 'birth'; otros tipos (ej. 'receta',
      // emitido desde la Receta Rápida del dashboard) caen a 'narrative'.
      setCertificationType(doc.certificationType === 'birth' ? 'birth' : 'narrative');
    }
  };


  const renderSelection = () => (
    <div className="max-w-7xl mx-auto py-16 space-y-24 px-8">
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-black text-primary tracking-tight">Generar Documento</h1>
        <p className="text-high-contrast/40 font-medium text-xl">Crea certificados, cartas y documentos médicos con IA.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Usar Plantilla Card */}
        <motion.div 
          whileHover={{ y: -8, scale: 1.02 }}
          className="bg-white rounded-[3.5rem] p-14 border border-surface-container-high shadow-[0_20px_50px_rgba(0,0,0,0.02)] hover:shadow-[0_40px_80px_rgba(0,0,0,0.05)] transition-all flex flex-col items-center text-center space-y-10 group"
        >
          <div className="w-24 h-24 bg-primary/5 rounded-[2.5rem] flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-sm">
            <FileText className="w-12 h-12" />
          </div>
          <div className="space-y-4">
            <h2 className="text-3xl font-black text-high-contrast">Usar plantilla</h2>
            <p className="text-high-contrast/40 font-medium max-w-xs leading-relaxed">
              Genera documentos estructurados rápidamente utilizando nuestros formatos pre-establecidos para el sector salud.
            </p>
          </div>
          <button 
            onClick={() => { setSelectedDoc(null); setView('template'); }}
            className="h-16 px-12 bg-white border border-surface-container-high rounded-2xl text-base font-black flex items-center gap-3 hover:bg-surface-low transition-colors group-hover:border-primary/30"
          >
            Seleccionar plantilla <ArrowLeft className="w-5 h-5 rotate-180" />
          </button>
        </motion.div>

        {/* Asistente IA Card */}
        <motion.div 
          whileHover={{ y: -8, scale: 1.02 }}
          className="bg-white rounded-[3.5rem] p-14 border border-surface-container-high shadow-[0_20px_50px_rgba(0,0,0,0.02)] hover:shadow-[0_40px_80px_rgba(0,0,0,0.05)] transition-all flex flex-col items-center text-center space-y-10 group relative overflow-hidden"
        >
          <div className="w-24 h-24 bg-primary/5 rounded-[2.5rem] flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-sm">
            <div className="relative">
               <Bot className="w-12 h-12" />
               <Sparkles className="w-5 h-5 absolute -top-1 -right-1" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3">
              <h2 className="text-3xl font-black text-high-contrast">Asistente IA</h2>
              <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black rounded-full uppercase tracking-widest border border-primary/20">Beta</span>
            </div>
            <p className="text-high-contrast/40 font-medium max-w-xs leading-relaxed">
              Describe o sube un documento para trabajar con nuestra inteligencia artificial especializada en terminología médica.
            </p>
          </div>
          <button 
            onClick={() => { setSelectedDoc(null); setView('ai'); }}
            className="h-16 px-12 bg-primary text-white rounded-2xl text-base font-black flex items-center gap-4 hover:bg-primary-container transition-all shadow-xl shadow-primary/30"
          >
            Iniciar asistente <Sparkles className="w-5 h-5" />
          </button>
        </motion.div>
      </div>

      <div className="space-y-10">
        <div className="flex items-center justify-between">
          <h3 className="text-3xl font-black text-high-contrast tracking-tight">Recientes</h3>
          <button className="text-sm font-black text-primary flex items-center gap-2 hover:underline underline-offset-4">
            Ver todo el historial <Download className="w-4 h-4 rotate-[-90deg]" />
          </button>
        </div>
        
        <div className="grid grid-cols-1 gap-5">
          {recentDocuments.length > 0 ? (
            recentDocuments.map((item, i) => (
              <div 
                key={i} 
                onClick={() => handleViewDoc(item)}
                className="flex items-center justify-between p-7 bg-white border border-surface-container-high rounded-[2.5rem] hover:border-primary/30 hover:shadow-lg transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-8">
                  <div className="w-14 h-14 bg-surface-low rounded-2xl flex items-center justify-center text-high-contrast/30 group-hover:bg-primary/5 group-hover:text-primary transition-colors border border-transparent group-hover:border-primary/10">
                    {item.type === 'template' ? <FileText className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
                  </div>
                  <div>
                    <p className="text-lg font-black text-high-contrast group-hover:text-primary transition-colors">{item.title}</p>
                    <p className="text-sm font-medium text-high-contrast/30 mt-1">
                      {item.createdAt?.toDate ? new Date(item.createdAt.toDate()).toLocaleDateString() : 'Recién creado'} • {item.type === 'ai' ? 'Asistente IA' : `Plantilla: ${item.templateType}`}
                    </p>
                  </div>
                </div>
                <MoreVertical className="w-5 h-5 text-high-contrast/20 group-hover:text-primary/40 transition-colors" />
              </div>
            ))
          ) : (
            <div className="p-20 text-center border-2 border-dashed border-surface-container-high rounded-[3rem] bg-surface-low/20">
               <p className="text-high-contrast/20 font-black uppercase tracking-widest text-sm">No hay documentos recientes</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      {renderHeader()}

      <AnimatePresence mode="wait">
        {view === 'selection' ? (
          <motion.div key="selection" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex-1 overflow-y-auto no-scrollbar">
            {renderSelection()}
          </motion.div>
        ) : (
          <motion.div key="editor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex overflow-hidden">
            {view === 'template' ? (
              <div className="flex-1 flex overflow-hidden">
                {/* Template Config Left */}
                <div className="w-[560px] shrink-0 bg-white border-r border-surface-container-high overflow-y-auto no-scrollbar p-10 space-y-12">
                  <div className="space-y-6">
                    <button 
                      onClick={() => setView('selection')} 
                      className="flex items-center gap-3 bg-primary text-white px-6 py-3 rounded-2xl hover:bg-primary-container transition-all group shadow-lg shadow-primary/20"
                    >
                      <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                      <span className="text-xs font-black uppercase tracking-widest">Volver al panel</span>
                    </button>
                    <div className="space-y-4 pt-4">
                      <h2 className="text-4xl font-black text-high-contrast tracking-tight">Configurar Plantilla</h2>
                      <p className="text-sm font-medium text-high-contrast/40 leading-relaxed">Complete los campos para actualizar la vista previa en tiempo real.</p>
                    </div>
                  </div>

                  <div className="space-y-10">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-high-contrast/30 uppercase tracking-widest px-1">Plantilla</label>
                      <div className="relative group">
                        <select
                          className="w-full h-14 pl-5 pr-12 bg-surface-low border border-surface-container-high rounded-2xl text-sm font-black appearance-none focus:outline-none focus:border-primary transition-all group-hover:bg-white"
                          value={plantilla}
                          onChange={(e) => setPlantilla(e.target.value as PlantillaId)}
                        >
                          {PLANTILLAS.map(p => (
                            <option key={p.id} value={p.id}>{p.label}</option>
                          ))}
                        </select>
                        <ChevronDown className="w-5 h-5 absolute right-5 top-1/2 -translate-y-1/2 text-high-contrast/20 pointer-events-none" />
                      </div>
                    </div>

                    {/* --- Certificado Medico: paciente, fecha y cuerpo narrativo --- */}
                    {plantilla === 'certificado' && (
                      <div className="space-y-8">
                        <div className="space-y-3">
                          <label className={LBL}>Paciente</label>
                          <div className="relative">
                            <UserIcon className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-high-contrast/20" />
                            <input
                              type="text"
                              placeholder="Nombre del paciente"
                              className={INPUT + ' pl-14'}
                              value={certPaciente}
                              onChange={(e) => setCertPaciente(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="space-y-3">
                          <label className={LBL}>Fecha</label>
                          <input type="text" className={INPUT} value={certFecha} onChange={(e) => setCertFecha(e.target.value)} />
                        </div>
                        <div className="space-y-3">
                          <label className={LBL}>Cuerpo del certificado</label>
                          <textarea
                            placeholder="Se trata de paciente de 31 años de edad, ID 000-0000000-0, la cual llega vía Emergencia..."
                            className="w-full h-80 px-6 py-5 bg-white border border-surface-container-high rounded-2xl text-base font-medium text-high-contrast text-justify leading-[2] focus:outline-none focus:border-primary transition-all resize-y break-words [overflow-wrap:anywhere]"
                            value={certCuerpo}
                            onChange={(e) => setCertCuerpo(e.target.value)}
                          />
                          <p className="text-[11px] text-high-contrast/40 px-1">
                            Se escribe con la misma tipografía y márgenes del documento: lo que ves aquí es lo que sale impreso.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* --- Constancia de Nacimiento: un campo por renglon del formulario --- */}
                    {plantilla === 'nacimiento' && (
                      <div className="space-y-6">
                        <div className="space-y-3">
                          <label className={LBL}>Certificamos que la Sra.</label>
                          <input type="text" className={INPUT} value={nac.nombreMadre} onChange={(e) => setNac({ ...nac, nombreMadre: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <label className={LBL}>Cedula</label>
                            <input type="text" placeholder="000-0000000-0" className={INPUT} value={nac.cedulaMadre} onChange={(e) => setNac({ ...nac, cedulaMadre: e.target.value })} />
                          </div>
                          <div className="space-y-3">
                            <label className={LBL}>Producto</label>
                            <select className={INPUT} value={nac.sexoProducto} onChange={(e) => setNac({ ...nac, sexoProducto: e.target.value })}>
                              <option>Masculino</option>
                              <option>Femenino</option>
                            </select>
                          </div>
                          <div className="space-y-3">
                            <label className={LBL}>Peso</label>
                            <input type="text" placeholder="6 Lbs y media" className={INPUT} value={nac.peso} onChange={(e) => setNac({ ...nac, peso: e.target.value })} />
                          </div>
                          <div className="space-y-3">
                            <label className={LBL}>Hora</label>
                            <input type="text" placeholder="7:40 AM" className={INPUT} value={nac.hora} onChange={(e) => setNac({ ...nac, hora: e.target.value })} />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-3">
                            <label className={LBL}>Dia</label>
                            <input type="text" className={INPUT} value={nac.dia} onChange={(e) => setNac({ ...nac, dia: e.target.value })} />
                          </div>
                          <div className="space-y-3">
                            <label className={LBL}>Mes</label>
                            <input type="text" placeholder="JULIO" className={INPUT} value={nac.mes} onChange={(e) => setNac({ ...nac, mes: e.target.value })} />
                          </div>
                          <div className="space-y-3">
                            <label className={LBL}>Anio</label>
                            <input type="text" className={INPUT} value={nac.anio} onChange={(e) => setNac({ ...nac, anio: e.target.value })} />
                          </div>
                        </div>
                        <div className="space-y-3">
                          <label className={LBL}>Medico tratante</label>
                          <input type="text" placeholder={profile?.displayName || 'Dra. Isabel Beato'} className={INPUT} value={nac.medicoTratante} onChange={(e) => setNac({ ...nac, medicoTratante: e.target.value })} />
                        </div>
                        <div className="space-y-3">
                          <label className={LBL}>Fecha de expedicion</label>
                          <input type="text" className={INPUT} value={nac.fechaExpedicion} onChange={(e) => setNac({ ...nac, fechaExpedicion: e.target.value })} />
                        </div>
                      </div>
                    )}

                    {/* --- Presupuesto: diagnostico y procedimientos con monto --- */}
                    {plantilla === 'presupuesto' && (
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <label className={LBL}>Cedula / ID</label>
                            <input type="text" className={INPUT} value={presCedula} onChange={(e) => setPresCedula(e.target.value)} />
                          </div>
                          <div className="space-y-3">
                            <label className={LBL}>Fecha</label>
                            <input type="text" className={INPUT} value={presFecha} onChange={(e) => setPresFecha(e.target.value)} />
                          </div>
                        </div>
                        <div className="space-y-3">
                          <label className={LBL}>Paciente</label>
                          <input type="text" className={INPUT} value={presPaciente} onChange={(e) => setPresPaciente(e.target.value)} />
                        </div>
                        <div className="space-y-3">
                          <label className={LBL}>Diagnostico</label>
                          <textarea
                            placeholder="Rectocistocele grado II-III, Quiste de ovario derecho..."
                            className="w-full h-28 p-5 bg-surface-low border border-surface-container-high rounded-2xl text-sm font-medium focus:outline-none focus:border-primary transition-all resize-none leading-relaxed hover:bg-white"
                            value={presDiagnostico}
                            onChange={(e) => setPresDiagnostico(e.target.value)}
                          />
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <label className={LBL}>Procedimientos propuestos</label>
                            <button
                              type="button"
                              onClick={() => setProcedimientos(prev => [...prev, { descripcion: '', monto: 0 }])}
                              className="text-primary text-xs font-bold hover:underline"
                            >
                              + Agregar
                            </button>
                          </div>
                          <div className="space-y-3">
                            {procedimientos.map((proc, i) => (
                              <div key={i} className="p-4 bg-surface-low rounded-2xl border border-surface-container-high space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-black text-primary uppercase tracking-widest">#{i + 1}</span>
                                  <button
                                    type="button"
                                    onClick={() => setProcedimientos(prev => prev.length === 1 ? [{ descripcion: '', monto: 0 }] : prev.filter((_, j) => j !== i))}
                                    className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                    title="Eliminar procedimiento"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <textarea
                                  placeholder="Corpoperineorrafia anterior y posterior..."
                                  className="w-full h-20 p-3 bg-white border border-surface-container-high rounded-xl text-sm font-medium focus:outline-none focus:border-primary resize-none leading-relaxed"
                                  value={proc.descripcion}
                                  onChange={(e) => setProcedimientos(prev => prev.map((p, j) => j === i ? { ...p, descripcion: e.target.value } : p))}
                                />
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-black text-high-contrast/40">RD$</span>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="12000"
                                    className="flex-1 h-11 px-4 bg-white border border-surface-container-high rounded-xl text-sm font-bold focus:outline-none focus:border-primary"
                                    value={proc.monto || ''}
                                    onChange={(e) => setProcedimientos(prev => prev.map((p, j) => j === i ? { ...p, monto: Number(e.target.value) || 0 } : p))}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-between items-center pt-2 px-1">
                            <span className="text-[10px] font-black text-high-contrast/40 uppercase tracking-widest">Total</span>
                            <span className="text-sm font-black text-primary">{formatearMonto(totalPresupuesto(procedimientos))}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-8">
                    <button 
                      onClick={handleGenerate}
                      disabled={isGenerating || !resumenPlantilla().paciente.trim()}
                      className="w-full h-16 bg-primary text-white rounded-2xl font-black flex items-center justify-center gap-4 hover:bg-primary-container transition-all shadow-xl shadow-primary/20 disabled:opacity-50"
                    >
                      <div className="relative">
                        <Sparkles className="w-6 h-6" />
                        {isGenerating && <Loader2 className="w-6 h-6 absolute inset-0 animate-spin" />}
                      </div>
                      GENERAR DOCUMENTO
                    </button>
                  </div>
                </div>

                {/* Preview Right */}
                <div className="flex-1 bg-surface-low/30 overflow-y-auto no-scrollbar p-16">
                  <div className="max-w-[900px] mx-auto space-y-8">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-primary">
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Vista Previa en Tiempo Real</span>
                      </div>
                      <div className="flex gap-4">
                        <button onClick={handleExportPDF} disabled={isExporting} className="h-11 px-5 bg-white border border-surface-container-high rounded-xl text-xs font-black flex items-center gap-2 hover:shadow-lg transition-all">
                          <FileDown className="w-4 h-4 text-primary" /> PDF
                        </button>
                        <button onClick={() => window.print()} className="h-11 px-6 bg-primary text-white rounded-xl text-xs font-black flex items-center gap-3 hover:bg-primary-container transition-all shadow-xl shadow-primary/20">
                          <PrintIcon className="w-4 h-4" /> IMPRIMIR
                        </button>
                      </div>
                    </div>

                    <div id="printable-document">
                      {plantilla === 'certificado' && (
                        <CertificadoMedicoTemplate data={certData} profile={profile} documentRef={documentRef} />
                      )}
                      {plantilla === 'nacimiento' && (
                        <ConstanciaNacimientoTemplate data={nacData} profile={profile} documentRef={documentRef} />
                      )}
                      {plantilla === 'presupuesto' && (
                        <PresupuestoMedicoTemplate data={presData} profile={profile} documentRef={documentRef} />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex overflow-hidden">
                {/* AI Assistant Left */}
                <div className="w-[480px] bg-white border-r border-surface-container-high overflow-y-auto no-scrollbar p-12 flex flex-col">
                  <div className="space-y-10 flex-1">
                    <div className="space-y-6">
                      <button 
                        onClick={() => setView('selection')} 
                        className="flex items-center gap-3 bg-primary text-white px-6 py-3 rounded-2xl hover:bg-primary-container transition-all group shadow-lg shadow-primary/20 w-fit"
                      >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-xs font-black uppercase tracking-widest">Volver al panel</span>
                      </button>
                      <div className="pt-4">
                        <h2 className="text-xs font-black text-primary uppercase tracking-[0.4em]">EDITOR INTELIGENTE</h2>
                        <p className="text-2xl font-black text-high-contrast tracking-tight">¿Qué documento crearemos hoy?</p>
                      </div>
                    </div>

                    <div className="space-y-8">
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-high-contrast/40 uppercase tracking-widest px-1">Tipo de Certificación IA</label>
                          <div className="flex gap-3">
                            <button
                              type="button"
                              onClick={() => setCertificationType('narrative')}
                              className={cn(
                                "flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all border",
                                certificationType === 'narrative'
                                  ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                                  : "bg-surface-low text-high-contrast/70 border-surface-container-high hover:border-primary/30"
                              )}
                            >
                              📜 Certificado Médico
                            </button>
                            <button
                              type="button"
                              onClick={() => setCertificationType('birth')}
                              className={cn(
                                "flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all border",
                                certificationType === 'birth'
                                  ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20"
                                  : "bg-surface-low text-high-contrast/70 border-surface-container-high hover:border-emerald-500/30"
                              )}
                            >
                              👶 Nacido Vivo
                            </button>
                          </div>
                        </div>

                        <div className="relative group">
                          <textarea 
                            placeholder={certificationType === 'birth' ? "Ingresa datos del nacimiento (Nombre de la madre, sexo, peso, hora, fecha...)" : "Describe el certificado que necesitas..."}
                            className="w-full h-64 p-8 bg-surface-low border border-surface-container-high rounded-[2.5rem] text-base font-medium focus:outline-none focus:border-primary focus:bg-white transition-all resize-none leading-relaxed shadow-inner"
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                          />
                          <button 
                            onClick={handleGenerate}
                            disabled={isGenerating || (!aiPrompt.trim() && !extractedText)}
                            className="absolute bottom-6 right-6 w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center hover:bg-primary-container transition-all shadow-xl shadow-primary/30 group-hover:scale-105 disabled:opacity-50 disabled:scale-100"
                          >
                            {isGenerating ? <Loader2 className="w-6 h-6 animate-spin" /> : <ArrowLeft className="w-6 h-6 rotate-[90deg]" />}
                          </button>
                        </div>
                      </div>

                      <div 
                        className="border-2 border-dashed border-surface-container-high rounded-[3rem] p-12 flex flex-col items-center justify-center text-center gap-5 hover:border-primary/30 transition-all bg-surface-low/50 cursor-pointer group hover:bg-white"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                        <div className="w-16 h-16 bg-white rounded-[1.5rem] flex items-center justify-center text-primary shadow-sm group-hover:scale-110 transition-transform border border-surface-container-high">
                          {isExtracting ? <Loader2 className="w-8 h-8 animate-spin" /> : <FileText className="w-8 h-8" />}
                        </div>
                        <div className="space-y-2">
                          <p className="text-base font-black text-high-contrast">{uploadedFile ? uploadedFile.name : "Subir PDF, DOCX o Imágenes"}</p>
                          <p className="text-[11px] font-medium text-high-contrast/30 uppercase tracking-widest max-w-[250px]">Arrastra y suelta tus archivos aquí para referencia clínica</p>
                        </div>
                      </div>

                      <div className="space-y-5 pt-4">
                        <p className="text-[10px] font-black text-high-contrast/30 uppercase tracking-widest px-1">Acciones rápidas</p>
                        <div className="grid grid-cols-2 gap-4">
                          {[
                            { label: "Modificar este documento", icon: <FileEdit className="w-4 h-4" />, action: () => setAiPrompt(prev => prev + "\nModifica el documento anterior para...") },
                            { label: "Cambiar nombre del paciente", icon: <UserPlus className="w-4 h-4" />, action: () => setAiPrompt(prev => prev + "\nCambia el nombre del paciente a: ") },
                            { label: "Hacer más formal", icon: <Gavel className="w-4 h-4" />, action: () => setAiPrompt(prev => prev + "\nRedacta el documento con un tono más formal y técnico.") },
                            { label: "Limpiar editor", icon: <X className="w-4 h-4" />, action: () => { setAiPrompt(''); setExtractedText(''); setUploadedFile(null); setGeneratedDocContent(''); setStructuredData(null); } }
                          ].map((action, i) => (
                            <button 
                              key={i} 
                              onClick={action.action}
                              className="flex items-center gap-4 p-5 bg-white border border-surface-container-high rounded-2xl text-left hover:border-primary/30 hover:shadow-md transition-all group"
                            >
                              <div className="text-primary group-hover:scale-110 transition-transform">{action.icon}</div>
                              <span className="text-xs font-bold text-high-contrast/70">{action.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-12">
                    <button 
                      onClick={handleGenerate}
                      disabled={isGenerating || (!aiPrompt.trim() && !extractedText)}
                      className="w-full h-18 bg-primary text-white rounded-2xl font-black flex items-center justify-center gap-4 hover:bg-primary-container transition-all shadow-xl shadow-primary/30 py-5 disabled:opacity-50"
                    >
                      {isGenerating ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6" />}
                      {isGenerating ? "GENERANDO..." : "GENERAR CON IA"}
                    </button>
                  </div>
                </div>

                {/* AI Preview Right con CertificateRenderer */}
                <div className="flex-1 bg-[#EEF2FF] overflow-y-auto no-scrollbar p-16 relative flex flex-col items-center">
                  <AnimatePresence mode="wait">
                    {generatedDocContent || structuredData ? (
                      <motion.div 
                        key="document"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-[800px] w-full space-y-8"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 text-primary">
                            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Documento Estructurado IA</span>
                          </div>
                          <div className="flex gap-4">
                            <button onClick={handleExportPDF} disabled={isExporting} className="h-11 px-5 bg-white border border-surface-container-high rounded-xl text-xs font-black flex items-center gap-2 hover:shadow-lg transition-all">
                              <FileDown className="w-4 h-4 text-primary" /> PDF
                            </button>
                          </div>
                        </div>

                        <CertificateRenderer
                          documentContent={generatedDocContent}
                          structuredData={structuredData}
                          certificationType={certificationType}
                          profile={profile}
                          documentRef={documentRef}
                        />
                      </motion.div>
                    ) : (
                      <motion.div 
                        key="placeholder"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center"
                      >
                        <div className="relative group">
                          <div className="absolute -inset-10 bg-primary/10 blur-[100px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                          <div className="w-[500px] aspect-[1/1.4] bg-white rounded-[2.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.08)] relative overflow-hidden p-16 space-y-10">
                            <div className="w-24 h-5 bg-surface-low rounded-full" />
                            <div className="space-y-5">
                              <div className="w-full h-4 bg-surface-low rounded-full" />
                              <div className="w-full h-4 bg-surface-low rounded-full" />
                              <div className="w-2/3 h-4 bg-surface-low rounded-full" />
                            </div>
                            <div className="w-full aspect-[4/3] bg-surface-low rounded-3xl" />
                            <div className="space-y-4">
                              <div className="w-full h-4 bg-surface-low rounded-full" />
                              <div className="w-4/5 h-4 bg-surface-low rounded-full" />
                            </div>
                            
                            <div className="absolute bottom-12 right-12 w-20 h-20 bg-white border border-surface-container-high rounded-3xl shadow-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-500">
                              <Sparkles className="w-10 h-10" />
                            </div>
                          </div>
                        </div>

                        <div className="mt-16 text-center space-y-5">
                          <h3 className="text-3xl font-black text-high-contrast tracking-tight">Tu documento cobra vida aquí</h3>
                          <p className="text-high-contrast/40 font-medium max-w-sm leading-relaxed text-lg">
                            La vista previa aparecerá cuando la IA genere el documento basándose en tus instrucciones o archivos subidos.
                          </p>
                        </div>

                        <div className="mt-16 flex items-center gap-6">
                          <div className="flex -space-x-3">
                             {['REC', 'INV', 'LAB'].map((t, i) => (
                               <div key={i} className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-[10px] font-black text-white border-[6px] border-[#EEF2FF] uppercase tracking-tighter shadow-sm">{t}</div>
                             ))}
                          </div>
                          <p className="text-[11px] font-black text-high-contrast/30 uppercase tracking-[0.2em]">Soporta múltiples formatos médicos</p>
                        </div>

                        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 px-8 py-4 bg-white/90 backdrop-blur-xl border border-white rounded-full shadow-xl flex items-center gap-4">
                          <div className="w-2.5 h-2.5 bg-primary rounded-full animate-pulse shadow-[0_0_10px_rgba(25,25,112,0.5)]" />
                          <span className="text-xs font-black text-primary uppercase tracking-[0.2em]">IA optimizada para el modelo de salud local</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
