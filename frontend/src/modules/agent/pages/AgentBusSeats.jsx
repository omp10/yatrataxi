import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowLeft, Armchair, Bus, CalendarDays, ChevronRight, Loader2, MapPinned, Phone, RotateCcw, UserRound, X } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { agentService } from '../services/agentService';

const formatMoney = (value) => `Rs ${Number(value || 0).toFixed(0)}`;

const unwrapApiData = (response) => response?.data?.data || response?.data || response;

const resolveSeatPrice = (bus, seat) => {
  const variantPricing = bus?.variantPricing || {};
  const defaultPrice = Number(bus?.price || 0);
  const variantKey = String(seat?.variant || 'seat').trim().toLowerCase();
  const resolvedPrice = variantPricing?.[variantKey] ?? variantPricing?.seat ?? defaultPrice;

  return Number.isFinite(Number(resolvedPrice)) ? Number(resolvedPrice) : defaultPrice;
};

const flattenBlueprintSeats = (blueprint = {}) =>
  ['lowerDeck', 'upperDeck']
    .flatMap((deckKey) => (Array.isArray(blueprint?.[deckKey]) ? blueprint[deckKey] : []))
    .flatMap((row) => (Array.isArray(row) ? row : []))
    .filter((cell) => cell?.kind === 'seat' && cell?.id);

const buildFallbackDeck = (seats = []) => {
  const rows = [];
  seats.forEach((seat, index) => {
    const rowIndex = Math.floor(index / 4);
    if (!rows[rowIndex]) {
      rows[rowIndex] = [];
    }
    rows[rowIndex].push({
      ...seat,
      kind: 'seat',
    });
  });
  return rows;
};

const SeatLegend = () => (
  <div className="grid grid-cols-2 gap-3 rounded-[22px] border border-slate-100 bg-white p-4 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
    <div className="flex items-center gap-2">
      <span className="h-4 w-4 rounded-lg border-2 border-slate-300 bg-white" />
      Available
    </div>
    <div className="flex items-center gap-2">
      <span className="h-4 w-4 rounded-lg border-2 border-[#143a5a] bg-[#143a5a]" />
      Selected
    </div>
    <div className="flex items-center gap-2">
      <span className="h-4 w-4 rounded-lg border-2 border-slate-200 bg-slate-200" />
      Booked
    </div>
    <div className="flex items-center gap-2">
      <span className="h-4 w-8 rounded-xl border-2 border-[#8ecae6] bg-[#eef8ff]" />
      Sleeper
    </div>
  </div>
);

