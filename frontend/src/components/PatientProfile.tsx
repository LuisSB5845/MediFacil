import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight,
  Plus, 
  Trash2, 
  Eye, 
  Edit3, 
  Copy, 
  Activity, 
  History, 
  AlertCircle,
  Calendar,
  User,
  Phone,
  MapPin,
  QrCode,
  PenTool,
  CreditCard,
  FolderOpen,
  FileText,
  Pill,
  FlaskConical,
  Menu,
  ShieldCheck,
  BriefcaseMedical
} from 'lucide-react';
import { motion } from 'motion/react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { Patient, Consultation, ClinicalDocument, UserProfile } from '../types';
import { cn } from '../lib/utils';
import { DocumentViewerModal } from './DocumentViewerModal';

interface PatientProfileProps {
  patient: Patient;
  onBack: () => void;
  onAddConsultation: () => void;
  onEditPatient: () => void;
  onDeletePatient: (id: string) => void;
  onDeleteConsultation: (pid: string, cid: string) => void;
  onViewConsultation: (c: Consultation) => void;
  onCopyConsultation: (c: Consultation) => void;
  /** Perfil del médico: alimenta el membrete de los documentos al verlos. */
  profile?: UserProfile | null;
}

export const PatientProfile = ({
  patient,
  profile,
  onBack,
  onAddConsultation,
  onEditPatient,
  onDeletePatient,
  onDeleteConsultation,
  onViewConsultation,
  onCopyConsultation
}: PatientProfileProps) => {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [documents, setDocuments] = useState<ClinicalDocument[]>([]);
  const [docAbierto, setDocAbierto] = useState<ClinicalDocument | null>(null);
  const [consultaPage, setConsultaPage] = useState(1);
  const [docPage, setDocPage] = useState(1);

  // Documentos emitidos a este paciente. Se filtra por nombre en cliente:
  // clinical_documents guarda patientName, no el id del paciente, y un `where`
  // extra exigiria un indice compuesto nuevo.
  useEffect(() => {
    if (!patient.doctorUid) return;
    const q = query(
      collection(db, 'clinical_documents'),
      where('doctorUid', '==', patient.doctorUid),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const objetivo = patient.name.trim().toLowerCase();
      setDocuments(
        snapshot.docs
          .map(d => ({ id: d.id, ...d.data() } as ClinicalDocument))
          .filter(d => (d.patientName || '').trim().toLowerCase() === objetivo)
      );
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'clinical_documents');
    });
  }, [patient.doctorUid, patient.name]);

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

  // --- Paginación de ambos listados del expediente ---
  const CONSULTAS_POR_PAGINA = 6;
  const DOCS_POR_PAGINA = 5;

  const consultaPaginas = Math.max(1, Math.ceil(consultations.length / CONSULTAS_POR_PAGINA));
  const consultaPageSafe = Math.min(consultaPage, consultaPaginas);
  const consultasPagina = consultations.slice(
    (consultaPageSafe - 1) * CONSULTAS_POR_PAGINA,
    consultaPageSafe * CONSULTAS_POR_PAGINA
  );

  const docPaginas = Math.max(1, Math.ceil(documents.length / DOCS_POR_PAGINA));
  const docPageSafe = Math.min(docPage, docPaginas);
  const docsPagina = documents.slice(
    (docPageSafe - 1) * DOCS_POR_PAGINA,
    docPageSafe * DOCS_POR_PAGINA
  );

  const formatoFecha = (valor: any) => {
    const d = valor?.toDate ? valor.toDate() : new Date(valor);
    return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  /** Controles Anterior/Siguiente compartidos por los dos listados. */
  const Paginador = ({
    pagina,
    paginas,
    onCambio,
    etiqueta,
  }: {
    pagina: number;
    paginas: number;
    onCambio: (p: number) => void;
    etiqueta: string;
  }) => (
    <div className="flex items-center justify-between pt-1">
      <button
        onClick={() => onCambio(Math.max(1, pagina - 1))}
        disabled={pagina === 1}
        className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-outline-variant/30 text-xs font-bold text-[#191970] hover:bg-surface-container-low transition-colors disabled:opacity-40 disabled:pointer-events-none"
      >
        <ChevronLeft className="w-4 h-4" /> Anterior
      </button>
      <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
        Página {pagina} de {paginas} · {etiqueta}
      </span>
      <button
        onClick={() => onCambio(Math.min(paginas, pagina + 1))}
        disabled={pagina === paginas}
        className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-outline-variant/30 text-xs font-bold text-[#191970] hover:bg-surface-container-low transition-colors disabled:opacity-40 disabled:pointer-events-none"
      >
        Siguiente <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );

  /** Primeras palabras de los hallazgos, cuando no hay diagnóstico escrito. */
  const extracto = (texto: string, limite = 120) => {
    const limpio = (texto || '').trim().replace(/\s+/g, ' ');
    return limpio.length > limite ? limpio.slice(0, limite) + '…' : limpio;
  };

  const resumenDocumento = (doc: ClinicalDocument): string => {
    const d: any = doc.structuredData;
    if (!d) return extracto(doc.content || '', 90);
    if (doc.certificationType === 'orden_lab') {
      const n = (d.seleccionados || []).length;
      return n > 0 ? `${n} estudio${n === 1 ? '' : 's'} solicitado${n === 1 ? '' : 's'}` : 'Sin estudios';
    }
    if (doc.certificationType === 'receta') return extracto(d.contenido || '', 90);
    if (doc.certificationType === 'presupuesto') return extracto(d.diagnostico || '', 90);
    return extracto(d.cuerpo || d.nombreMadre || doc.title || '', 90);
  };

  const tipoDocumento = (doc: ClinicalDocument) => {
    if (doc.certificationType === 'receta') return { label: 'Receta Rx', Icono: Pill };
    if (doc.certificationType === 'orden_lab') return { label: 'Laboratorio', Icono: FlaskConical };
    if (doc.certificationType === 'birth' || doc.templateType === 'Constancia de Nacimiento') {
      return { label: 'Constancia', Icono: FileText };
    }
    if (doc.certificationType === 'presupuesto' || doc.templateType === 'Presupuesto Médico') {
      return { label: 'Presupuesto', Icono: FileText };
    }
    return { label: 'Certificado', Icono: FileText };
  };


  return (
    <div className="space-y-8 p-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto">
      {/* Navigation & Header */}
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={onBack}
          className="group flex items-center gap-3 text-high-contrast/40 hover:text-primary transition-all font-bold uppercase tracking-widest text-[10px]"
        >
          <div className="w-8 h-8 rounded-full bg-surface-low border border-surface-container-high flex items-center justify-center group-hover:bg-primary/5 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </div>
          Pacientes <span className="opacity-40">/</span> <span className="text-high-contrast">{patient.name}</span>
        </button>
      </div>

      {/* Patient Profile Card */}
      <div className="card-atelier p-10 bg-white border border-surface-container-high shadow-ambient relative overflow-hidden group">
        {/* Background Accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 transition-transform group-hover:scale-110" />
        
        <div className="relative flex flex-col md:flex-row gap-8 items-start">
          {/* Avatar */}
          <div className="w-28 h-28 bg-surface-low rounded-[2rem] flex items-center justify-center text-primary font-bold text-3xl border-2 border-primary/20 shadow-lg relative shrink-0">
            {patient.name.split(' ').map(n => n[0]).join('')}
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-lg border border-white">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="flex-1 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="title-atelier text-3xl text-primary mb-2">{patient.name}</h2>
                <div className="flex flex-wrap items-center gap-4">
                  <span className="px-3 py-1 bg-surface-low rounded-lg text-[10px] font-black uppercase tracking-widest text-high-contrast/40 border border-surface-container-high">
                    #{patient.id.slice(-8).toUpperCase()}
                  </span>
                  <span className="text-xs font-bold text-high-contrast/60 uppercase tracking-widest">
                    {patient.gender}
                  </span>
                  <span className="text-xs font-bold text-high-contrast/60 uppercase tracking-widest">
                    {patient.age} Años
                  </span>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={onEditPatient} className="btn-primary flex items-center gap-2 group/btn">
                  <Edit3 className="w-4 h-4 group-hover/btn:rotate-12 transition-transform" />
                  Modificar Perfil
                </button>
                <button onClick={() => onDeletePatient(patient.id)} className="px-5 py-2.5 rounded-2xl bg-red-50 text-red-500 font-bold text-sm border border-red-100 hover:bg-red-100 transition-all flex items-center gap-2 group/del">
                  <Trash2 className="w-4 h-4 group-hover/del:shake transition-transform" />
                  Eliminar
                </button>
              </div>
            </div>

            {/* Core Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-6 pt-6 border-t border-surface-container-low">
              <div className="space-y-1">
                <p className="label-atelier text-high-contrast/40 uppercase tracking-widest text-[9px]">Alergias</p>
                <p className={cn(
                  "body-atelier font-bold flex items-center gap-1.5",
                  patient.allergies?.toLowerCase() === 'ninguna' ? "text-emerald-500" : "text-red-500"
                )}>
                  <AlertCircle className="w-3 h-3" />
                  {patient.allergies || 'Ninguna'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="label-atelier text-high-contrast/40 uppercase tracking-widest text-[9px]">Grupo Sanguíneo</p>
                <p className="body-atelier font-bold text-primary">{patient.bloodType}</p>
              </div>
              <div className="space-y-1">
                <p className="label-atelier text-high-contrast/40 uppercase tracking-widest text-[9px]">Estatura</p>
                <p className="body-atelier font-bold text-high-contrast">{patient.height} m</p>
              </div>
              <div className="space-y-1">
                <p className="label-atelier text-high-contrast/40 uppercase tracking-widest text-[9px]">Peso</p>
                <p className="body-atelier font-bold text-high-contrast">{patient.weight} kg</p>
              </div>
            </div>

            {/* New Contact Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-surface-container-low">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-surface-low flex items-center justify-center text-primary/40 border border-surface-container-high">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <p className="label-atelier text-high-contrast/40 uppercase tracking-widest text-[9px]">Dirección</p>
                  <p className="body-atelier font-medium text-xs text-high-contrast">{patient.address || 'No registrada'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-surface-low flex items-center justify-center text-primary/40 border border-surface-container-high">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <p className="label-atelier text-high-contrast/40 uppercase tracking-widest text-[9px]">Teléfono</p>
                  <p className="body-atelier font-medium text-xs text-high-contrast">{patient.phone || 'No registrado'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* History Grid (Personal & Family) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="card-atelier p-8 bg-white border border-surface-container-high">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary">
              <User className="w-5 h-5" />
            </div>
            <h3 className="title-atelier text-xl text-primary font-bold">Antecedentes Personales</h3>
          </div>
          <div className="p-4 bg-surface-low rounded-2xl border border-surface-container-high min-h-[100px]">
            <p className="body-atelier text-sm text-high-contrast/70 leading-relaxed italic">
              {patient.personalHistory || 'No se han registrado antecedentes personales patológicos o no patológicos.'}
            </p>
          </div>
        </div>

        <div className="card-atelier p-8 bg-white border border-surface-container-high">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <BriefcaseMedical className="w-5 h-5" />
            </div>
            <h3 className="title-atelier text-xl text-primary font-bold">Antecedentes Familiares</h3>
          </div>
          <div className="p-4 bg-surface-low rounded-2xl border border-surface-container-high min-h-[100px]">
            <p className="body-atelier text-sm text-high-contrast/70 leading-relaxed italic">
              {patient.familyHistory || 'No se han registrado antecedentes heredofamiliares.'}
            </p>
          </div>
        </div>
      </div>

      {/* Historial de Consultas — el nucleo del expediente, va primero */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="title-atelier text-2xl text-primary font-bold">Historial de Consultas</h3>
            <span className="px-3 py-1 bg-surface-low rounded-full text-xs font-black text-high-contrast/30 border border-surface-container-high tracking-widest">
              {consultations.length}
            </span>
          </div>
          <button onClick={onAddConsultation} className="btn-primary">
            <Plus className="w-5 h-5" />
            Nueva Consulta
          </button>
        </div>

        {consultations.length > 0 ? (
          <div className="space-y-3">
            {consultasPagina.map(consultation => {
              // El diagnostico manda; si no hay, se muestra el motivo/hallazgos.
              const principal = (consultation.diagnosis || '').trim() || extracto(consultation.findings || '');
              return (
                <div
                  key={consultation.id}
                  className="group flex flex-col md:flex-row md:items-start justify-between gap-5 p-5 bg-white border border-surface-container-high rounded-2xl hover:border-primary/30 hover:shadow-lg transition-all"
                >
                  <div className="flex gap-5 min-w-0 flex-1">
                    {/* Fecha, tipo y vitales */}
                    <div className="w-28 shrink-0 space-y-2">
                      <p className="text-xs font-black text-high-contrast whitespace-nowrap">
                        {formatoFecha(consultation.date)}
                      </p>
                      <span className="inline-block px-2.5 py-1 rounded-full bg-primary/5 text-primary text-[9px] font-black uppercase tracking-widest border border-primary/10">
                        {consultation.type}
                      </span>
                      {consultation.vitals?.bloodPressure && (
                        <p className="text-[10px] font-bold text-high-contrast/40 flex items-center gap-1">
                          <Activity className="w-3 h-3" /> PA {consultation.vitals.bloodPressure}
                        </p>
                      )}
                    </div>

                    {/* Contenido clinico */}
                    <div className="min-w-0 flex-1 space-y-2 pt-0.5">
                      <p className="text-sm font-bold text-on-surface leading-relaxed group-hover:text-primary transition-colors">
                        {principal || 'Consulta sin notas registradas'}
                      </p>
                      {consultation.vitals?.labGabinete && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-low text-[10px] font-bold text-high-contrast/50 border border-surface-container-high">
                          <FlaskConical className="w-3 h-3" />
                          {extracto(consultation.vitals.labGabinete, 60)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-start">
                    <button
                      onClick={() => onCopyConsultation(consultation)}
                      title="Copiar contenido a nueva consulta"
                      className="p-2 rounded-lg bg-surface-low text-high-contrast/50 hover:bg-primary/10 hover:text-primary transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onViewConsultation(consultation)}
                      title="Ver detalle completo"
                      className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteConsultation(patient.id, consultation.id)}
                      title="Eliminar consulta"
                      className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}

            {consultaPaginas > 1 && (
              <Paginador
                pagina={consultaPageSafe}
                paginas={consultaPaginas}
                onCambio={setConsultaPage}
                etiqueta={`${consultations.length} consultas`}
              />
            )}
          </div>
        ) : (
          <div className="card-atelier p-16 text-center border-dashed border-2 bg-surface-low/30 border-surface-container-high">
            <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-high-contrast/10 shadow-lg">
              <FolderOpen className="w-10 h-10" />
            </div>
            <h4 className="title-atelier text-primary mb-2">Sin Registro Clínico</h4>
            <p className="body-atelier text-high-contrast/60">No se han registrado consultas médicas para este expediente aún.</p>
            <button
              onClick={onAddConsultation}
              className="mt-6 text-primary font-black uppercase tracking-widest text-xs hover:underline flex items-center gap-2 mx-auto"
            >
              <Plus className="w-4 h-4" />
              Registrar primera consulta
            </button>
          </div>
        )}
      </div>

      {/* Documentos emitidos a este paciente */}
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <h3 className="title-atelier text-2xl text-primary font-bold">Documentos</h3>
          <span className="px-3 py-1 bg-surface-low rounded-full text-xs font-black text-high-contrast/30 border border-surface-container-high tracking-widest">
            {documents.length}
          </span>
        </div>

        {documents.length > 0 ? (
          <div className="space-y-3">
            {docsPagina.map(doc => {
              const { label, Icono } = tipoDocumento(doc);
              return (
                <div
                  key={doc.id}
                  className="group flex items-center justify-between gap-5 p-5 bg-white border border-surface-container-high rounded-2xl hover:border-primary/30 hover:shadow-lg transition-all"
                >
                  <div className="flex items-center gap-5 min-w-0 flex-1">
                    <p className="w-28 shrink-0 text-xs font-black text-high-contrast whitespace-nowrap">
                      {formatoFecha(doc.createdAt)}
                    </p>
                    <span className="w-36 shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/5 text-primary text-[9px] font-black uppercase tracking-widest border border-primary/10">
                      <Icono className="w-3 h-3" /> {label}
                    </span>
                    <p className="min-w-0 flex-1 text-sm font-bold text-on-surface truncate group-hover:text-primary transition-colors">
                      {resumenDocumento(doc)}
                    </p>
                  </div>
                  <button
                    onClick={() => setDocAbierto(doc)}
                    title="Ver e imprimir"
                    className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-colors"
                  >
                    <Eye className="w-4 h-4" /> Ver
                  </button>
                </div>
              );
            })}

            {docPaginas > 1 && (
              <Paginador
                pagina={docPageSafe}
                paginas={docPaginas}
                onCambio={setDocPage}
                etiqueta={`${documents.length} documentos`}
              />
            )}
          </div>
        ) : (
          <div className="card-atelier p-10 text-center border-dashed border-2 bg-surface-low/30 border-surface-container-high">
            <p className="body-atelier text-high-contrast/50 text-sm">
              Aún no se han emitido documentos para este paciente.
            </p>
          </div>
        )}
      </div>

      {docAbierto && (
        <DocumentViewerModal
          doc={docAbierto}
          profile={profile ?? null}
          onClose={() => setDocAbierto(null)}
        />
      )}
    </div>
  );
};
