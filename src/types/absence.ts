export type AbsenceType = 'vacation' | 'sick' | 'sick_child' | 'work_remote_abroad' | 'business_trip';
export type AbsenceStatus = 'requested' | 'approved' | 'rejected' | 'cancelled';

export interface Absence {
  id: string;
  userId: string;
  companyId: string;
  type: AbsenceType;
  status: AbsenceStatus;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  workingDays: number; // Berechnete Arbeitstage (ohne Wochenende)

  // Optionale Felder
  note?: string;
  certificateUrl?: string; // Für Attest (bei sick/sick_child)
  destinationCountry?: string; // Pflicht bei 'work_remote_abroad'

  // Meta
  approvedBy?: string; 
  approvedAt?: number;
  rejectedReason?: string;
  rejectedAt?: number;
  createdAt: number;
  updatedAt: number;
}
