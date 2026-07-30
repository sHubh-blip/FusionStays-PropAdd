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

/**
 * Get yesterday in IST as YYYY-MM-DD
 */
export const getYesterdayIST = () => {
  const now = new Date();
  const todayIST = new Date(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata' }).format(now));
  todayIST.setDate(todayIST.getDate() - 1);
  const y = todayIST.getFullYear();
  const m = String(todayIST.getMonth() + 1).padStart(2, '0');
  const d = String(todayIST.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Check if a date string is in the previous month in IST
 */
export const isInPreviousMonthIST = (dateStr) => {
  const normalized = normalizeDate(dateStr);
  if (!normalized) return false;
  
  const nowParts = new Intl.DateTimeFormat('en-US', { 
    timeZone: 'Asia/Kolkata', 
    year: 'numeric', 
    month: 'numeric' 
  }).formatToParts(new Date());
  
  const currentMonth = parseInt(nowParts.find(p => p.type === 'month').value, 10);
  const currentYear = parseInt(nowParts.find(p => p.type === 'year').value, 10);
  
  let prevMonth = currentMonth - 1;
  let prevYear = currentYear;
  if (prevMonth < 1) {
    prevMonth = 12;
    prevYear -= 1;
  }
  
  const [y, m] = normalized.split('-');
  return parseInt(y, 10) === prevYear && parseInt(m, 10) === prevMonth;
};

/**
 * Check if a date string is in the previous calendar week (Mon-Sun) in IST
 */
export const isInPreviousWeekIST = (dateStr) => {
  const normalized = normalizeDate(dateStr);
  if (!normalized) return false;
  
  const now = new Date();
  const todayIST = new Date(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata' }).format(now));
  
  const day = todayIST.getDay(); 
  const diffToMonday = todayIST.getDate() - day + (day === 0 ? -6 : 1); 
  
  const prevMonday = new Date(todayIST);
  prevMonday.setDate(diffToMonday - 7);
  prevMonday.setHours(0, 0, 0, 0);
  
  const prevSunday = new Date(prevMonday);
  prevSunday.setDate(prevMonday.getDate() + 6);
  prevSunday.setHours(23, 59, 59, 999);
  
  const checkDate = new Date(normalized + "T00:00:00+05:30");
  
  return checkDate >= prevMonday && checkDate <= prevSunday;
};

/**
 * Check if a date string is in the previous year in IST
 */
export const isInPreviousYearIST = (dateStr) => {
  const normalized = normalizeDate(dateStr);
  if (!normalized) return false;
  
  const currentYear = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', year: 'numeric' }).format(new Date()), 10);
  const prevYear = String(currentYear - 1);
  return normalized.startsWith(prevYear);
};

/**
 * Get EOD work date in IST (resets at 6:00 AM IST)
 * If current time is < 6:00 AM IST, returns yesterday's YYYY-MM-DD.
 * Otherwise returns today's YYYY-MM-DD.
 */
export const getEODWorkDateIST = (dateObj = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    hour12: false
  }).formatToParts(dateObj);

  const year = parseInt(parts.find(p => p.type === 'year').value, 10);
  const month = parseInt(parts.find(p => p.type === 'month').value, 10);
  const day = parseInt(parts.find(p => p.type === 'day').value, 10);
  const hour = parseInt(parts.find(p => p.type === 'hour').value, 10);

  const d = new Date(year, month - 1, day);
  if (hour < 6) {
    d.setDate(d.getDate() - 1);
  }

  const yStr = d.getFullYear();
  const mStr = String(d.getMonth() + 1).padStart(2, '0');
  const dStr = String(d.getDate()).padStart(2, '0');
  return `${yStr}-${mStr}-${dStr}`;
};

/**
 * Format YYYY-MM-DD string to DD/MM/YY format (e.g. 30/07/26)
 */
export const formatEODHeaderDate = (yyyyMmDd) => {
  if (!yyyyMmDd) return '';
  const parts = yyyyMmDd.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    const shortY = y.slice(-2);
    return `${d}/${m}/${shortY}`;
  }
  return yyyyMmDd;
};

