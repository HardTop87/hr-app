import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  addDoc,
  getDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Absence } from '../types/absence';
import type { UserProfile } from '../types/user';

export interface AbsenceWithUser extends Absence {
  userName: string;
  userEmail: string;
  userAvatar?: string;
}

/**
 * Hook: Get all pending absences (real-time) with user information
 */
export function usePendingAbsences(companyId: string) {
  const [absences, setAbsences] = useState<AbsenceWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'absences'),
      where('companyId', '==', companyId),
      where('status', '==', 'requested'),
      orderBy('startDate', 'asc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const absencesList: Absence[] = [];
      snapshot.forEach((doc) => {
        absencesList.push({ id: doc.id, ...doc.data() } as Absence);
      });

      // Fetch user data for each absence
      const absencesWithUser: AbsenceWithUser[] = [];
      for (const absence of absencesList) {
        try {
          const userDoc = await getDoc(doc(db, 'users', absence.userId));
          
          if (userDoc.exists()) {
            const userData = userDoc.data() as UserProfile;
            absencesWithUser.push({
              ...absence,
              userName: userData.displayName || userData.email,
              userEmail: userData.email,
              userAvatar: userData.displayName ? userData.displayName.charAt(0).toUpperCase() : 'U',
            });
          } else {
            // Fallback if user not found
            absencesWithUser.push({
              ...absence,
              userName: 'Unknown User',
              userEmail: absence.userId,
              userAvatar: 'U',
            });
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          absencesWithUser.push({
            ...absence,
            userName: 'Unknown User',
            userEmail: absence.userId,
            userAvatar: 'U',
          });
        }
      }

      setAbsences(absencesWithUser);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [companyId]);

  return { absences, isLoading };
}

/**
 * Hook: Get all absences (real-time) with user information
 */
export function useAllAbsences(companyId: string) {
  const [absences, setAbsences] = useState<AbsenceWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'absences'),
      where('companyId', '==', companyId),
      orderBy('startDate', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const absencesList: Absence[] = [];
      snapshot.forEach((doc) => {
        absencesList.push({ id: doc.id, ...doc.data() } as Absence);
      });

      // Fetch user data for each absence
      const absencesWithUser: AbsenceWithUser[] = [];
      for (const absence of absencesList) {
        try {
          const userDoc = await getDoc(doc(db, 'users', absence.userId));
          
          if (userDoc.exists()) {
            const userData = userDoc.data() as UserProfile;
            absencesWithUser.push({
              ...absence,
              userName: userData.displayName || userData.email,
              userEmail: userData.email,
              userAvatar: userData.displayName ? userData.displayName.charAt(0).toUpperCase() : 'U',
            });
          } else {
            absencesWithUser.push({
              ...absence,
              userName: 'Unknown User',
              userEmail: absence.userId,
              userAvatar: 'U',
            });
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          absencesWithUser.push({
            ...absence,
            userName: 'Unknown User',
            userEmail: absence.userId,
            userAvatar: 'U',
          });
        }
      }

      setAbsences(absencesWithUser);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [companyId]);

  return { absences, isLoading };
}

/**
 * Approve an absence request
 */
export async function approveAbsence(
  absenceId: string,
  managerId: string,
  absence: Absence
): Promise<void> {
  const absenceRef = doc(db, 'absences', absenceId);
  
  await updateDoc(absenceRef, {
    status: 'approved',
    approvedBy: managerId,
    approvedAt: Date.now(),
    updatedAt: Date.now(),
  });

  // Create notification for the requester
  await addDoc(collection(db, 'notifications'), {
    userId: absence.userId,
    title: 'Antrag genehmigt',
    message: `Dein ${getTypeLabel(absence.type)} vom ${formatDate(absence.startDate)} wurde genehmigt.`,
    type: 'success',
    read: false,
    createdAt: Date.now(),
    link: '/absences',
  });
}

/**
 * Reject an absence request
 */
export async function rejectAbsence(
  absenceId: string,
  managerId: string,
  absence: Absence,
  reason: string
): Promise<void> {
  const absenceRef = doc(db, 'absences', absenceId);
  
  await updateDoc(absenceRef, {
    status: 'rejected',
    approvedBy: managerId,
    rejectedReason: reason,
    rejectedAt: Date.now(),
    updatedAt: Date.now(),
  });

  // Create notification for the requester
  await addDoc(collection(db, 'notifications'), {
    userId: absence.userId,
    title: 'Antrag abgelehnt',
    message: `Dein ${getTypeLabel(absence.type)} vom ${formatDate(absence.startDate)} wurde abgelehnt. Grund: ${reason}`,
    type: 'error',
    read: false,
    createdAt: Date.now(),
    link: '/absences',
  });
}

// Helper functions
function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    vacation: 'Urlaubsantrag',
    sick: 'Krankmeldung',
    sick_child: 'Krankmeldung Kind',
    work_remote_abroad: 'Workation-Antrag',
    business_trip: 'Dienstreise',
  };
  return labels[type] || 'Antrag';
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('de-DE', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });
}
