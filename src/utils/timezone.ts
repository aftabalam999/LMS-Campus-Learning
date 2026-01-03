/**
 * Timezone Utility Functions
 * 
 * Provides utilities for working with Indian Standard Time (IST)
 * All attendance and time-related operations should use IST
 */

/**
 * Get current date/time in Indian Standard Time (IST)
 * @returns Date object representing current time in IST
 */
export function getISTDate(): Date {
  // Get current time in IST (UTC+5:30)
  const now = new Date();
  
  // Convert to IST by getting UTC time and adding IST offset
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const istOffset = 5.5 * 60 * 60000; // IST is UTC+5:30
  const istTime = new Date(utcTime + istOffset);
  
  return istTime;
}

/**
 * Convert any date to IST
 * @param date - Date to convert to IST
 * @returns Date object in IST
 */
export function toISTDate(date: Date): Date {
  const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
  const istOffset = 5.5 * 60 * 60000;
  return new Date(utcTime + istOffset);
}

/**
 * Get start of day in IST for a given date
 * @param date - Optional date (defaults to today in IST)
 * @returns Date object set to 00:00:00 IST
 */
export function getISTStartOfDay(date?: Date): Date {
  const istDate = date ? toISTDate(date) : getISTDate();
  istDate.setHours(0, 0, 0, 0);
  return istDate;
}

/**
 * Get end of day in IST for a given date
 * @param date - Optional date (defaults to today in IST)
 * @returns Date object set to 23:59:59.999 IST
 */
export function getISTEndOfDay(date?: Date): Date {
  const istDate = date ? toISTDate(date) : getISTDate();
  istDate.setHours(23, 59, 59, 999);
  return istDate;
}

/**
 * Format IST time for display
 * @param date - Date to format
 * @returns Formatted time string in IST
 */
export function formatISTTime(date?: Date): string {
  const istDate = date ? toISTDate(date) : getISTDate();
  return istDate.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata'
  });
}

/**
 * Format IST date for display
 * @param date - Date to format
 * @returns Formatted date string in IST
 */
export function formatISTDate(date?: Date): string {
  const istDate = date ? toISTDate(date) : getISTDate();
  return istDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata'
  });
}

/**
 * Get IST timestamp as ISO string
 * @param date - Optional date (defaults to current IST time)
 * @returns ISO string representation of IST time
 */
export function getISTISOString(date?: Date): string {
  const istDate = date ? toISTDate(date) : getISTDate();
  return istDate.toISOString();
}

/**
 * Check if current IST time matches specific hour and minute
 * @param targetHour - Target hour (0-23)
 * @param targetMinute - Target minute (0-59)
 * @returns true if current IST time matches target time
 */
export function isISTTime(targetHour: number, targetMinute: number): boolean {
  const istNow = getISTDate();
  return istNow.getHours() === targetHour && istNow.getMinutes() === targetMinute;
}

/**
 * Get current IST hours
 * @returns Current hour in IST (0-23)
 */
export function getISTHours(): number {
  return getISTDate().getHours();
}

/**
 * Get current IST minutes
 * @returns Current minute in IST (0-59)
 */
export function getISTMinutes(): number {
  return getISTDate().getMinutes();
}
