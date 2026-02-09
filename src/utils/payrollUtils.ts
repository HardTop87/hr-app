/**
 * Get the number of working days (Monday-Friday) in a specific month
 */
export function getWorkingDaysInMonth(year: number, month: number): number {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  
  let workingDays = 0;
  const currentDate = new Date(firstDay);
  
  while (currentDate <= lastDay) {
    const dayOfWeek = currentDate.getDay();
    // Monday = 1, Friday = 5
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      workingDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return workingDays;
}

/**
 * Get the number of working days between two dates (inclusive)
 */
export function getWorkingDaysBetween(startDate: Date, endDate: Date): number {
  let workingDays = 0;
  const currentDate = new Date(startDate);
  const end = new Date(endDate);
  
  // Set to start of day for accurate comparison
  currentDate.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  while (currentDate <= end) {
    const dayOfWeek = currentDate.getDay();
    // Monday = 1, Friday = 5
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      workingDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return workingDays;
}

/**
 * Format duration in minutes to "HH:MM" format
 * Example: 630 minutes -> "10:30"
 */
export function formatDuration(minutes: number): string {
  const sign = minutes < 0 ? '-' : '';
  const absMinutes = Math.abs(minutes);
  const hours = Math.floor(absMinutes / 60);
  const mins = Math.round(absMinutes % 60);
  
  return `${sign}${hours}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Convert minutes to decimal hours
 * Example: 90 minutes -> 1.5
 */
export function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100;
}

/**
 * Download data as CSV file with UTF-8 BOM for Excel compatibility
 */
export function downloadCSV(data: any[], filename: string): void {
  if (data.length === 0) {
    console.warn('No data to export');
    return;
  }
  
  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvRows = [];
  
  // Add header row
  csvRows.push(headers.join(';'));
  
  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      
      // Handle null/undefined
      if (value === null || value === undefined) {
        return '';
      }
      
      // Convert to string and escape quotes
      const stringValue = String(value).replace(/"/g, '""');
      
      // Wrap in quotes if contains semicolon, comma, or newline
      if (stringValue.includes(';') || stringValue.includes(',') || stringValue.includes('\n')) {
        return `"${stringValue}"`;
      }
      
      return stringValue;
    });
    
    csvRows.push(values.join(';'));
  }
  
  // Add UTF-8 BOM for Excel compatibility
  const csvContent = '\uFEFF' + csvRows.join('\n');
  
  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

/**
 * Get month name in German
 */
export function getMonthName(month: number, locale: string = 'de-DE'): string {
  const date = new Date(2000, month - 1, 1);
  return date.toLocaleDateString(locale, { month: 'long' });
}

/**
 * Calculate the number of days between two dates
 */
export function getDaysBetween(startDate: Date, endDate: Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Set to start of day
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays + 1; // Include both start and end date
}
