import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, getDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { UserProfile } from '../types/user';
import { isInProbation, getDaysUntil } from '../utils/dateUtils';

interface DashboardStats {
  remainingVacationDays: number;
  workedHoursThisWeek: number;
  loading: boolean;
}

interface TeamAbsence {
  user: UserProfile;
  type: 'vacation' | 'sick' | 'remote' | 'business_trip';
  returnDate: Date;
}

interface UpcomingBirthday {
  name: string;
  photoURL?: string;
  day: number;
  month: number;
  daysUntil: number;
}

export const useDashboardStats = (userId: string): DashboardStats => {
  const [stats, setStats] = useState<DashboardStats>({
    remainingVacationDays: 0,
    workedHoursThisWeek: 0,
    loading: true,
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        // Get user vacation entitlement directly by document ID
        const userDoc = await getDoc(doc(db, 'users', userId));
        
        let vacationEntitlement = 30; // Default
        if (userDoc.exists()) {
          const userData = userDoc.data();
          // Try to get from main document first (legacy), then from sensitive subcollection
          if (userData.vacationEntitlement) {
            vacationEntitlement = userData.vacationEntitlement;
          } else {
            // After migration: Read from sensitive subcollection
            try {
              const sensitiveDoc = await getDoc(doc(db, 'users', userId, 'sensitive', 'data'));
              if (sensitiveDoc.exists()) {
                vacationEntitlement = sensitiveDoc.data().vacationEntitlement || 30;
              }
            } catch (error) {
              // User might not have access to sensitive data, use default
              console.warn('Could not load vacation entitlement from sensitive data, using default');
            }
          }
        }

        // Calculate approved vacation days for current year
        const currentYear = new Date().getFullYear();
        const yearStart = new Date(currentYear, 0, 1);
        const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59);

        const absencesRef = collection(db, 'absences');
        const absencesQuery = query(
          absencesRef,
          where('userId', '==', userId),
          where('type', '==', 'vacation'),
          where('status', '==', 'approved')
        );
        const absencesSnapshot = await getDocs(absencesQuery);

        let usedVacationDays = 0;
        absencesSnapshot.forEach((doc) => {
          const absence = doc.data();
          const startDate = absence.startDate.toDate();
          const endDate = absence.endDate.toDate();

          // Only count days in current year
          if (startDate <= yearEnd && endDate >= yearStart) {
            const countStart = startDate < yearStart ? yearStart : startDate;
            const countEnd = endDate > yearEnd ? yearEnd : endDate;
            
            // Calculate business days
            let days = 0;
            let current = new Date(countStart);
            while (current <= countEnd) {
              const dayOfWeek = current.getDay();
              if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
                days++;
              }
              current.setDate(current.getDate() + 1);
            }
            usedVacationDays += days;
          }
        });

        // Calculate worked hours this week
        const today = new Date();
        const dayOfWeek = today.getDay();
        const monday = new Date(today);
        monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        monday.setHours(0, 0, 0, 0);

        const timeEntriesRef = collection(db, 'timeEntries');
        const timeEntriesQuery = query(
          timeEntriesRef,
          where('userId', '==', userId),
          where('date', '>=', Timestamp.fromDate(monday))
        );
        const timeEntriesSnapshot = await getDocs(timeEntriesQuery);

        let workedMinutes = 0;
        timeEntriesSnapshot.forEach((doc) => {
          const entry = doc.data();
          if (entry.workDuration) {
            workedMinutes += entry.workDuration;
          }
        });

        setStats({
          remainingVacationDays: vacationEntitlement - usedVacationDays,
          workedHoursThisWeek: Math.round(workedMinutes / 60 * 10) / 10,
          loading: false,
        });
      } catch (error) {
        console.error('Error loading dashboard stats:', error);
        setStats(prev => ({ ...prev, loading: false }));
      }
    };

    if (userId) {
      loadStats();
    }
  }, [userId]);

  return stats;
};

