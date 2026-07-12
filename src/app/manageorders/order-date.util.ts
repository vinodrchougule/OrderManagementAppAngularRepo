const MONTH_ABBREVIATIONS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Formats an ISO "yyyy-MM-dd" date string as "dd-Mon-yyyy" (e.g. "01-Jul-2026").
 * Parses the string parts directly rather than using Date getters, since Date
 * getters read local time and can roll the date back/forward a day depending
 * on the browser's timezone offset for a date-only ISO string.
 */
export function formatOrderDate(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) {
    return value;
  }
  const monthAbbr = MONTH_ABBREVIATIONS[Number(month) - 1] ?? month;
  return `${day}-${monthAbbr}-${year}`;
}

/** Today's date as an ISO "yyyy-MM-dd" string, in the browser's local time. */
export function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
