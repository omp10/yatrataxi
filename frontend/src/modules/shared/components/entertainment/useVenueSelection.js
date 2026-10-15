import { useCallback, useEffect, useState } from 'react';
import { buildDateOptions, summarizeSelection, todayDateText } from './ticketPricing';

const unwrap = (response) => response?.data || response || null;

// Loads a venue with live slot availability for the chosen date and keeps the
// ticket selection consistent when the date or slot changes.
export const useVenueSelection = ({ venueId, loadVenue }) => {
  const [venue, setVenue] = useState(null);
  const [visitDate, setVisitDate] = useState(todayDateText());
  const [slotId, setSlotId] = useState('');
  const [quantities, setQuantities] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async (date) => {
    setLoadingSlots(true);
    try {
      const data = unwrap(await loadVenue(venueId, date));
      setVenue(data);
      setError('');
      return data;
    } catch (e) {
      setError(e?.message || 'Could not load this venue');
      return null;
    } finally {
      setLoadingSlots(false);
      setLoading(false);
    }
  }, [loadVenue, venueId]);

  useEffect(() => {
    (async () => {
      const first = await refresh(todayDateText());
      // If today has nothing bookable, jump to the first open date.
      if (first && !(first.slots || []).some((slot) => slot.available)) {
        const next = buildDateOptions(first).find((option) => option.value !== todayDateText());
        if (next) {
          setVisitDate(next.value);
          refresh(next.value);
        }
      }
    })();
  }, [refresh]);

  const changeDate = (date) => {
    setVisitDate(date);
    setSlotId('');
    setQuantities({});
    refresh(date);
  };

  const changeSlot = (id) => {
    setSlotId(id);
    setQuantities({});
  };

  return {
    venue,
    visitDate,
    slotId,
    quantities,
    setQuantities,
    changeDate,
    changeSlot,
    refresh: () => refresh(visitDate),
    loading,
    loadingSlots,
    error,
    selection: summarizeSelection(venue, visitDate, quantities),
  };
};
