import type { TimeEntry } from '../types/time';
import type { UserProfile } from '../types/user';

/**
 * Groups TimeEntries by date (YYYY-MM-DD)
 */
export function groupEntriesByDay(entries: TimeEntry[]): Record<string, TimeEntry[]> {
  return entries.reduce((acc, entry) => {
    const date = entry.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(entry);
    return acc;
  }, {} as Record<string, TimeEntry[]>);
}

/**
 * Calculates net work time and break time for a day in minutes
 * Applies regional break deduction rules based on user's employment type and region
 * 
 * NEW: Detects implicit breaks (gaps between work entries)
 * - If you clock out for lunch, that gap counts as break time
 * 
 * Rules:
 * - Contractors: Never auto-deduct breaks (time = money)
 * - Germany (de-*): Mandatory breaks by law (>6h = 30m, >9h = 45m)
 * - UK (en-uk): No auto-deduct, but mark non-compliant if >6h without 20m break
 * - Other regions: No auto-deduct, warning only for extreme cases
 */
export function calculateDailyDuration(
  entries: TimeEntry[],
  userProfile?: UserProfile | null
): {
  gross: number;         // Total work time logged
  takenBreak: number;    // Actual break time logged (explicit + implicit gaps)
  explicitBreak: number; // Only explicit 'break' entries
  gaps: number;          // Only implicit gaps between work entries
  deductedBreak: number; // Auto-deducted break (legal requirement)
  net: number;           // Final billable/paid time (gross - deducted)
  isCompliant: boolean;  // Meets legal break requirements
  workMinutes: number;   // Alias for gross (backwards compatibility)
  breakMinutes: number;  // Alias for takenBreak (backwards compatibility)
  totalMinutes: number;  // gross + takenBreak
} {
  let workMs = 0;
  let breakMs = 0;

  // Separate work and break entries
  const workEntries = entries.filter(e => e.type === 'work');
  const breakEntries = entries.filter(e => e.type === 'break');

  // Calculate work time
  workEntries.forEach((entry) => {
    if (entry.endTime === null) {
      workMs += Date.now() - entry.startTime;
    } else {
      workMs += entry.endTime - entry.startTime;
    }
  });

  // Calculate explicit break time
  breakEntries.forEach((entry) => {
    if (entry.endTime === null) {
      breakMs += Date.now() - entry.startTime;
    } else {
      breakMs += entry.endTime - entry.startTime;
    }
  });

  // Calculate implicit breaks (gaps between work entries)
  // Sort completed work entries by start time
  const completedWorkEntries = workEntries
    .filter(e => e.endTime !== null)
    .sort((a, b) => a.startTime - b.startTime);

  let gapMs = 0;
  for (let i = 0; i < completedWorkEntries.length - 1; i++) {
    const current = completedWorkEntries[i];
    const next = completedWorkEntries[i + 1];
    
    if (current.endTime && next.startTime > current.endTime) {
      // Gap detected between clock-out and next clock-in
      gapMs += next.startTime - current.endTime;
    }
  }

  const grossMinutes = Math.floor(workMs / 60000);
  const explicitBreakMinutes = Math.floor(breakMs / 60000);
  const implicitBreakMinutes = Math.floor(gapMs / 60000);
  const takenBreakMinutes = explicitBreakMinutes + implicitBreakMinutes;
  
  let deductedBreakMinutes = 0;
  let isCompliant = true;

  // Apply regional break rules
  if (userProfile) {
    const { employmentType, holidayRegion } = userProfile;

    // Contractors: NEVER auto-deduct
    if (employmentType === 'contractor') {
      deductedBreakMinutes = 0;
      isCompliant = true; // Contractors make their own rules
    }
    // Germany: Mandatory break deduction
    else if (holidayRegion.startsWith('de-')) {
      let requiredBreakMinutes = 0;
      
      if (grossMinutes > 9 * 60) {
        requiredBreakMinutes = 45; // >9h = 45min mandatory
      } else if (grossMinutes > 6 * 60) {
        requiredBreakMinutes = 30; // >6h = 30min mandatory
      }

      if (requiredBreakMinutes > 0) {
        if (takenBreakMinutes < requiredBreakMinutes) {
          // Deduct the missing break time
          deductedBreakMinutes = requiredBreakMinutes - takenBreakMinutes;
          isCompliant = false; // They didn't take enough break
        } else {
          isCompliant = true; // Sufficient break taken
        }
      }
    }
    // UK: Trust-based, but check compliance
    else if (holidayRegion === 'en-uk') {
      deductedBreakMinutes = 0; // UK doesn't auto-deduct
      
      if (grossMinutes > 6 * 60 && takenBreakMinutes < 20) {
        isCompliant = false; // Law requires 20min break after 6h
      }
    }
    // Other regions: No rules, just warning for extreme cases
    else {
      deductedBreakMinutes = 0;
      // Warn if working >10h with no break
      if (grossMinutes > 10 * 60 && takenBreakMinutes === 0) {
        isCompliant = false;
      }
    }
  }

  const netMinutes = grossMinutes - deductedBreakMinutes;

  return {
    gross: grossMinutes,
    takenBreak: takenBreakMinutes,
    explicitBreak: explicitBreakMinutes,
    gaps: implicitBreakMinutes,
    deductedBreak: deductedBreakMinutes,
    net: netMinutes,
    isCompliant,
    // Backwards compatibility aliases
    workMinutes: grossMinutes,
    breakMinutes: takenBreakMinutes,
    totalMinutes: grossMinutes + takenBreakMinutes,
  };
}

