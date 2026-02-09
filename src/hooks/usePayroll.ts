import { useState, useCallback } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { UserProfile } from '../types/user';
import type { TimeEntry } from '../types/time';
import type { Absence } from '../types/absence';
import {
  getWorkingDaysInMonth,
  getWorkingDaysBetween,
  minutesToHours,
  getDaysBetween,
} from '../utils/payrollUtils';
import { getDateObject } from '../utils/dateUtils';

export interface PayrollData {
  userId: string;
  displayName: string;
  employeeId: string;
  email: string;
  startDate: string;
  weeklyHours: number;
  
  // Month values
  targetHoursMonth: number;
  actualHoursMonth: number;
  balanceMonth: number;
  sickDaysMonth: number;
  vacationDaysMonth: number;
  
  // Lifetime values
  totalTargetHours: number;
  totalActualHours: number;
  lifetimeBalance: number;
  
  // Warnings
  missingEmployeeId: boolean;
  missingStartDate: boolean;
}

export function usePayroll(companyId: string) {
  const [loading, setLoading] = useState(false);
  const [payrollData, setPayrollData] = useState<PayrollData[]>([]);

  const getReportData = useCallback(async (selectedDate: Date) => {
    setLoading(true);
    
    try {
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth() + 1;
      
      // Calculate month range
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0, 23, 59, 59);
      
      const now = new Date();
      
      // Get all active users from company
      const usersRef = collection(db, 'users');
      const usersQuery = query(
        usersRef,
        where('companyId', '==', companyId),
        where('status', '!=', 'disabled')
      );
      const usersSnapshot = await getDocs(usersQuery);
      
      const users: UserProfile[] = [];
      usersSnapshot.forEach((doc) => {
        users.push({ uid: doc.id, ...doc.data() } as UserProfile);
      });
      
      // Process each user
      const reportData: PayrollData[] = [];
      
      for (const user of users) {
        const weeklyHours = user.weeklyHours || 40;
        const dailyHours = weeklyHours / 5;
        const startDate = user.startDate ? getDateObject(user.startDate) : null;
        
        // Month calculations
        const workingDaysMonth = getWorkingDaysInMonth(year, month);
        const targetHoursMonth = dailyHours * workingDaysMonth;
        
        // Get time entries for this month
        const timeEntriesQuery = query(
          collection(db, 'timeEntries'),
          where('companyId', '==', companyId),
          where('userId', '==', user.uid),
          where('date', '>=', monthStart.toISOString().split('T')[0]),
          where('date', '<=', monthEnd.toISOString().split('T')[0]),
          where('type', '==', 'work')
        );
        const timeEntriesSnapshot = await getDocs(timeEntriesQuery);
        
        let actualMinutesMonth = 0;
        timeEntriesSnapshot.forEach((doc) => {
          const entry = doc.data() as TimeEntry;
          // Calculate duration from startTime and endTime
          if (entry.endTime) {
            const durationMs = entry.endTime - entry.startTime;
            const durationMinutes = Math.round(durationMs / 60000);
            actualMinutesMonth += durationMinutes;
          }
        });
        
        const actualHoursMonth = minutesToHours(actualMinutesMonth);
        const balanceMonth = actualHoursMonth - targetHoursMonth;
        
        // Get absences for this month
        const absencesQuery = query(
          collection(db, 'absences'),
          where('userId', '==', user.uid),
          where('companyId', '==', companyId)
        );
        const absencesSnapshot = await getDocs(absencesQuery);
        
        let sickDaysMonth = 0;
        let vacationDaysMonth = 0;
        
        absencesSnapshot.forEach((doc) => {
          const absence = doc.data() as Absence;
          const absenceStart = getDateObject(absence.startDate);
          const absenceEnd = getDateObject(absence.endDate);
          
          // Check if absence overlaps with selected month
          if (absenceEnd >= monthStart && absenceStart <= monthEnd) {
            // Calculate overlap
            const overlapStart = absenceStart > monthStart ? absenceStart : monthStart;
            const overlapEnd = absenceEnd < monthEnd ? absenceEnd : monthEnd;
            const days = getDaysBetween(overlapStart, overlapEnd);
            
            if (absence.type === 'sick' || absence.type === 'sick_child') {
              sickDaysMonth += days;
            } else if (absence.type === 'vacation' && absence.status === 'approved') {
              vacationDaysMonth += days;
            }
          }
        });
        
        // Lifetime calculations
        let totalTargetHours = 0;
        let totalActualHours = 0;
        
        if (startDate) {
          const workingDaysTotal = getWorkingDaysBetween(startDate, now);
          totalTargetHours = dailyHours * workingDaysTotal;
          
          // Get all time entries since start
          const allTimeEntriesQuery = query(
            collection(db, 'timeEntries'),
            where('companyId', '==', companyId),
            where('userId', '==', user.uid),
            where('type', '==', 'work')
          );
          const allTimeEntriesSnapshot = await getDocs(allTimeEntriesQuery);
          
          let totalMinutes = 0;
          allTimeEntriesSnapshot.forEach((doc) => {
            const entry = doc.data() as TimeEntry;
            const entryDate = getDateObject(entry.date);
            
            // Only count entries since start date
            if (entryDate >= startDate && entry.endTime) {
              const durationMs = entry.endTime - entry.startTime;
              const durationMinutes = Math.round(durationMs / 60000);
              totalMinutes += durationMinutes;
            }
          });
          
          totalActualHours = minutesToHours(totalMinutes);
        }
        
        const lifetimeBalance = totalActualHours - totalTargetHours;
        
        reportData.push({
          userId: user.uid,
          displayName: user.displayName,
          employeeId: user.employeeId || '',
          email: user.email,
          startDate: user.startDate || '',
          weeklyHours,
          targetHoursMonth,
          actualHoursMonth,
          balanceMonth,
          sickDaysMonth,
          vacationDaysMonth,
          totalTargetHours,
          totalActualHours,
          lifetimeBalance,
          missingEmployeeId: !user.employeeId,
          missingStartDate: !user.startDate,
        });
      }
      
      // Sort by display name
      reportData.sort((a, b) => a.displayName.localeCompare(b.displayName));
      
      setPayrollData(reportData);
      return reportData;
    } catch (error) {
      console.error('Error getting payroll report:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  return {
    loading,
    payrollData,
    getReportData,
  };
}
