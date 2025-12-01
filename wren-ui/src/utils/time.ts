import dayJs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import relativeTime from 'dayjs/plugin/relativeTime';
import localizedFormat from 'dayjs/plugin/localizedFormat'; // For localized formats
import 'dayjs/locale/fa'; // Import Farsi locale

dayJs.extend(utc);
dayJs.extend(relativeTime);
dayJs.extend(localizedFormat);

// Set the Farsi locale as default
dayJs.locale('fa');

export const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

export const nextTick = (ms = 1) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Get the relative time in Farsi
export const getRelativeTime = (time: string) => {
  return dayJs(time).fromNow();
};

// Get the absolute time formatted for Farsi
export const getAbsoluteTime = (time: string) => {
  return dayJs(time).format('YYYY/MM/DD HH:mm:ss'); // Changed to Farsi-friendly format
};

// Get the compact time formatted for Farsi
export const getCompactTime = (time: string) => {
  return dayJs(time).format('YYYY/MM/DD HH:mm'); // Changed to Farsi-friendly format
};

// Get the full name date formatted for Farsi
export const getFullNameDate = (time: string) => {
  return dayJs(time).format('D MMMM YYYY'); // Adjusted for Farsi (e.g., 15 آذر 1402)
};

// Get the short date formatted for Farsi
export const getShortDate = (time: string) => {
  return dayJs(time).format('D MMM YYYY'); // Adjusted for Farsi (e.g., 15 آذر 1402)
};