/**
 * Formats minutes into readable form (e.g. "8h 15m")
 * Supports internationalization
 */
export function formatDuration(minutes: number, locale?: string): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (locale === 'de') {
    if (hours === 0) {
      return `${mins} Min`;
    }
    if (mins === 0) {
      return `${hours} Std`;
    }
    return `${hours} Std ${mins} Min`;
  } else {
    // Default English format
    if (hours === 0) {
      return `${mins}m`;
    }
    if (mins === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${mins}m`;
  }
}

/**
 * Formats a timestamp to time string using Intl.DateTimeFormat
 * Uses browser's local timezone
 * @param timestamp - Unix timestamp in milliseconds
 * @param locale - 'de' or 'en' (defaults to 'en')
 * @returns Formatted time string (e.g., "14:30" or "2:30 PM")
 */
export function formatTime(timestamp: number, locale: string = 'en'): string {
  const date = new Date(timestamp);
  const localeTag = locale === 'de' ? 'de-DE' : 'en-US';
  
  return new Intl.DateTimeFormat(localeTag, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: locale === 'en',
  }).format(date);
}

/**
 * Formats a date string (YYYY-MM-DD) to localized short date
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param locale - 'de' or 'en' (defaults to 'en')
 * @returns Formatted date string (e.g., "24.10." or "10/24")
 */
export function formatDate(dateStr: string, locale: string = 'en'): string {
  const date = new Date(dateStr + 'T12:00:00'); // Noon to avoid timezone issues
  const localeTag = locale === 'de' ? 'de-DE' : 'en-US';
  
  return new Intl.DateTimeFormat(localeTag, {
    day: '2-digit',
    month: '2-digit',
  }).format(date);
}

/**
 * Formats a date for display with weekday (e.g. "Mon, 23. Oct" or "Mo, 23. Okt")
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param locale - 'de' or 'en' (defaults to 'en')
 */
export function formatDateDisplay(dateStr: string, locale: string = 'en'): string {
  const date = new Date(dateStr + 'T12:00:00'); // Noon to avoid timezone issues
  const localeTag = locale === 'de' ? 'de-DE' : 'en-US';
  
  return new Intl.DateTimeFormat(localeTag, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date);
}

/**
 * Returns all days of a month (YYYY-MM-DD format)
 * Uses UTC to avoid timezone issues
 */
export function getDaysInMonth(year: number, month: number): string[] {
  const days: string[] = [];
  // Use UTC date to avoid timezone issues
  const date = new Date(Date.UTC(year, month - 1, 1));
  
  // Iterate through all days of the month
  while (date.getUTCMonth() === month - 1) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    days.push(dateStr);
    date.setUTCDate(date.getUTCDate() + 1);
  }
  
  return days;
}

/**
 * Checks if a date is a weekend
 */
export function isWeekend(dateStr: string): boolean {
  const date = new Date(dateStr + 'T12:00:00'); // Noon to avoid timezone issues
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
}

/**
 * Checks if a date is a working day (Mon-Fri)
 */
export function isWorkingDay(dateStr: string): boolean {
  return !isWeekend(dateStr);
}

/**
 * Returns the weekday of a date (0 = Sunday, 6 = Saturday)
 */
export function getWeekday(dateStr: string): number {
  const date = new Date(dateStr + 'T12:00:00');
  return date.getDay();
}

/**
 * Returns the number of empty days at month start
 * (for calendar grid layout)
 */
export function getMonthStartOffset(year: number, month: number): number {
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  let weekday = firstDay.getUTCDay();
  // Convert Sunday (0) to 7, so Monday = 1
  weekday = weekday === 0 ? 7 : weekday;
  // Offset is weekday - 1 (Monday = 0)
  return weekday - 1;
}

/**
 * Finds earliest start and latest end time of a day
 */
export function getDayTimeRange(entries: TimeEntry[]): {
  firstStart: number | null;
  lastEnd: number | null;
} {
  if (entries.length === 0) {
    return { firstStart: null, lastEnd: null };
  }

  const firstStart = Math.min(...entries.map(e => e.startTime));
  const endTimes = entries.map(e => e.endTime).filter(e => e !== null) as number[];
  const lastEnd = endTimes.length > 0 ? Math.max(...endTimes) : null;

  return { firstStart, lastEnd };
}

/**
 * Checks if a day has incomplete entries
 */
export function hasIncompleteEntries(entries: TimeEntry[]): boolean {
  return entries.some(e => e.endTime === null);
}
/**
 * Checks if a date is today
 */
export function isToday(dateStr: string): boolean {
  const today = new Date().toISOString().split('T')[0];
  return dateStr === today;
}