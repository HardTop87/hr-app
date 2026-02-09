import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getPublicHolidays } from '../utils/holidayUtils';
import { parseHolidayRegion } from '../lib/countryConfig';
import type { Absence } from '../types/absence';
import type { UserProfile } from '../types/user';

export interface DayInfo {
  day: number;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName?: string;
}

export interface UserWithAbsences {
  uid: string;
  displayName: string;
  email: string;
  avatar: string;
  departmentId?: string | null;
  absences: Absence[];
}

/**
 * Hook: Get team availability for a specific month (real-time)
 */
export function useTeamCalendar(
  companyId: string, 
  year: number, 
  month: number,
  departmentFilter: string | null = null,
  currentUserHolidayRegion?: string // e.g., "de-by" for Bayern
) {
  const [users, setUsers] = useState<UserWithAbsences[]>([]);
  const [daysInMonth, setDaysInMonth] = useState<DayInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Calculate month range
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);
    const totalDays = monthEnd.getDate();

    // Parse the holidayRegion to get state code (e.g., "de-by" → "BY")
    const stateCode = currentUserHolidayRegion ? parseHolidayRegion(currentUserHolidayRegion) : null;

    // Build days info with weekend and holiday data
    const holidays = getPublicHolidays(year, month, stateCode || undefined);
    const daysInfo: DayInfo[] = [];
    
    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();
      const weekend = dayOfWeek === 0 || dayOfWeek === 6;
      const holiday = holidays.find(h => h.date === day);
      
      daysInfo.push({
        day,
        isWeekend: weekend,
        isHoliday: !!holiday,
        holidayName: holiday?.name,
      });
    }
    
    setDaysInMonth(daysInfo);

    let usersList: UserProfile[] = [];
    let absencesList: Absence[] = [];
    let usersLoaded = false;
    let absencesLoaded = false;

    // Helper to combine data once both are loaded
    const combineData = () => {
      if (!usersLoaded || !absencesLoaded) return;

      // Apply department filter if specified
      let filteredUsers = usersList;
      if (departmentFilter) {
        filteredUsers = usersList.filter(user => user.departmentId === departmentFilter);
      }

      // Filter absences that overlap with the current month
      // AND are either approved OR sick/sick_child (shown without approval)
      const relevantAbsences = absencesList.filter((absence) => {
        // Skip rejected or cancelled
        if (absence.status === 'rejected' || absence.status === 'cancelled') {
          return false;
        }

        // Include if approved OR if sick/sick_child
        const isApproved = absence.status === 'approved';
        const isSick = absence.type === 'sick' || absence.type === 'sick_child';
        
        if (!isApproved && !isSick) {
          return false;
        }

        // Check if absence overlaps with the month
        const absenceStart = new Date(absence.startDate);
        const absenceEnd = new Date(absence.endDate);
        
        return (
          (absenceStart <= monthEnd && absenceEnd >= monthStart)
        );
      });

      // Map absences to users
      const usersWithAbsences: UserWithAbsences[] = filteredUsers.map(user => ({
        uid: user.uid,
        displayName: user.displayName || user.email,
        email: user.email,
        avatar: user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U',
        departmentId: user.departmentId,
        absences: relevantAbsences.filter(absence => absence.userId === user.uid),
      }));

      setUsers(usersWithAbsences);
      setIsLoading(false);
    };

    // Listen to users in real-time
    const usersQuery = query(
      collection(db, 'users'),
      where('companyId', '==', companyId),
      where('status', '==', 'active')
    );

    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      usersList = snapshot.docs.map(doc => doc.data() as UserProfile);
      usersLoaded = true;
      combineData();
    });

    // Listen to absences in real-time
    const absencesQuery = query(
      collection(db, 'absences'),
      where('companyId', '==', companyId)
    );

    const unsubscribeAbsences = onSnapshot(absencesQuery, (snapshot) => {
      absencesList = [];
      snapshot.forEach((doc) => {
        absencesList.push({ id: doc.id, ...doc.data() } as Absence);
      });
      absencesLoaded = true;
      combineData();
    });

    return () => {
      unsubscribeUsers();
      unsubscribeAbsences();
    };
  }, [companyId, year, month, departmentFilter, currentUserHolidayRegion]);

  return { users, daysInMonth, isLoading };
}

/**
 * Helper: Check if a user is absent on a specific date
 */
export function isUserAbsentOnDate(
  user: UserWithAbsences,
  date: Date
): Absence | null {
  const dateStr = date.toISOString().split('T')[0];
  
  for (const absence of user.absences) {
    if (dateStr >= absence.startDate && dateStr <= absence.endDate) {
      return absence;
    }
  }
  
  return null;
}

/**
 * Helper: Get number of days in a month
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Helper: Check if a date is a weekend
 */
export function isWeekend(year: number, month: number, day: number): boolean {
  const date = new Date(year, month - 1, day);
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
}
