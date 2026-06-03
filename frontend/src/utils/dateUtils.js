/**
 * Get current date in IST (Asia/Kolkata) as YYYY-MM-DD
 */
export const getTodayIST = () => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
};

/**
 * Normalize date string to YYYY-MM-DD
 */
export const normalizeDate = (dateStr) => {
  if (!dateStr || dateStr === '-') return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  
  const parts = dateStr.split(/[-/]/);
  if (parts.length === 3) {
    let [d, m, y] = parts;
    // If first part is year (YYYY-MM-DD already handled, but just in case)
    if (d.length === 4) return `${d}-${m.padStart(2, '0')}-${y.padStart(2, '0')}`;
    // Assume DD-MM-YYYY
    if (y.length === 2) y = '20' + y;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return null;
};

/**
 * Parse a date string into a Date object at start of day in IST
 */
export const parseISTDate = (dateStr) => {
  const normalized = normalizeDate(dateStr);
  if (!normalized) return null;
  return new Date(normalized + "T00:00:00+05:30");
};

/**
 * Check if a date string is in the current calendar week (Mon-Sun) in IST
 */
export const isInCurrentWeekIST = (dateStr) => {
  const normalized = normalizeDate(dateStr);
  if (!normalized) return false;
  
  const now = new Date();
  // ... rest of the logic uses now and todayIST ...
  const todayIST = new Date(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata' }).format(now));
  
  const day = todayIST.getDay(); 
  const diff = todayIST.getDate() - day + (day === 0 ? -6 : 1); 
  const monday = new Date(todayIST.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  
  const checkDate = new Date(normalized + "T00:00:00+05:30");
  
  return checkDate >= monday && checkDate <= sunday;
};

/**
 * Check if a date string is in the current month in IST
 */
export const isInCurrentMonthIST = (dateStr) => {
  const normalized = normalizeDate(dateStr);
  if (!normalized) return false;
  const now = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', year: 'numeric', month: 'numeric' }).formatToParts(new Date());
  const currentMonth = now.find(p => p.type === 'month').value;
  const currentYear = now.find(p => p.type === 'year').value;
  
  const [y, m, d] = normalized.split('-');
  return y === currentYear && parseInt(m) === parseInt(currentMonth);
};

/**
 * Check if a date string is in the current year in IST
 */
export const isInCurrentYearIST = (dateStr) => {
  const normalized = normalizeDate(dateStr);
  if (!normalized) return false;
  const currentYear = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', year: 'numeric' }).format(new Date());
  return normalized.startsWith(currentYear);
};
