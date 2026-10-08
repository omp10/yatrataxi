// Utility functions for Car Pooling / Cab Sharing time presentation

export const formatTime12Hour = (timeStr) => {
  if (!timeStr) return '--:--';
  const str = String(timeStr).trim();
  if (/am|pm/i.test(str)) return str;

  const parts = str.split(':');
  if (parts.length < 2) return str;

  let h = parseInt(parts[0], 10);
  const m = String(parts[1]).padStart(2, '0');
  if (Number.isNaN(h)) return str;

  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
};

export const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const s = String(timeStr).trim();
  const isPM = /pm/i.test(s);
  const isAM = /am/i.test(s);
  const clean = s.replace(/[^\d:]/g, '');
  const [hStr, mStr] = clean.split(':');
  let h = parseInt(hStr, 10) || 0;
  const m = parseInt(mStr, 10) || 0;
  if (isPM && h < 12) h += 12;
  if (isAM && h === 12) h = 0;
  return h * 60 + m;
};

export const getJourneyDuration = (departureTime, arrivalTime) => {
  if (!departureTime || !arrivalTime) return '';
  let diff = parseTimeToMinutes(arrivalTime) - parseTimeToMinutes(departureTime);
  if (diff < 0) diff += 24 * 60; // Next-day arrival

  const hrs = Math.floor(diff / 60);
  const mins = diff % 60;
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
};

export const getTimePeriodCategory = (timeStr) => {
  const minutes = parseTimeToMinutes(timeStr);
  const hours = minutes / 60;
  if (hours >= 4 && hours < 12) return 'morning';
  if (hours >= 12 && hours < 17) return 'afternoon';
  if (hours >= 17 && hours < 21) return 'evening';
  return 'night';
};

export const formatDateDisplay = (dateStr) => {
  if (!dateStr) return 'Today';
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return dateStr;

  const today = new Date();
  const isToday =
    parsed.getDate() === today.getDate() &&
    parsed.getMonth() === today.getMonth() &&
    parsed.getFullYear() === today.getFullYear();

  if (isToday) {
    return `Today, ${parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`;
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow =
    parsed.getDate() === tomorrow.getDate() &&
    parsed.getMonth() === tomorrow.getMonth() &&
    parsed.getFullYear() === tomorrow.getFullYear();

  if (isTomorrow) {
    return `Tomorrow, ${parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`;
  }

  return parsed.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
};

export const getTimeSlotStatus = (timeStr, dateStr) => {
  if (!dateStr || !timeStr) return { isPast: false, badge: 'Scheduled' };

  try {
    const today = new Date();
    const [y, m, d] = dateStr.split('-').map(Number);
    const rideDate = new Date(y, m - 1, d);

    const isToday =
      rideDate.getDate() === today.getDate() &&
      rideDate.getMonth() === today.getMonth() &&
      rideDate.getFullYear() === today.getFullYear();

    if (!isToday) {
      return { isPast: false, badge: 'Scheduled' };
    }

    const currentMinutes = today.getHours() * 60 + today.getMinutes();
    const rideMinutes = parseTimeToMinutes(timeStr);
    const diff = rideMinutes - currentMinutes;

    if (diff < -30) {
      return { isPast: true, badge: 'Departed' };
    }
    if (diff >= -30 && diff <= 15) {
      return { isPast: false, badge: 'Boarding Now', isHot: true };
    }
    if (diff > 15 && diff <= 120) {
      return { isPast: false, badge: `Leaves in ${Math.round(diff)}m`, isUpcoming: true };
    }
    return { isPast: false, badge: 'On Schedule' };
  } catch {
    return { isPast: false, badge: 'Scheduled' };
  }
};