export const useTeamPresence = (userCompanyId: string, userDepartmentId: string | null): { absences: TeamAbsence[]; loading: boolean } => {
  const [absences, setAbsences] = useState<TeamAbsence[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTeamPresence = async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get all absences for today
        const absencesRef = collection(db, 'absences');
        const absencesQuery = query(
          absencesRef,
          where('companyId', '==', userCompanyId),
          where('status', '==', 'approved')
        );
        const absencesSnapshot = await getDocs(absencesQuery);

        const todayAbsences: any[] = [];
        absencesSnapshot.forEach((doc) => {
          const absence = doc.data();
          const startDate = absence.startDate.toDate();
          const endDate = absence.endDate.toDate();
          
          if (startDate <= today && endDate >= today) {
            todayAbsences.push({ id: doc.id, ...absence });
          }
        });

        // Get user details
        const userIds = [...new Set(todayAbsences.map(a => a.userId))];
        const usersRef = collection(db, 'users');
        const usersQuery = query(
          usersRef,
          where('companyId', '==', userCompanyId),
          where('status', '==', 'active')
        );
        const usersSnapshot = await getDocs(usersQuery);

        const usersMap = new Map<string, UserProfile>();
        usersSnapshot.forEach((doc) => {
          const user = { uid: doc.id, ...doc.data() } as UserProfile;
          if (userIds.includes(user.uid)) {
            usersMap.set(user.uid, user);
          }
        });

        // Combine data
        const teamAbsences: TeamAbsence[] = todayAbsences
          .filter(absence => usersMap.has(absence.userId))
          .map(absence => ({
            user: usersMap.get(absence.userId)!,
            type: absence.type,
            returnDate: absence.endDate.toDate(),
          }));

        // Sort: Own department first
        teamAbsences.sort((a, b) => {
          const aInDept = a.user.departmentId === userDepartmentId;
          const bInDept = b.user.departmentId === userDepartmentId;
          
          if (aInDept && !bInDept) return -1;
          if (!aInDept && bInDept) return 1;
          return a.user.displayName.localeCompare(b.user.displayName);
        });

        setAbsences(teamAbsences);
        setLoading(false);
      } catch (error) {
        console.error('Error loading team presence:', error);
        setLoading(false);
      }
    };

    if (userCompanyId) {
      loadTeamPresence();
    }
  }, [userCompanyId, userDepartmentId]);

  return { absences, loading };
};

export const useUpcomingBirthdays = (companyId: string): { birthdays: UpcomingBirthday[]; loading: boolean } => {
  const [birthdays, setBirthdays] = useState<UpcomingBirthday[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBirthdays = async () => {
      try {
        const usersRef = collection(db, 'users');
        const usersQuery = query(
          usersRef,
          where('companyId', '==', companyId),
          where('status', '==', 'active')
        );
        const usersSnapshot = await getDocs(usersQuery);

        const today = new Date();
        const currentYear = today.getFullYear();
        const sevenDaysLater = new Date(today);
        sevenDaysLater.setDate(today.getDate() + 7);

        const upcomingBirthdays: UpcomingBirthday[] = [];

        usersSnapshot.forEach((doc) => {
          const user = doc.data();
          if (user.dateOfBirth) {
            const birthDate = user.dateOfBirth.toDate();
            const day = birthDate.getDate();
            const month = birthDate.getMonth();

            // Create birthday for this year
            const birthdayThisYear = new Date(currentYear, month, day);
            
            // Calculate days until birthday
            const diffTime = birthdayThisYear.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Check if birthday is in the next 7 days
            if (diffDays >= 0 && diffDays <= 7) {
              upcomingBirthdays.push({
                name: user.displayName,
                photoURL: user.photoURL,
                day: day,
                month: month + 1, // Month is 0-indexed, display as 1-indexed
                daysUntil: diffDays,
              });
            }
          }
        });

        // Sort by days until birthday
        upcomingBirthdays.sort((a, b) => a.daysUntil - b.daysUntil);

        setBirthdays(upcomingBirthdays);
        setLoading(false);
      } catch (error) {
        console.error('Error loading birthdays:', error);
        setLoading(false);
      }
    };

    if (companyId) {
      loadBirthdays();
    }
  }, [companyId]);

  return { birthdays, loading };
};

/**
 * Hook to get employees in probation period
 */
interface ProbationEmployee {
  uid: string;
  name: string;
  photoURL?: string;
  jobTitle?: string;
  probationEndDate: string;
  daysRemaining: number;
}

export const useEmployeesInProbation = (companyId: string): { employees: ProbationEmployee[]; loading: boolean } => {
  const [employees, setEmployees] = useState<ProbationEmployee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProbationEmployees = async () => {
      try {
        // Get all active users in company
        const usersRef = collection(db, 'users');
        const usersQuery = query(
          usersRef,
          where('companyId', '==', companyId),
          where('status', '==', 'active')
        );
        const usersSnapshot = await getDocs(usersQuery);

        const probationEmployees: ProbationEmployee[] = [];
        usersSnapshot.forEach((doc) => {
          const user = doc.data() as UserProfile;
          
          // Check if user has probation end date and is still in probation
          if (user.probationEndDate && isInProbation(user.probationEndDate)) {
            const daysRemaining = getDaysUntil(user.probationEndDate);
            
            probationEmployees.push({
              uid: user.uid,
              name: user.displayName,
              photoURL: user.photoURL,
              jobTitle: user.jobTitle,
              probationEndDate: user.probationEndDate,
              daysRemaining,
            });
          }
        });

        // Sort by days remaining (closest to end first)
        probationEmployees.sort((a, b) => a.daysRemaining - b.daysRemaining);

        setEmployees(probationEmployees);
        setLoading(false);
      } catch (error) {
        console.error('Error loading probation employees:', error);
        setLoading(false);
      }
    };

    if (companyId) {
      loadProbationEmployees();
    }
  }, [companyId]);

  return { employees, loading };
};
