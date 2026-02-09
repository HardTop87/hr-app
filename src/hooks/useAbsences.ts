import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc,
  orderBy
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import type { Absence, AbsenceType, AbsenceStatus } from '../types/absence';
import type { UserProfile } from '../types/user';

/**
 * Calculate working days (Mon-Fri) between two dates
 * Excludes weekends (Saturday & Sunday)
 */
export function calculateWorkingDays(startDate: string, endDate: string): number {
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  
  let workingDays = 0;
  const current = new Date(start);
  
  while (current <= end) {
    const dayOfWeek = current.getDay();
    // Count only Mon-Fri (1-5), skip Sat(6) and Sun(0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return workingDays;
}

/**
 * Get absence statistics for current year
 */
export interface AbsenceStats {
  vacationTotal: number;
  vacationTaken: number;
  vacationPlanned: number;
  vacationRemaining: number;
  sickDaysSelf: number;
  sickDaysChild: number;
}

export async function getAbsenceStats(
  userProfile: UserProfile | null,
  absences: Absence[]
): Promise<AbsenceStats> {
  const currentYear = new Date().getFullYear();
  
  // Filter absences for current year
  const currentYearAbsences = absences.filter(absence => {
    const year = parseInt(absence.startDate.split('-')[0]);
    return year === currentYear;
  });
  
  // Vacation entitlement from user profile (default 30 days)
  const vacationTotal = userProfile?.vacationEntitlement || 30;
  
  // Calculate vacation days
  const vacationTaken = currentYearAbsences
    .filter(a => a.type === 'vacation' && a.status === 'approved')
    .reduce((sum, a) => sum + a.workingDays, 0);
  
  const vacationPlanned = currentYearAbsences
    .filter(a => a.type === 'vacation' && a.status === 'requested')
    .reduce((sum, a) => sum + a.workingDays, 0);
  
  const vacationRemaining = vacationTotal - vacationTaken - vacationPlanned;
  
  // Calculate sick days
  const sickDaysSelf = currentYearAbsences
    .filter(a => a.type === 'sick' && (a.status === 'approved' || a.status === 'requested'))
    .reduce((sum, a) => sum + a.workingDays, 0);
  
  const sickDaysChild = currentYearAbsences
    .filter(a => a.type === 'sick_child' && (a.status === 'approved' || a.status === 'requested'))
    .reduce((sum, a) => sum + a.workingDays, 0);
  
  return {
    vacationTotal,
    vacationTaken,
    vacationPlanned,
    vacationRemaining,
    sickDaysSelf,
    sickDaysChild,
  };
}

/**
 * Request new absence
 */
export interface RequestAbsenceData {
  type: AbsenceType;
  startDate: string;
  endDate: string;
  note?: string;
  destinationCountry?: string;
}

export async function requestAbsence(
  userId: string,
  companyId: string,
  data: RequestAbsenceData,
  file?: File,
  currentStats?: AbsenceStats
): Promise<string> {
  // Calculate working days
  const workingDays = calculateWorkingDays(data.startDate, data.endDate);
  
  // Validation: Check vacation remaining
  if (data.type === 'vacation' && currentStats) {
    if (workingDays > currentStats.vacationRemaining) {
      throw new Error(`Nicht genug Urlaubstage verfügbar. Verfügbar: ${currentStats.vacationRemaining} Tage, Beantragt: ${workingDays} Tage`);
    }
  }
  
  // Validation: work_remote_abroad requires destination country
  if (data.type === 'work_remote_abroad' && !data.destinationCountry) {
    throw new Error('Zielland ist bei Workation Pflicht (für A1-Bescheinigung)');
  }
  
  // Upload certificate if provided
  let certificateUrl: string | undefined;
  if (file) {
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name}`;
    const storageRef = ref(storage, `absences/${userId}/${fileName}`);
    
    await uploadBytes(storageRef, file);
    certificateUrl = await getDownloadURL(storageRef);
  }
  
  // Create absence document
  const absence: Omit<Absence, 'id'> = {
    userId,
    companyId,
    type: data.type,
    status: 'requested',
    startDate: data.startDate,
    endDate: data.endDate,
    workingDays,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...(data.note && { note: data.note }),
    ...(certificateUrl && { certificateUrl }),
    ...(data.destinationCountry && { destinationCountry: data.destinationCountry }),
  };
  
  const docRef = await addDoc(collection(db, 'absences'), absence);
  return docRef.id;
}

/**
 * Hook: Get my absences (realtime)
 */
export function useMyAbsences(userId: string | undefined, companyId: string) {
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    if (!userId) {
      setAbsences([]);
      setIsLoading(false);
      return;
    }
    
    const q = query(
      collection(db, 'absences'),
      where('userId', '==', userId),
      where('companyId', '==', companyId),
      orderBy('startDate', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Absence[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Absence);
      });
      setAbsences(data);
      setIsLoading(false);
    });
    
    return () => unsubscribe();
  }, [userId, companyId]);
  
  return { absences, isLoading };
}

/**
 * Cancel absence (only if status is 'requested')
 */
export async function cancelAbsence(absenceId: string, currentStatus: AbsenceStatus): Promise<void> {
  if (currentStatus !== 'requested') {
    throw new Error('Nur beantragte Abwesenheiten können storniert werden');
  }
  
  const absenceRef = doc(db, 'absences', absenceId);
  await updateDoc(absenceRef, {
    status: 'cancelled',
    updatedAt: Date.now(),
  });
}