const SeatDeck = ({ title, rows, selectedSeatIds, onToggle }) => {
  if (!rows?.length) {
    return null;
  }

  return (
    <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-[0_12px_32px_rgba(20,58,90,0.08)]">
      <div className="mb-5 flex items-center justify-between border-b border-dashed border-slate-200 pb-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5b7a93]">{title}</p>
          <p className="mt-1 text-xs font-bold text-slate-400">Tap available seats to reserve</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
          <Bus size={20} />
        </div>
      </div>

      <div className="space-y-3">
        {rows.map((row, rowIndex) => (
          <div
            key={`${title}-${rowIndex}`}
            className="grid gap-3"
            style={{ gridTemplateColumns: `repeat(${Math.max(1, row.length)}, minmax(0, 1fr))` }}
          >
            {row.map((seat, cellIndex) => {
              if (!seat || seat.kind !== 'seat') {
                return <div key={`${title}-${rowIndex}-${cellIndex}`} className="min-h-11" />;
              }

              const isBooked = String(seat.status || 'available') !== 'available';
              const isSelected = selectedSeatIds.includes(seat.id);
              const isSleeper = String(seat.variant || '').toLowerCase() === 'sleeper';

              return (
                <button
                  key={seat.id}
                  type="button"
                  disabled={isBooked}
                  onClick={() => onToggle(seat)}
                  className={`relative flex w-full items-center justify-center border-2 transition active:scale-95 ${
                    isBooked
                      ? 'cursor-not-allowed border-slate-200 bg-slate-200 text-slate-400'
                      : isSelected
                        ? 'border-[#143a5a] bg-[#143a5a] text-white shadow-[0_10px_22px_rgba(20,58,90,0.22)]'
                        : isSleeper
                          ? 'border-[#8ecae6] bg-[#eef8ff] text-[#143a5a]'
                          : 'border-slate-300 bg-white text-slate-700 hover:border-[#143a5a]'
                  }`}
                  style={{
                    minHeight: isSleeper ? 58 : 46,
                    borderRadius: isSleeper ? 18 : 12,
                  }}
                >
                  {isSleeper ? (
                    <>
                      <span className={`absolute left-2 h-[72%] w-2 rounded-full ${isSelected ? 'bg-white/50' : 'bg-[#8ecae6]'}`} />
                      <span className="pl-4 text-[10px] font-black">{seat.label || seat.id}</span>
                    </>
                  ) : (
                    <>
                      <span className={`absolute -top-1 h-2 w-4/5 rounded-t-md ${isSelected ? 'bg-white/40' : 'bg-slate-200'}`} />
                      <span className="text-[10px] font-black">{seat.label || seat.id}</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
};

const AgentBusSeats = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const state = location.state || {};
  const busFromState = state.bus || {};
  const busServiceId = busFromState.busServiceId || searchParams.get('busServiceId') || '';
  const scheduleId = busFromState.scheduleId || searchParams.get('scheduleId') || '';
  const travelDate = state.travelDate || busFromState.travelDate || searchParams.get('travelDate') || searchParams.get('date') || '';
  const fromCity = state.fromCity || busFromState.fromCity || searchParams.get('fromCity') || '';
  const toCity = state.toCity || busFromState.toCity || searchParams.get('toCity') || '';

  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);
  const [error, setError] = useState('');
  const [seatLayout, setSeatLayout] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [showPassengerForm, setShowPassengerForm] = useState(false);
  const [passenger, setPassenger] = useState({
    name: '',
    phone: '',
  });

  const passengerName = passenger.name.trim();
  const passengerPhone = passenger.phone.replace(/\D/g, '').slice(-10);

  useEffect(() => {
    if (!busServiceId || !scheduleId || !travelDate) {
      navigate('/taxi/agent/book-bus', { replace: true });
      return;
    }

    let active = true;

    const loadSeats = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await agentService.getBusSeatLayout(busServiceId, {
          scheduleId,
          date: travelDate,
        });
        if (!active) return;
        setSeatLayout(unwrapApiData(response) || null);
        setSelectedSeats([]);
      } catch (err) {
        if (!active) return;
        setError(err?.message || 'Unable to load seat layout');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadSeats();

    return () => {
      active = false;
    };
  }, [busServiceId, navigate, scheduleId, travelDate]);

  const bus = seatLayout?.bus || busFromState;
  const blueprint = seatLayout?.blueprint || {};
  const hasBlueprint = flattenBlueprintSeats(blueprint).length > 0;
  const lowerDeck = hasBlueprint ? blueprint.lowerDeck || [] : buildFallbackDeck(seatLayout?.seats || []);
  const upperDeck = hasBlueprint ? blueprint.upperDeck || [] : [];
  const hasAnySeats = lowerDeck.length > 0 || upperDeck.length > 0;
  const totalFare = selectedSeats.reduce((sum, seat) => sum + Number(seat.price || 0), 0);

  const toggleSeat = (seat) => {
    if (!seat || String(seat.status || 'available') !== 'available') {
      return;
    }

    setSelectedSeats((current) =>
      current.some((item) => item.id === seat.id)
        ? current.filter((item) => item.id !== seat.id)
        : [
            ...current,
            {
              id: seat.id,
              label: seat.label || seat.id,
              variant: seat.variant || 'seat',
              price: resolveSeatPrice(bus, seat),
            },
          ],
    );
  };

  const reserveSeats = async () => {
    if (!selectedSeats.length) {
      setError('Select at least one seat first');
      return;
    }

    if (!passengerName) {
      setError('Enter passenger name');
      setShowPassengerForm(true);
      return;
    }

    if (!/^\d{10}$/.test(passengerPhone)) {
      setError('Enter a valid 10-digit passenger phone number');
      setShowPassengerForm(true);
      return;
    }

    setReserving(true);
    setError('');
    try {
      await agentService.createBusBooking({
        busServiceId,
        scheduleId,
        travelDate,
        seatIds: selectedSeats.map((seat) => seat.id),
        customer: {
          name: passengerName,
          phone: passengerPhone,
        },
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
    <div className="min-h-screen bg-[#f6f8fb] pb-36">
      <div className="sticky top-0 z-20 border-b border-slate-100 bg-white px-4 py-4 shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-800 active:scale-95"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-black text-[#143a5a]">Select Seats</h1>
            <p className="mt-0.5 truncate text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
              {bus?.operatorName || 'Operator'} | {bus?.busName || 'Bus'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 active:scale-95"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-4xl space-y-5 px-4 pt-5">
        <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-[0_12px_32px_rgba(20,58,90,0.06)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5b7a93]">Agent Bus Booking</p>
              <h2 className="mt-2 text-2xl font-black text-slate-900">{bus?.fromCity || fromCity || 'From'} to {bus?.toCity || toCity || 'To'}</h2>
              <div className="mt-3 flex flex-wrap gap-3 text-xs font-bold text-slate-500">
                <span className="inline-flex items-center gap-1"><CalendarDays size={14} /> {travelDate}</span>
                <span className="inline-flex items-center gap-1"><Bus size={14} /> {bus?.departure || '--'} to {bus?.arrival || '--'}</span>
                <span className="inline-flex items-center gap-1"><MapPinned size={14} /> {bus?.coachType || bus?.busCategory || 'Bus'}</span>
              </div>
            </div>
            <div className="rounded-[22px] bg-[#eef8ff] px-4 py-3 text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#0f6aa8]">Starts from</p>
              <p className="mt-1 text-xl font-black text-[#143a5a]">{formatMoney(bus?.price)}</p>
            </div>
          </div>
        </section>

        {loading ? (
          <section className="flex min-h-56 flex-col items-center justify-center rounded-[28px] border border-slate-100 bg-white p-8 text-slate-500 shadow-sm">
            <Loader2 size={34} className="animate-spin text-[#143a5a]" />
            <p className="mt-4 text-sm font-black">Loading seat map...</p>
          </section>
        ) : null}

        {!loading && error ? (
          <section className="rounded-[22px] border border-rose-100 bg-rose-50 p-4 text-sm font-bold text-rose-600">
            {error}
          </section>
        ) : null}

        {!loading && !error ? (
          <>
            {hasAnySeats ? (
              <>
                <SeatDeck
                  title="Lower Deck"
                  rows={lowerDeck}
                  selectedSeatIds={selectedSeats.map((seat) => seat.id)}
                  onToggle={toggleSeat}
                />
                <SeatDeck
                  title="Upper Deck"
                  rows={upperDeck}
                  selectedSeatIds={selectedSeats.map((seat) => seat.id)}
                  onToggle={toggleSeat}
                />
                <SeatLegend />
              </>
            ) : (
              <section className="rounded-[28px] border border-slate-100 bg-white p-8 text-center shadow-sm">
                <Armchair size={34} className="mx-auto text-slate-300" />
                <p className="mt-4 text-sm font-black text-slate-700">No seat layout found for this bus.</p>
                <p className="mt-2 text-xs font-bold text-slate-400">Please add or update the bus blueprint from the admin bus service panel.</p>
              </section>
            )}
          </>
        ) : null}
      </main>

      {showPassengerForm ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/40 px-4 pb-4 sm:items-center sm:pb-0">
          <section className="w-full max-w-md rounded-[28px] bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.22)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#5b7a93]">Passenger Details</p>
                <h3 className="mt-2 text-xl font-black text-slate-900">Attach booking to customer</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPassengerForm(false)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <label className="block">
                <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Name</span>
                <div className="relative">
                  <UserRound size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={passenger.name}
                    onChange={(event) => {
                      setPassenger((current) => ({ ...current, name: event.target.value }));
                      setError('');
                    }}
                    className="w-full rounded-[20px] border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-bold text-slate-900 outline-none focus:border-[#143a5a]"
                    placeholder="Passenger name"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Phone</span>
                <div className="relative">
                  <Phone size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={passenger.phone}
                    onChange={(event) => {
                      setPassenger((current) => ({
                        ...current,
                        phone: event.target.value.replace(/\D/g, '').slice(0, 10),
                      }));
                      setError('');
                    }}
                    inputMode="numeric"
                    maxLength={10}
                    className="w-full rounded-[20px] border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-bold text-slate-900 outline-none focus:border-[#143a5a]"
                    placeholder="10-digit mobile number"
                  />
                </div>
              </label>

              <div className="rounded-[20px] bg-slate-50 p-4 text-sm font-bold text-slate-600">
                Seats: <span className="text-slate-900">{selectedSeats.map((seat) => seat.label).join(', ') || '--'}</span>
                <span className="mx-2 text-slate-300">|</span>
                Total: <span className="text-slate-900">{formatMoney(totalFare)}</span>
              </div>

              {error ? (
                <p className="rounded-[18px] bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600">{error}</p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={reserveSeats}
              disabled={reserving}
              className="mt-5 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-[22px] bg-[#143a5a] px-5 py-4 text-sm font-black uppercase tracking-[0.16em] text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {reserving ? 'Reserving...' : 'Confirm Reservation'}
              <ChevronRight size={17} />
            </button>
          </section>
        </div>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-100 bg-white px-4 py-4 shadow-[0_-12px_34px_rgba(15,23,42,0.12)]">
        <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
              {selectedSeats.length} seat{selectedSeats.length === 1 ? '' : 's'} selected
            </p>
            <p className="mt-1 text-sm font-black text-slate-900">
              {selectedSeats.length ? selectedSeats.map((seat) => seat.label).join(', ') : 'Choose seats from the layout'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Total</p>
              <p className="text-xl font-black text-[#143a5a]">{formatMoney(totalFare)}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setError('');
                setShowPassengerForm(true);
              }}
              disabled={!selectedSeats.length || reserving || loading}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[20px] bg-[#143a5a] px-5 text-sm font-black uppercase tracking-[0.16em] text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            >
              Reserve
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentBusSeats;
