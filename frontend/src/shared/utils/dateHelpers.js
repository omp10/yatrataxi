// Local-timezone YYYY-MM-DD (toISOString() is UTC and can be a day off in IST).
export const getTodayDateString = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

export const isPastDateString = (value) => Boolean(value) && value < getTodayDateString();
