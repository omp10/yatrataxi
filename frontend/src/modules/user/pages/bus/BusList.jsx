import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ChevronRight,
  Loader2,
  BusFront,
  Star,
  Clock3,
} from 'lucide-react';
import userBusService from '../../services/busService';

const SORT_OPTIONS = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'price-asc', label: 'Price: Low to High' },
  { id: 'departure-asc', label: 'Early Departure' },
  { id: 'rating-desc', label: 'Top Rated' },
];

const getRoutePrefix = (pathname = '') => (pathname.startsWith('/taxi/user') ? '/taxi/user' : '');

const formatTravelDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return dateStr;
  }
};

const formatDurationBrief = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) return 'Direct';
  return raw
    .replace(/days?/gi, 'd')
    .replace(/hours?/gi, 'h')
    .replace(/hrs?/gi, 'h')
    .replace(/minutes?/gi, 'm')
    .replace(/mins?/gi, 'm')
    .replace(/\s+/g, ' ')
    .trim();
};

const getNumericValue = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getDepartureSortValue = (bus) => {
  const raw = String(bus?.departure || '').trim();
  const match = raw.match(/(\d{1,2}):(\d{2})/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  return Number(match[1]) * 60 + Number(match[2]);
};

const BusList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const routePrefix = useMemo(() => getRoutePrefix(location.pathname), [location.pathname]);
  const state = location.state || {};
  const { fromCity, toCity, date } = state;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [buses, setBuses] = useState([]);
  const [sortBy, setSortBy] = useState('recommended');

  useEffect(() => {
    if (!fromCity || !toCity || !date) {
      navigate(`${routePrefix}/bus`, { replace: true });
      return;
    }

    let active = true;

    const loadResults = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await userBusService.searchBuses({ fromCity, toCity, date });
        if (!active) return;
        setBuses(Array.isArray(response?.data?.results) ? response.data.results : []);
      } catch (err) {
        if (!active) return;
        setError(err?.message || 'Failed to search buses');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadResults();
    return () => {
      active = false;
    };
  }, [date, fromCity, navigate, routePrefix, toCity]);

  const visibleBuses = useMemo(() => {
    const nextBuses = Array.isArray(buses) ? [...buses] : [];

    if (sortBy === 'price-asc') {
      nextBuses.sort(
        (left, right) =>
          getNumericValue(left?.price, Number.MAX_SAFE_INTEGER) -
          getNumericValue(right?.price, Number.MAX_SAFE_INTEGER),
      );
    } else if (sortBy === 'departure-asc') {
      nextBuses.sort((left, right) => getDepartureSortValue(left) - getDepartureSortValue(right));
    } else if (sortBy === 'rating-desc') {
      nextBuses.sort((left, right) => {
        const ratingDelta = getNumericValue(right?.rating, 0) - getNumericValue(left?.rating, 0);
        if (ratingDelta !== 0) return ratingDelta;
        return getNumericValue(right?.ratingCount, 0) - getNumericValue(left?.ratingCount, 0);
      });
    }

    return nextBuses;
  }, [buses, sortBy]);

  const lowestPrice = useMemo(() => {
    if (!buses.length) return null;
    const prices = buses.map((b) => Number(b.price || 0)).filter((p) => p > 0);
    return prices.length ? Math.min(...prices) : null;
  }, [buses]);

  const handleSelect = (bus) => {
    navigate(`${routePrefix}/bus/details`, {
      state: {
        ...state,
        bus,
      },
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 max-w-lg mx-auto font-sans pb-32 relative overflow-hidden">
      {/* Sticky Header matching BusHome */}
      <header className="bg-white px-5 pt-10 pb-4 sticky top-0 z-20 border-b border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center shadow-sm active:scale-95 transition-all"
          >
            <ArrowLeft size={18} className="text-slate-900" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Available Buses</p>
            <h1 className="text-xl font-bold text-slate-900 truncate">
              {fromCity} → {toCity}
            </h1>
          </div>
          <div className="text-right shrink-0">
            <span className="inline-block rounded-xl bg-slate-50 border border-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
              {formatTravelDate(date)}
            </span>
          </div>
        </div>
      </header>

      <div className="px-5 pt-6 space-y-6">
        {/* Top Dark Hero Card matching BusHome */}
        <div className="rounded-3xl bg-slate-900 p-6 text-white shadow-xl shadow-slate-200">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold leading-tight">Direct Buses</h2>
              <p className="mt-2 text-sm text-slate-300 font-medium">
                {fromCity} to {toCity}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
              <BusFront size={24} className="text-white" />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4 border-t border-white/10 pt-4">
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">Buses</p>
              <p className="mt-1 text-lg font-bold">{loading ? '...' : visibleBuses.length}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">Travel Date</p>
              <p className="mt-1 text-sm font-bold truncate">{formatTravelDate(date)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">Starting From</p>
              <p className="mt-1 text-lg font-bold">
                {lowestPrice ? `₹${lowestPrice}` : '--'}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Filter Chips matching BusHome */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Filter & Sort</p>
          <div className="flex flex-wrap gap-2">
            {SORT_OPTIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSortBy(item.id)}
                className={`rounded-full px-4 py-2 text-xs font-bold transition-all active:scale-95 ${
                  sortBy === item.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 border border-slate-100 hover:border-slate-300 shadow-sm'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bus List Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">
              {loading ? 'Searching...' : `${visibleBuses.length} ${visibleBuses.length === 1 ? 'Bus' : 'Buses'} Available`}
            </h3>
            {loading && <Loader2 size={18} className="animate-spin text-slate-400" />}
          </div>

          {error && (
            <div className="rounded-2xl bg-rose-50 border border-rose-100 p-4 text-xs font-bold text-rose-600">
              {error}
            </div>
          )}

          {!loading && !visibleBuses.length && !error && (
            <div className="rounded-3xl bg-white p-8 text-center border border-slate-100 shadow-sm">
              <BusFront size={40} className="mx-auto text-slate-300 mb-3" />
              <h4 className="text-base font-bold text-slate-900">No buses found</h4>
              <p className="mt-1 text-xs text-slate-500 font-medium">
                There are no scheduled buses between {fromCity} and {toCity} on this date.
              </p>
            </div>
          )}

          <div className="space-y-3">
            {visibleBuses.map((bus) => (
              <button
                key={bus.id}
                type="button"
                onClick={() => handleSelect(bus)}
                className="w-full rounded-2xl border border-slate-100 bg-white p-5 text-left shadow-sm active:scale-[0.99] transition-transform hover:border-slate-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {/* Timings row */}
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-slate-900">{bus.departure}</span>
                      <span className="text-slate-400 font-medium">→</span>
                      <span className="text-xl font-bold text-slate-700">{bus.arrival}</span>
                      <span className="ml-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
                        {formatDurationBrief(bus.duration)}
                      </span>
                    </div>

                    {/* Operator and coach type */}
                    <h4 className="mt-2 text-base font-bold text-slate-900 truncate">
                      {bus.operator || bus.busName || 'Bus Service'}
                    </h4>
                    <p className="mt-0.5 text-xs font-medium text-slate-500 truncate">
                      {bus.type} • {bus.busName || bus.routeName || `${fromCity} to ${toCity}`}
                    </p>

                    {/* Seats & Amenities badges */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {bus.availableSeats > 0 ? (
                        <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-100">
                          {bus.availableSeats} seats left
                        </span>
                      ) : null}
                      {Array.isArray(bus.amenities)
                        ? bus.amenities.slice(0, 3).map((amenity) => (
                            <span
                              key={amenity}
                              className="rounded-lg bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 border border-slate-100"
                            >
                              {amenity}
                            </span>
                          ))
                        : null}
                    </div>
                  </div>

                  {/* Right side: Price & details chevron */}
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-bold uppercase text-slate-400">From</p>
                    <p className="text-xl font-bold text-slate-900">
                      ₹{Number(bus.price || 0).toLocaleString('en-IN')}
                    </p>
                    <div className="mt-3 flex items-center justify-end gap-1 text-xs font-bold text-slate-400 hover:text-slate-700">
                      <span>Details</span>
                      <ChevronRight size={14} />
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusList;
