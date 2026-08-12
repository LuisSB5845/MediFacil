import { User as FirebaseUser } from 'firebase/auth';

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  bloodType: string;
  allergies?: string;
  height: number;
  weight: number;
  bmi?: number;
  doctorUid: string;
  createdAt: any;
  address?: string;
  phone?: string;
  personalHistory?: string;
  familyHistory?: string;
}

export interface Consultation {
  id: string;
  date: any;
  type: string;
  title: string;
  findings: string;
  diagnosis: string;
  plan: string;
  doctorUid: string;
  patientId: string;
  vitals: {
    bloodPressure: string;
    labGabinete: string; // New field
  };
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  createdAt: any;
}

export interface Chat {
  id: string;
  title: string;
  doctorUid: string;
  createdAt: any;
  updatedAt: any;
  lastMessage?: string;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  plan?: 'free' | 'pro' | 'whitelisted';
  role?: 'doctor' | 'admin';
  specialty?: string;
  exequatur?: string;
  clinicName?: string;
  clinicTagline?: string;
  clinicAddress?: string;
  clinicSuite?: string;
  phoneOffice?: string;
  phoneExt?: string;
  phoneCell?: string;
  clinicLogoUrl?: string;
  doctorLogoUrl?: string;
  consultationsThisMonth?: number;
  documentsThisMonth?: number;
  aiMessagesThisMonth?: number;
  usageResetDate?: string;
  usageLastReset?: string;
  gender?: 'male' | 'female';
  bio?: string;
  professionalId?: string;
  phone?: string;
  officeLocation?: string;
}

export interface BirthCertificationData {
  nombreMadre: string;
  cedulaMadre: string | null;
  sexoProducto: 'Masculino' | 'Femenino';
  peso: string;
  hora: string;
  dia: string;
  mes: string;
  anio: string;
  medicoTratante: string;
  fechaExpedicion: string;
}

export interface NarrativeCertificationData {
  patientName: string;
  patientId?: string;
  diagnosis: string;
  restDays?: string;
  recommendations?: string;
  issuerDoctor: string;
  date: string;
}

export interface ClinicalDocument {
  id: string;
  title: string;
  subtitle: string;
  type: 'ai' | 'template' | 'structured_certification';
  doctorUid: string;
  patientName?: string;
  createdAt: any;
  content: string;
  structuredData?: NarrativeCertificationData | BirthCertificationData;
  certificationType?: 'narrative' | 'birth';
  templateType?: string;
}

