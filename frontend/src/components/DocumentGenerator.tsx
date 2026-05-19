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
import { createChat, analyzeMedicalImage } from '../lib/ai';
import mammoth from 'mammoth';
import * as pdfjs from 'pdfjs-dist';

// Configurar el worker de PDF.js (necesario para que funcione en el navegador)
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

type DocView = 'selection' | 'template' | 'ai';

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
      limit(5)
    );
    return onSnapshot(q, (snapshot) => {
      setRecentDocuments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClinicalDocument)));
    });
  }, [user]);

  // Template Form State
  const [formData, setFormData] = useState({
    type: 'Certificado Médico',
    patientName: 'Alejandro González R.',
    diagnosis: 'Faringoamigdalitis aguda bacteriana con compromiso de nódulos linfáticos cervicales...',
    restDays: '3',
    dateFrom: '05/24/2026',
    dateTo: '05/31/2026',
    observations: 'Reposo absoluto por 72 horas. Abundante ingesta de líquidos.'
  });

  const [patients, setPatients] = useState<any[]>([]);
  const [showPatientSearch, setShowPatientSearch] = useState(false);

  // AI Assistant State
  const [aiPrompt, setAiPrompt] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [generatedDocContent, setGeneratedDocContent] = useState('');

  // Búsqueda de pacientes
  useEffect(() => {
    if (formData.patientName.length > 2 && showPatientSearch) {
      const fetchPatients = async () => {
        const q = query(
          collection(db, 'patients'),
          where('doctorUid', '==', user?.uid),
          limit(5)
        );
        const snap = await getDocs(q);
        setPatients(snap.docs.map(d => d.data()));
      };
      fetchPatients();
    }
  }, [formData.patientName, showPatientSearch, user]);

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
          await addDoc(collection(db, 'clinical_documents'), {
            title: `${formData.type} - ${formData.patientName}`,
            subtitle: `Generado hoy • Plantilla: ${formData.type}`,
            type: 'template',
            doctorUid: user.uid,
            patientName: formData.patientName,
            createdAt: serverTimestamp(),
            content: formData.diagnosis,
            templateType: formData.type
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
      
      console.log("DocumentGenerator: Calling AI...");
      const chat = createChat();
      
      // Prompt especializado para GENERAR DOCUMENTOS, no para chatear
      const documentContext = extractedText ? `DOCUMENTO DE REFERENCIA SUBIDO (Extraído):\n"""\n${extractedText}\n"""\n\n` : "";
      
      const promptWithContext = `Eres un transcriptor y redactor médico experto. Tu tarea es generar el CUERPO de un documento clínico basado en las instrucciones del doctor.
 
${documentContext}
INSTRUCCIÓN DEL DOCTOR: "${aiPrompt}"
 
REGLAS CRÍTICAS:
1. Responde ÚNICAMENTE con el contenido del documento.
2. NO incluyas saludos, introducciones ("Aquí tienes...", "Entendido...") ni despedidas.
3. Si el doctor pide cambiar datos (como su nombre o el del paciente), cámbialos en el texto final.
4. Mantén un tono profesional y clínico.
 
CONTENIDO DEL DOCUMENTO:`;

      const result = await chat.sendMessage(promptWithContext);
      const text = await result.response.then(r => r.text());
      const cleanText = text.trim();
      setGeneratedDocContent(cleanText);
      console.log("DocumentGenerator: AI response received.");

      // Guardar documento generado por IA
      if (user) {
        console.log("DocumentGenerator: Saving AI document...");
        await addDoc(collection(db, 'clinical_documents'), {
          title: `Documento Personalizado`,
          subtitle: `Generado hoy • Asistente IA`,
          type: 'ai',
          doctorUid: user.uid,
          createdAt: serverTimestamp(),
          content: cleanText
        });
        console.log("DocumentGenerator: AI document saved.");
      }
    } catch (error: any) {
      console.error("DocumentGenerator Error:", error);
      alert(`Error generando documento: ${error.message || "Error desconocido"}`);
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
      setFormData({
        ...formData,
        type: doc.templateType || 'Certificado Médico',
        patientName: doc.patientName || '',
        diagnosis: doc.content
      });
    } else {
      setView('ai');
      setGeneratedDocContent(doc.content);
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
                <div className="w-[480px] bg-white border-r border-surface-container-high overflow-y-auto no-scrollbar p-12 space-y-12">
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
                      <label className="text-[10px] font-black text-high-contrast/30 uppercase tracking-widest px-1">Tipo de documento</label>
                      <div className="relative group">
                        <select 
                          className="w-full h-14 pl-5 pr-12 bg-surface-low border border-surface-container-high rounded-2xl text-sm font-black appearance-none focus:outline-none focus:border-primary transition-all group-hover:bg-white"
                          value={formData.type}
                          onChange={(e) => setFormData({...formData, type: e.target.value})}
                        >
                          <option>Certificado Médico</option>
                          <option>Reposo Médico</option>
                          <option>Referimiento</option>
                          <option>Carta de Constancia</option>
                        </select>
                        <ChevronDown className="w-5 h-5 absolute right-5 top-1/2 -translate-y-1/2 text-high-contrast/20 pointer-events-none" />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-high-contrast/30 uppercase tracking-widest px-1">Paciente</label>
                      <div className="relative">
                        <UserIcon className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-high-contrast/20" />
                        <input 
                          type="text"
                          placeholder="Buscar paciente..."
                          className="w-full h-14 pl-14 pr-4 bg-surface-low border border-surface-container-high rounded-2xl text-sm font-bold focus:outline-none focus:border-primary transition-all hover:bg-white"
                          value={formData.patientName}
                          onChange={(e) => setFormData({...formData, patientName: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-high-contrast/30 uppercase tracking-widest px-1">Diagnóstico / Motivo</label>
                      <textarea 
                        placeholder="Ingresa el diagnóstico médico..." 
                        className="w-full h-36 p-5 bg-surface-low border border-surface-container-high rounded-2xl text-sm font-medium focus:outline-none focus:border-primary transition-all resize-none leading-relaxed hover:bg-white" 
                        value={formData.diagnosis} 
                        onChange={(e) => setFormData({...formData, diagnosis: e.target.value})} 
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-high-contrast/30 uppercase tracking-widest px-1">Fecha Emisión</label>
                        <div className="relative">
                          <input type="text" className="w-full h-14 px-4 bg-surface-low border border-surface-container-high rounded-2xl text-sm font-bold hover:bg-white" value={formData.dateFrom} />
                          <Calendar className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-high-contrast/20" />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-high-contrast/30 uppercase tracking-widest px-1">Vigencia</label>
                        <div className="relative">
                          <input type="text" className="w-full h-14 px-4 bg-surface-low border border-surface-container-high rounded-2xl text-sm font-bold hover:bg-white" value={formData.dateTo} placeholder="00/00/00" />
                          <Calendar className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-high-contrast/20" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-high-contrast/30 uppercase tracking-widest px-1">Observaciones</label>
                      <textarea 
                        placeholder="Notas adicionales..." 
                        className="w-full h-28 p-5 bg-surface-low border border-surface-container-high rounded-2xl text-sm font-medium focus:outline-none focus:border-primary transition-all resize-none leading-relaxed hover:bg-white" 
                        value={formData.observations} 
                        onChange={(e) => setFormData({...formData, observations: e.target.value})} 
                      />
                    </div>
                  </div>

                  <div className="pt-8">
                    <button 
                      onClick={handleGenerate}
                      disabled={isGenerating || !formData.patientName}
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

                    <div className="bg-white rounded-[2.5rem] shadow-ambient border border-surface-container-high p-24 relative flex flex-col min-h-[1200px]" ref={documentRef}>
                       {/* Document Header */}
                       <div className="flex justify-between items-start border-b-2 border-primary/5 pb-14 mb-20">
                         <div className="flex items-center gap-10">
                            <div className="w-24 h-24 bg-primary/5 rounded-[2.5rem] border border-primary/10 flex items-center justify-center text-primary shadow-sm">
                               <BriefcaseMedical className="w-12 h-12" />
                            </div>
                            <div>
                              <h2 className="text-3xl font-black text-primary leading-tight">Dra. {profile?.displayName || 'Isabel Beato'}</h2>
                              <p className="text-xs font-bold text-high-contrast/50 uppercase tracking-[0.2em] mt-1.5">{profile?.specialty || 'Especialista en Medicina Interna'}</p>
                              <div className="space-y-0.5 mt-3">
                                <p className="text-[10px] font-black text-high-contrast/20 uppercase tracking-widest">Cédula Profesional: 72549103 | Reg. SSA: 55432</p>
                                <p className="text-[10px] font-black text-high-contrast/20 uppercase tracking-widest">Universidad Autónoma de México</p>
                              </div>
                            </div>
                         </div>
                         <div className="text-right space-y-1">
                            <p className="text-sm font-black text-high-contrast/80 uppercase tracking-widest leading-relaxed">MediFácil Hospital Arcos</p>
                            <p className="text-[10px] font-medium text-high-contrast/40 leading-relaxed">Av. Santa Fe 482, Piso 12</p>
                            <p className="text-[10px] font-medium text-high-contrast/40 leading-relaxed">CDMX, CP 05348</p>
                            <p className="text-[10px] font-medium text-high-contrast/40 leading-relaxed">Tel: (55) 8842-1000</p>
                         </div>
                      </div>

                      <div className="flex-1">
                        <div className="space-y-20">
                          <div className="text-center relative">
                            <h1 className="text-4xl font-black text-primary tracking-[0.5em] uppercase">{formData.type}</h1>
                            <div className="w-32 h-1 bg-primary/10 mx-auto mt-8" />
                          </div>
                          <div className="space-y-14 text-high-contrast leading-[2.2] text-justify text-xl font-medium px-4">
                            <p className="text-2xl font-black tracking-tight">A QUIEN CORRESPONDA:</p>
                            <p>
                              Por medio de la presente, la suscrita legalmente autorizada para ejercer la medicina, hace constar que tras la valoración clínica realizada el día de hoy, el paciente <strong className="text-high-contrast font-black underline decoration-primary/20 underline-offset-8">{formData.patientName || '__________________________'}</strong>, de 34 años de edad, presenta un cuadro clínico compatible con:
                            </p>
                            {formData.diagnosis && (
                              <div className="bg-surface-low/40 p-10 rounded-[2rem] border-l-[6px] border-primary/20 italic text-lg leading-relaxed shadow-sm">
                                {formData.diagnosis}
                              </div>
                            )}
                            <p>Se expide la presente a solicitud del interesado para los fines legales a que haya lugar.</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-24 flex items-center gap-8 text-high-contrast/10">
                        <div className="flex-1 h-[2px] bg-current" />
                        <div className="flex items-center gap-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.5em]">MediFácil • The Clinical Atelier</p>
                        </div>
                        <div className="flex-1 h-[2px] bg-current" />
                      </div>
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
                      <div className="relative group">
                        <textarea 
                          placeholder="Describe el documento que necesitas o sube un archivo de referencia..."
                          className="w-full h-72 p-10 bg-surface-low border border-surface-container-high rounded-[3rem] text-base font-medium focus:outline-none focus:border-primary focus:bg-white transition-all resize-none leading-relaxed shadow-inner"
                          value={aiPrompt}
                          onChange={(e) => setAiPrompt(e.target.value)}
                        />
                        <button 
                          onClick={handleGenerate}
                          disabled={isGenerating || (!aiPrompt.trim() && !extractedText)}
                          className="absolute bottom-8 right-8 w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center hover:bg-primary-container transition-all shadow-xl shadow-primary/30 group-hover:scale-105 disabled:opacity-50 disabled:scale-100"
                        >
                          {isGenerating ? <Loader2 className="w-6 h-6 animate-spin" /> : <ArrowLeft className="w-6 h-6 rotate-[90deg]" />}
                        </button>
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
                            { label: "Limpiar editor", icon: <X className="w-4 h-4" />, action: () => { setAiPrompt(''); setExtractedText(''); setUploadedFile(null); setGeneratedDocContent(''); } }
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
                      {isGenerating ? "GENERANDO..." : "ANALIZAR CON IA"}
                    </button>
                  </div>
                </div>

                {/* AI Preview Right */}
                <div className="flex-1 bg-[#EEF2FF] overflow-y-auto no-scrollbar p-16 relative flex flex-col items-center">
                  <AnimatePresence mode="wait">
                    {generatedDocContent ? (
                      <motion.div 
                        key="document"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-[800px] w-full space-y-8"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 text-primary">
                            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Documento Generado por IA</span>
                          </div>
                          <div className="flex gap-4">
                            <button onClick={handleExportPDF} disabled={isExporting} className="h-11 px-5 bg-white border border-surface-container-high rounded-xl text-xs font-black flex items-center gap-2 hover:shadow-lg transition-all">
                              <FileDown className="w-4 h-4 text-primary" /> PDF
                            </button>
                          </div>
                        </div>

                        <div className="bg-white rounded-[2.5rem] shadow-ambient border border-surface-container-high p-20 relative flex flex-col min-h-[1100px] h-auto w-full overflow-visible" ref={documentRef}>
                           {/* Document Header (Reusing Template Header Style) */}
                           <div className="flex justify-between items-start border-b-2 border-primary/5 pb-10 mb-14 shrink-0">
                             <div className="flex items-center gap-8">
                                <div className="w-16 h-16 bg-primary/5 rounded-2xl border border-primary/10 flex items-center justify-center text-primary shadow-sm">
                                   <BriefcaseMedical className="w-8 h-8" />
                                </div>
                                <div>
                                  <h2 className="text-xl font-black text-primary leading-tight">Dra. {profile?.displayName || 'Isabel Beato'}</h2>
                                  <p className="text-[10px] font-bold text-high-contrast/50 uppercase tracking-widest mt-1">{profile?.specialty || 'Especialista'}</p>
                                </div>
                             </div>
                             <div className="text-right">
                                <p className="text-[10px] font-black text-high-contrast/80 uppercase tracking-widest">MediFácil Hospital Arcos</p>
                                <p className="text-[8px] font-medium text-high-contrast/40 uppercase">{new Date().toLocaleDateString('es-DO', { dateStyle: 'long' })}</p>
                             </div>
                          </div>

                          <div className="flex-1 whitespace-pre-wrap text-high-contrast leading-[1.8] text-justify text-base font-medium px-4 pb-20">
                            {generatedDocContent}
                          </div>

                          <div className="mt-auto pt-10 border-t border-surface-container-high flex flex-col items-center shrink-0">
                            <div className="w-48 h-[1px] bg-high-contrast/20 mb-4" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-high-contrast/40">Firma Autorizada</p>
                          </div>
                        </div>
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
