import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Bus, CalendarDays, MapPinned, Search } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { agentService } from '../services/agentService';

const cardClass = 'rounded-[30px] border border-white/70 bg-white/90 p-5 shadow-[0_18px_36px_rgba(20,58,90,0.08)] backdrop-blur-xl';
const inputClass = 'w-full rounded-[22px] border border-[#d8e5f1] bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-[#143a5a]';

const getMinTravelDate = () => {
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + 1);
  return nextDate.toISOString().slice(0, 10);
};

const openNativeDatePicker = (input) => {
  if (!input) {
    return;
  }

  try {
    if (typeof input.showPicker === 'function') {
      input.showPicker();
      return;
    }
  } catch {}

  input.focus();
};

const AgentBusBooking = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const travelDateInputRef = useRef(null);
  const minTravelDate = useMemo(() => getMinTravelDate(), []);
  const priorState = location.state || {};
  const [error, setError] = useState('');
  const [routeOptions, setRouteOptions] = useState([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [activeSuggestionField, setActiveSuggestionField] = useState('');
  const [form, setForm] = useState({
    fromCity: priorState.fromCity || '',
    toCity: priorState.toCity || '',
    travelDate: priorState.travelDate || '',
  });

  useEffect(() => {
    let active = true;

    const loadRoutes = async () => {
      setLoadingRoutes(true);

      try {
        const response = await agentService.getBusRoutes();
        const items = response?.data?.data || [];
        if (active) {
          setRouteOptions(Array.isArray(items) ? items : []);
        }
      } catch (loadError) {
        if (active) {
          setRouteOptions([]);
        }
      } finally {
        if (active) {
          setLoadingRoutes(false);
        }
      }
    };

    loadRoutes();

    return () => {
      active = false;
    };
  }, []);

  const citySuggestions = useMemo(() => {
    const fromSet = new Set();
    const toSet = new Set();

    routeOptions.forEach((item) => {
      const fromCity = String(item?.fromCity || '').trim();
      const toCity = String(item?.toCity || '').trim();

      if (fromCity) {
        fromSet.add(fromCity);
      }

      if (toCity) {
        toSet.add(toCity);
      }
    });

    return {
      fromCity: Array.from(fromSet).sort((left, right) => left.localeCompare(right)),
      toCity: Array.from(toSet).sort((left, right) => left.localeCompare(right)),
    };
  }, [routeOptions]);

  const getFilteredSuggestions = (fieldName) => {
    const query = String(form[fieldName] || '').trim().toLowerCase();
    const siblingField = fieldName === 'fromCity' ? 'toCity' : 'fromCity';
    const siblingValue = String(form[siblingField] || '').trim().toLowerCase();
    const candidates = citySuggestions[fieldName] || [];

    return candidates
      .filter((item) => {
        const normalizedItem = item.toLowerCase();
        if (!normalizedItem) {
          return false;
        }

        if (query && !normalizedItem.includes(query)) {
          return false;
        }

        if (siblingValue && normalizedItem === siblingValue) {
          return false;
        }

        return true;
      })
      .slice(0, 6);
  };

  const fromSuggestions = getFilteredSuggestions('fromCity');
  const toSuggestions = getFilteredSuggestions('toCity');

  const applySuggestion = (fieldName, value) => {
    setForm((current) => ({
      ...current,
      [fieldName]: value,
    }));
    setActiveSuggestionField('');
    setError('');
  };

  const handleSearch = () => {
    if (!form.fromCity || !form.toCity || !form.travelDate) {
      setError('Select from city, to city, and travel date first');
      return;
    }

    setError('');
    const params = new URLSearchParams({
      fromCity: form.fromCity,
      toCity: form.toCity,
      travelDate: form.travelDate,
    });

    navigate(`/taxi/agent/book-bus/results?${params.toString()}`, {
      state: {
        fromCity: form.fromCity,
        toCity: form.toCity,
        travelDate: form.travelDate,
      },
    });
  };

  return (
    <div className="space-y-4">
      <button type="button" onClick={() => navigate('/taxi/agent')} className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[#143a5a]">
        <ArrowLeft size={14} />
        Back
      </button>

      <section className={`${cardClass} overflow-hidden bg-[linear-gradient(140deg,_rgba(20,58,90,0.98)_0%,_rgba(15,106,168,0.92)_100%)] text-white`}>
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/60">Agent Bus Desk</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Search Bus Routes</h1>
        <p className="mt-3 max-w-md text-sm font-semibold leading-6 text-white/75">
          Pick the route and travel date here. We&apos;ll open the next page with all available buses and seat selection.
        </p>
      </section>

      <section className={cardClass}>
        <div className="flex items-center gap-2">
          <Search size={16} className="text-[#0f6aa8]" />
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5b7a93]">Route search</p>
        </div>
        <div className="mt-4 grid gap-3">
          <div className="relative">
            <MapPinned size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className={`${inputClass} pl-11`}
              value={form.fromCity}
              onFocus={() => setActiveSuggestionField('fromCity')}
              onBlur={() => window.setTimeout(() => setActiveSuggestionField((current) => (current === 'fromCity' ? '' : current)), 120)}
              onChange={(event) => {
                setForm((current) => ({ ...current, fromCity: event.target.value }));
                setActiveSuggestionField('fromCity');
                setError('');
              }}
              placeholder="From city"
            />
            {activeSuggestionField === 'fromCity' && fromSuggestions.length > 0 ? (
              <div className="absolute left-0 right-0 top-[calc(100%+0.45rem)] z-20 overflow-hidden rounded-[22px] border border-[#d8e5f1] bg-white shadow-[0_20px_40px_rgba(20,58,90,0.12)]">
                {fromSuggestions.map((item) => (
                  <button
                    key={`from-${item}`}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => applySuggestion('fromCity', item)}
                    className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left text-sm font-semibold text-slate-700 last:border-b-0 hover:bg-slate-50"
                  >
                    <span>{item}</span>
                    <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#0f6aa8]">Route</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="relative">
            <Bus size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className={`${inputClass} pl-11`}
              value={form.toCity}
              onFocus={() => setActiveSuggestionField('toCity')}
              onBlur={() => window.setTimeout(() => setActiveSuggestionField((current) => (current === 'toCity' ? '' : current)), 120)}
              onChange={(event) => {
                setForm((current) => ({ ...current, toCity: event.target.value }));
                setActiveSuggestionField('toCity');
                setError('');
              }}
              placeholder="To city"
            />
            {activeSuggestionField === 'toCity' && toSuggestions.length > 0 ? (
              <div className="absolute left-0 right-0 top-[calc(100%+0.45rem)] z-20 overflow-hidden rounded-[22px] border border-[#d8e5f1] bg-white shadow-[0_20px_40px_rgba(20,58,90,0.12)]">
                {toSuggestions.map((item) => (
                  <button
                    key={`to-${item}`}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => applySuggestion('toCity', item)}
                    className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left text-sm font-semibold text-slate-700 last:border-b-0 hover:bg-slate-50"
                  >
                    <span>{item}</span>
                    <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#0f6aa8]">Route</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="relative">
            <CalendarDays size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={travelDateInputRef}
              type="date"
              min={minTravelDate}
              inputMode="none"
              onKeyDown={(event) => event.preventDefault()}
              onPointerDown={() => openNativeDatePicker(travelDateInputRef.current)}
              onFocus={() => setError('')}
              className={`${inputClass} pl-11`}
              value={form.travelDate}
              onChange={(event) => setForm((current) => ({ ...current, travelDate: event.target.value }))}
            />
          </div>
        </div>
        <div className="mt-4 min-h-5">
          {loadingRoutes ? (
            <p className="text-[11px] font-bold tracking-[0.08em] text-[#5b7a93]">Loading active route suggestions...</p>
          ) : routeOptions.length > 0 ? (
            <p className="text-[11px] font-bold tracking-[0.08em] text-[#5b7a93]">
              Start typing a city name to pick from existing active bus routes.
            </p>
          ) : (
            <p className="text-[11px] font-bold tracking-[0.08em] text-[#5b7a93]">
              No saved bus routes were found yet. You can still type the route manually.
            </p>
          )}
        </div>
      </section>

      {error ? (
        <section className={cardClass}>
          <p className="text-sm font-semibold text-rose-600">{error}</p>
        </section>
      ) : null}

      <button type="button" onClick={handleSearch} className="w-full rounded-[24px] bg-[#143a5a] px-5 py-4 text-sm font-black uppercase tracking-[0.2em] text-white">
        Search Available Buses
      </button>
    </div>
  );
};

export default AgentBusBooking;
