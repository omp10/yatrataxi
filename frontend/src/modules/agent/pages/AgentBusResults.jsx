import React, { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowLeft, Armchair, Bus, CalendarDays, CheckCircle2, MapPinned, Search } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { agentService } from '../services/agentService';

const cardClass = 'rounded-[30px] border border-white/70 bg-white/90 p-5 shadow-[0_18px_36px_rgba(20,58,90,0.08)] backdrop-blur-xl';
const formatMoney = (value) => `Rs ${Number(value || 0).toFixed(0)}`;

const AgentBusResults = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const seatsSectionRef = useRef(null);
  const searchState = location.state || {};
  const fromCity = searchState.fromCity || searchParams.get('fromCity') || '';
  const toCity = searchState.toCity || searchParams.get('toCity') || '';
  const travelDate = searchState.travelDate || searchParams.get('travelDate') || searchParams.get('date') || '';

  const [buses, setBuses] = useState([]);
  const [seatLayout, setSeatLayout] = useState([]);
  const [searching, setSearching] = useState(true);
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [loadingBusKey, setLoadingBusKey] = useState('');
  const [reserving, setReserving] = useState(false);
  const [error, setError] = useState('');
  const [selection, setSelection] = useState({
    busServiceId: '',
    scheduleId: '',
    seatIds: [],
  });

  useEffect(() => {
    if (!fromCity || !toCity || !travelDate) {
      navigate('/taxi/agent/book-bus', { replace: true });
      return;
    }

    const load = async () => {
      setSearching(true);
      setError('');
      try {
        const response = await agentService.searchBuses({
          fromCity,
          toCity,
          date: travelDate,
        });
        setBuses(response?.data?.data || response?.data || []);
        setSeatLayout([]);
        setSelection({
          busServiceId: '',
          scheduleId: '',
          seatIds: [],
        });
      } catch (err) {
        setBuses([]);
        setError(err?.message || 'Unable to search buses');
      } finally {
        setSearching(false);
      }
    };

    load();
  }, [fromCity, navigate, toCity, travelDate]);

  const selectedBus = useMemo(
    () => buses.find((item) => item.busServiceId === selection.busServiceId && item.scheduleId === selection.scheduleId) || null,
    [buses, selection.busServiceId, selection.scheduleId],
  );

  const openSeatMap = (bus) => {
    const params = new URLSearchParams({
      busServiceId: bus.busServiceId,
      scheduleId: bus.scheduleId,
      travelDate,
      fromCity,
      toCity,
    });

    navigate(`/taxi/agent/book-bus/seats?${params.toString()}`, {
      state: {
        bus,
        fromCity,
        toCity,
        travelDate,
      },
    });
  };

  const selectedSeats = useMemo(
    () => seatLayout.filter((seat) => selection.seatIds.includes(seat.id)),
    [seatLayout, selection.seatIds],
  );

  const totalAmount = useMemo(() => {
    if (!selectedBus) {
      return 0;
    }
    return selectedSeats.length * Number(selectedBus.price || 0);
  }, [selectedBus, selectedSeats.length]);

  const loadSeats = async (bus) => {
    const busServiceId = bus?.busServiceId || '';
    const scheduleId = bus?.scheduleId || '';
    const busKey = bus?.id || `${busServiceId}:${scheduleId}`;

    if (!busServiceId || !scheduleId) {
      setError('This bus is missing schedule details. Please try another bus.');
      return;
    }

    setLoadingSeats(true);
    setLoadingBusKey(busKey);
    setError('');
    setSelection({
      busServiceId,
      scheduleId,
      seatIds: [],
    });

    try {
      const response = await agentService.getBusSeatLayout(busServiceId, {
        scheduleId,
        date: travelDate,
      });
      setSeatLayout(response?.data?.data?.seats || []);
      window.setTimeout(() => {
        seatsSectionRef.current?.scrollIntoView?.({
          behavior: 'smooth',
          block: 'start',
        });
      }, 80);
    } catch (err) {
      setSeatLayout([]);
      setError(err?.message || 'Unable to load seats');
    } finally {
      setLoadingSeats(false);
      setLoadingBusKey('');
    }
  };

  const submit = async () => {
    if (!selection.busServiceId || !selection.scheduleId || !selection.seatIds.length) {
      setError('Select a bus and choose at least one seat');
      return;
    }

    setReserving(true);
    setError('');
    try {
      await agentService.createBusBooking({
        busServiceId: selection.busServiceId,
        scheduleId: selection.scheduleId,
        travelDate,
        seatIds: selection.seatIds,
      });
      toast.success('Seats reserved successfully');
      navigate('/taxi/agent/bookings');
    } catch (err) {
      setError(err?.message || 'Unable to reserve seats');
    } finally {
      setReserving(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() =>
          navigate('/taxi/agent/book-bus', {
            state: { fromCity, toCity, travelDate },
          })
        }
        className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[#143a5a]"
      >
        <ArrowLeft size={14} />
        Back To Search
      </button>

      <section className={cardClass}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5b7a93]">Bus search results</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-[#143a5a]">{fromCity} to {toCity}</h1>
          </div>
          <div className="rounded-[24px] bg-[#eff7ff] px-4 py-3 text-right">
            <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#0f6aa8]">
              <CalendarDays size={14} />
              {travelDate}
            </div>
          </div>
        </div>
      </section>

      {searching ? (
        <section className={cardClass}>
          <p className="text-sm font-semibold text-slate-500">Searching available buses...</p>
        </section>
      ) : null}

      {!searching && buses.length ? (
        <section className={cardClass}>
          <div className="flex items-center gap-2">
            <Search size={16} className="text-[#0f6aa8]" />
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5b7a93]">Available buses</p>
          </div>
          <div className="mt-4 space-y-3">
            {buses.map((item) => {
              const active = item.busServiceId === selection.busServiceId && item.scheduleId === selection.scheduleId;
              const busKey = item.id || `${item.busServiceId}:${item.scheduleId}`;
              const isLoadingThisBus = loadingBusKey === busKey;
              const isSoldOut = Number(item.availableSeats || 0) <= 0;
              return (
                <article
                  key={busKey}
                  className={`w-full rounded-[24px] border px-4 py-4 text-left transition ${
                    active ? 'border-[#143a5a] bg-[#eff7ff] shadow-[0_16px_30px_rgba(20,58,90,0.12)]' : 'border-[#d8e5f1] bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-[#143a5a]">{item.busName || 'Bus'} | {item.operatorName || 'Operator'}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500">
                        <span className="inline-flex items-center gap-1"><MapPinned size={12} /> {item.fromCity} to {item.toCity}</span>
                        <span className="inline-flex items-center gap-1"><Bus size={12} /> {item.departure} to {item.arrival}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f6aa8]">{item.availableSeats} seats</p>
                      <p className="mt-1 text-sm font-black text-slate-900">{formatMoney(item.price)}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                    <div className="text-xs font-bold text-slate-500">
                      {isSoldOut ? (
                        'No seats available'
                      ) : (
                        'Open full seat layout'
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => openSeatMap(item)}
                      disabled={isSoldOut}
                      className="shrink-0 rounded-[18px] bg-[#143a5a] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                    >
                      View Seats
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {!searching && !buses.length ? (
        <section className={cardClass}>
          <p className="text-sm font-semibold text-slate-500">No buses found for this route and date. Try another search.</p>
        </section>
      ) : null}

      {selectedBus ? (
        <section ref={seatsSectionRef} className={cardClass}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5b7a93]">Seat selection</p>
              <p className="mt-2 text-lg font-black text-[#143a5a]">{selectedBus.busName}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">{selectedBus.departure} | {selectedBus.fromCity} to {selectedBus.toCity}</p>
            </div>
            <div className="rounded-[22px] bg-[#eff7ff] px-4 py-3 text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#0f6aa8]">Selected</p>
              <p className="mt-1 text-lg font-black text-[#143a5a]">{selection.seatIds.length}</p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            {loadingSeats ? (
              <p className="col-span-3 text-sm font-semibold text-slate-500">Loading seats...</p>
            ) : seatLayout.map((seat) => {
              const selected = selection.seatIds.includes(seat.id);
              const booked = seat.status !== 'available';
              return (
                <button
                  key={seat.id}
                  type="button"
                  disabled={booked}
                  onClick={() => setSelection((current) => ({
                    ...current,
                    seatIds: selected
                      ? current.seatIds.filter((item) => item !== seat.id)
                      : [...current.seatIds, seat.id],
                  }))}
                  className={`rounded-[20px] px-3 py-3 text-xs font-black uppercase tracking-[0.14em] ${
                    booked
                      ? 'bg-slate-100 text-slate-300'
                      : selected
                        ? 'bg-[#143a5a] text-white'
                        : 'border border-[#d8e5f1] bg-white text-[#143a5a]'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <Armchair size={14} />
                    <span>{seat.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {selectedBus ? (
        <section className={cardClass}>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5b7a93]">Reservation summary</p>
          <div className="mt-4 space-y-2 text-sm font-semibold text-slate-600">
            <p>Route: <span className="font-black text-slate-900">{selectedBus.fromCity} to {selectedBus.toCity}</span></p>
            <p>Travel date: <span className="font-black text-slate-900">{travelDate}</span></p>
            <p>Seats: <span className="font-black text-slate-900">{selectedSeats.map((seat) => seat.label).join(', ') || '--'}</span></p>
            <p>Estimated amount: <span className="font-black text-slate-900">{formatMoney(totalAmount)}</span></p>
          </div>
        </section>
      ) : null}

      {error ? (
        <section className={cardClass}>
          <p className="text-sm font-semibold text-rose-600">{error}</p>
        </section>
      ) : null}

      {selectedBus ? (
        <button type="button" onClick={submit} disabled={!selection.seatIds.length || reserving} className="w-full rounded-[24px] bg-[#143a5a] px-5 py-4 text-sm font-black uppercase tracking-[0.2em] text-white disabled:cursor-not-allowed disabled:opacity-50">
          {reserving ? 'Reserving Seats...' : 'Reserve Selected Seats'}
        </button>
      ) : null}
    </div>
  );
};

export default AgentBusResults;
