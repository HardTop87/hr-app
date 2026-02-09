import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { UserProfile } from '../types/user';
import { getDaysUntil, isToday, getProbationHalfwayDate } from '../utils/dateUtils';

interface ProbationCheck {
  loading: boolean;
  error: string | null;
  lastCheck: Date | null;
}

/**
 * Hook to check probation deadlines and send notifications
 * Checks for:
 * - Halfway point (50% of probation period)
 * - 30 days before end
 * 
 * Prevents spam by checking if notification already exists
 */
export function useProbationCheck(companyId: string, enabled: boolean = true): ProbationCheck {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  useEffect(() => {
    if (!enabled || !companyId) return;

    const checkProbationDeadlines = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load all active users in company
        const usersRef = collection(db, 'users');
        const usersQuery = query(
          usersRef,
          where('companyId', '==', companyId),
          where('status', '==', 'active')
        );
        const usersSnapshot = await getDocs(usersQuery);

        const users: UserProfile[] = [];
        usersSnapshot.forEach((doc) => {
          users.push({ uid: doc.id, ...doc.data() } as UserProfile);
        });

        // Check each user for probation deadlines
        for (const user of users) {
          if (!user.probationEndDate || !user.startDate) continue;

          const daysUntilEnd = getDaysUntil(user.probationEndDate);
          
          // Skip if probation already ended
          if (daysUntilEnd <= 0) continue;

          // Calculate halfway date
          const halfwayDate = getProbationHalfwayDate(user.startDate, user.probationEndDate);

          // Check 1: Is today the halfway point?
          if (isToday(halfwayDate)) {
            await sendProbationNotification(
              user,
              'halfway',
              `${user.displayName} erreicht heute die Hälfte der Probezeit`,
              `Die Probezeit von ${user.displayName} endet am ${new Date(user.probationEndDate).toLocaleDateString('de-DE')}. Bitte bereiten Sie das Zwischengespräch vor.`
            );
          }

          // Check 2: Is today 30 days before end?
          if (daysUntilEnd === 30) {
            await sendProbationNotification(
              user,
              '30_days',
              `Probezeit von ${user.displayName} endet in 30 Tagen`,
              `Die Probezeit endet am ${new Date(user.probationEndDate).toLocaleDateString('de-DE')}. Bitte planen Sie das Abschlussgespräch und die Dokumentation.`
            );
          }
        }

        setLastCheck(new Date());
      } catch (err) {
        console.error('Error checking probation deadlines:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    // Check immediately and then every hour
    checkProbationDeadlines();
    const interval = setInterval(checkProbationDeadlines, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [companyId, enabled]);

  return { loading, error, lastCheck };
}

/**
 * Send a probation notification if one doesn't already exist
 */
async function sendProbationNotification(
  user: UserProfile,
  type: 'halfway' | '30_days',
  title: string,
  message: string
): Promise<void> {
  try {
    // Check if notification already exists for this user and type
    const notificationsRef = collection(db, 'notifications');
    const existingQuery = query(
      notificationsRef,
      where('userId', '==', user.uid),
      where('type', '==', `probation_${type}`),
      where('companyId', '==', user.companyId)
    );
    const existingNotifications = await getDocs(existingQuery);

    // Don't send if notification already exists
    if (!existingNotifications.empty) {
      console.log(`Notification already exists for ${user.displayName} (${type})`);
      return;
    }

    // Find HR managers and admins in the company
    const usersRef = collection(db, 'users');
    const managersQuery = query(
      usersRef,
      where('companyId', '==', user.companyId),
      where('role', 'in', ['hr_manager', 'company_admin', 'global_admin']),
      where('status', '==', 'active')
    );
    const managersSnapshot = await getDocs(managersQuery);

    // Send notification to each HR/admin
    const promises: Promise<any>[] = [];
    managersSnapshot.forEach((doc) => {
      const notification = {
        recipientId: doc.id,
        userId: user.uid,
        companyId: user.companyId,
        type: `probation_${type}`,
        title,
        message,
        read: false,
        createdAt: Date.now(),
        metadata: {
          probationEndDate: user.probationEndDate,
          employeeName: user.displayName,
          employeeId: user.employeeId,
          departmentId: user.departmentId,
        },
      };
      promises.push(addDoc(notificationsRef, notification));
    });

    await Promise.all(promises);
    console.log(`Sent probation notification for ${user.displayName} (${type}) to ${promises.length} recipients`);
  } catch (error) {
    console.error('Error sending probation notification:', error);
    throw error;
  }
}
