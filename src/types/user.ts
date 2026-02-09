// Rollen-Definition
export type Role = 'global_admin' | 'company_admin' | 'hr_manager' | 'supervisor' | 'employee';

// Status für Anträge
export type AbsenceStatus = 'requested' | 'approved' | 'rejected' | 'cancelled';
export type AbsenceType = 'vacation' | 'sick' | 'remote' | 'business_trip';

// Vertragsart (WICHTIG: Wieder eingefügt)
export type EmploymentType = 'full_time' | 'part_time' | 'contractor' | 'intern';

// Dokumenten-Kategorien
export type DocumentCategory = 'contract' | 'certificate' | 'id_document' | 'other';

// Abteilung als Objekt
export interface Department {
  id: string; // UUID
  name: string; // z.B. "Marketing"
  leadId: string | null; // UID des Vorgesetzten
}

// Hardware/Assets
export interface Asset {
  id: string;
  type: 'laptop' | 'smartphone' | 'monitor' | 'other';
  name: string;
  serialNumber: string;
  assignedAt: string;
}

// Company Interface (Wieder eingefügt für Typsicherheit)
export interface Company {
  id: 'triple_c' | 'cococo';
  name: string;
}

// PUBLIC User Data (in users/{uid})
export interface UserPublicData {
  uid: string;
  email: string;
  displayName: string;
  
  // Profilbild
  photoURL?: string;
  
  // System & Status
  companyId: 'triple_c' | 'cococo';
  role: Role;
  status: 'active' | 'invited' | 'disabled';
  requiresGoogleSSO?: boolean;
  employeeId?: string;
  jobTitle?: string;
  
  // Hierarchie
  departmentId: string | null;
  reportsTo: string | null;
  
  // Vertrag (nur nicht-sensitive Felder)
  employmentType: EmploymentType;
  probationEndDate?: string; // YYYY-MM-DD - for easy filtering
  
  // Settings
  requiresTimeTracking: boolean;
  holidayRegion: string;
  
  // Assets
  assets: Asset[];
}

// SENSITIVE User Data (in users/{uid}/sensitive/data)
export interface UserSensitiveData {
  // Vertragsdaten
  startDate: string; // YYYY-MM-DD
  probationMonths?: number; // 0-6 months
  weeklyHours?: number;
  vacationEntitlement: number;
  
  // Persönliche Daten
  address?: {
    street: string;
    city: string;
    zip: string;
    region?: string;
    country: 'DE' | 'UK';
  };
  bankDetails?: {
    iban: string;
    bic: string;
    bankName: string;
    sortCode?: string;
    accountNumber?: string;
  };
  taxDetails?: {
    taxId: string;
    taxClass: string;
    socialSecurityNumber: string;
    healthInsuranceProvider: string;
    nationalInsuranceNumber?: string;
    taxCode?: string;
  };
  personalDetails?: {
    birthDate: string;
    phoneNumber?: string;
    privateEmail?: string;
    emergencyContact?: {
      name: string;
      phone: string;
      relationship: string;
    };
  };
}

// Complete UserProfile (Kombination für App-Kompatibilität)
export type UserProfile = UserPublicData & UserSensitiveData;

// Invite (Onboarding)
export interface Invite {
  id: string;
  email: string;
  companyId: string;
  role: Role;
  departmentId: string | null;
  reportsTo: string | null;
  createdAt: number;
}

// Firmen-Konstante
export const COMPANIES: Company[] = [
  { id: 'triple_c', name: 'Triple C Labs GmbH' },
  { id: 'cococo', name: 'CoCoCo Platform Ltd.' },
];
