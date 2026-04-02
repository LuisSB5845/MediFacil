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

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  plan?: 'free' | 'pro' | 'whitelisted';
  role?: 'doctor' | 'admin';
  specialty?: string;
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
