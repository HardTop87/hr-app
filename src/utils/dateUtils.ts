/**
 * Safely convert various date formats to Date object
 * Handles Firestore Timestamps, ISO strings, and Date objects
 * @param date - Any date format (Timestamp, string, Date)
 * @returns Date object
 */
export function getDateObject(date: any): Date {
  if (!date) return new Date();
  
  // Firestore Timestamp
  if (date && typeof date.toDate === 'function') {
    return date.toDate();
  }
  
  // Already a Date object
  if (date instanceof Date) {
    return date;
  }
  
  // ISO string or other parseable format
  if (typeof date === 'string') {
    return new Date(date);
  }
  
  // Fallback
  return new Date();
}

/**
 * Convert date to YYYY-MM-DD string safely
 * @param date - Any date format
 * @returns YYYY-MM-DD string
 */
export function toDateString(date: any): string {
  const dateObj = getDateObject(date);
  return dateObj.toISOString().split('T')[0];
}

/**
 * Calculate the probation end date based on start date and probation months
 * @param startDate - Start date in YYYY-MM-DD format
 * @param months - Number of probation months (0-6)
 * @returns End date in YYYY-MM-DD format
 */
export function calculateProbationEnd(startDate: string, months: number): string {
  if (!startDate || months === 0) return '';
  
  const start = new Date(startDate);
  const end = new Date(start);
  end.setMonth(end.getMonth() + months);
  
  // Format as YYYY-MM-DD
  return end.toISOString().split('T')[0];
}

/**
 * Calculate number of days until a given date
 * @param targetDate - Target date in YYYY-MM-DD format
 * @returns Number of days (negative if in the past)
 */
export function getDaysUntil(targetDate: string): number {
  if (!targetDate) return 0;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  
  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Check if user is currently in probation period
 * @param probationEndDate - End date in YYYY-MM-DD format
 * @returns True if still in probation
 */
export function isInProbation(probationEndDate?: string): boolean {
  if (!probationEndDate) return false;
  return getDaysUntil(probationEndDate) > 0;
}

/**
 * Calculate the halfway point of probation period
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @returns Halfway date in YYYY-MM-DD format
 */
export function getProbationHalfwayDate(startDate: string, endDate: string): string {
  if (!startDate || !endDate) return '';
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const halfwayTime = start.getTime() + (end.getTime() - start.getTime()) / 2;
  const halfway = new Date(halfwayTime);
  
  return halfway.toISOString().split('T')[0];
}

/**
 * Check if today is a specific date
 * @param dateToCheck - Date in YYYY-MM-DD format
 * @returns True if today matches the date
 */
export function isToday(dateToCheck: string): boolean {
  if (!dateToCheck) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const check = new Date(dateToCheck);
  check.setHours(0, 0, 0, 0);
  
  return today.getTime() === check.getTime();
}

/**
 * Format a date string for display
 * @param dateString - Date in YYYY-MM-DD format
 * @param locale - Locale for formatting (default: 'de-DE')
 * @returns Formatted date string
 */
export function formatDate(dateString: string, locale: string = 'de-DE'): string {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
