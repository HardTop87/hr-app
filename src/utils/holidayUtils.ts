/**
 * German Public Holiday Calculator using date-holidays library
 * Provides accurate regional public holidays for Germany
 */

import Holidays from 'date-holidays';

export interface PublicHoliday {
  date: number; // Day of month (1-31)
  name: string;
  isNationwide: boolean; // true if nationwide, false if regional
  type: string; // 'public', 'bank', 'school', 'optional', 'observance'
}

/**
 * Get all public holidays for a specific month in Germany
 * @param year - The year
 * @param month - The month (1-12)
 * @param stateCode - Optional German state code (e.g., 'BY' for Bayern, 'NW' for NRW)
 * @returns Array of public holidays in that month
 */
export function getPublicHolidays(year: number, month: number, stateCode?: string): PublicHoliday[] {
  const holidays: PublicHoliday[] = [];
  
  try {
    // Initialize holidays library for Germany
    // Use overload: Holidays(country, state) or Holidays(country)
    const hd = stateCode 
      ? new Holidays('DE', stateCode) 
      : new Holidays('DE');
    
    // Get all holidays for the year
    const yearHolidays = hd.getHolidays(year);
    
    if (!yearHolidays) return holidays;
    
    // Filter holidays for the specified month
    yearHolidays.forEach((holiday) => {
      const holidayDate = new Date(holiday.date);
      const holidayMonth = holidayDate.getMonth() + 1; // 1-based
      const holidayDay = holidayDate.getDate();
      
      // Only include holidays in the specified month
      if (holidayMonth === month) {
        // Include public holidays and bank holidays (like Heiligabend)
        // Exclude observances unless they're widely recognized
        const isRelevant = holiday.type === 'public' || holiday.type === 'bank';
        
        if (isRelevant) {
          holidays.push({
            date: holidayDay,
            name: holiday.name,
            isNationwide: !holiday.substitute, // Nationwide if not a substitute/regional
            type: holiday.type,
          });
        }
      }
    });
    
    // Sort by date
    holidays.sort((a, b) => a.date - b.date);
  } catch (error) {
    console.error('Error loading holidays:', error);
  }
  
  return holidays;
}

/**
 * Check if a specific date is a public holiday
 */
export function isPublicHoliday(year: number, month: number, day: number, stateCode?: string): PublicHoliday | null {
  const holidays = getPublicHolidays(year, month, stateCode);
  return holidays.find(h => h.date === day) || null;
}

