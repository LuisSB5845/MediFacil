export interface UserProfileData {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
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
