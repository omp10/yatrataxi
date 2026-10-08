import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  MapPin, 
  Clock, 
  Users, 
  ChevronRight, 
  Car, 
  Star, 
  ShieldCheck, 
  Zap, 
  Calendar,
  ArrowRight,
  Armchair,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { userService } from '../../services/userService';
import toast from 'react-hot-toast';
import {
  formatTime12Hour,
  getJourneyDuration,
  getTimePeriodCategory,
  formatDateDisplay,
  getTimeSlotStatus,
  parseTimeToMinutes,
} from '../../utils/poolingTimeUtils';

// Asset Imports
import taxiImg from '../../../../assets/3d images/AutoCab/taxi.png';

const TIME_FILTERS = [
  { id: 'all', label: 'All Times', icon: '🕒' },
  { id: 'morning', label: 'Morning', sub: '4 AM - 12 PM', icon: '🌅' },
  { id: 'afternoon', label: 'Afternoon', sub: '12 PM - 5 PM', icon: '☀️' },
  { id: 'evening', label: 'Evening', sub: '5 PM - 9 PM', icon: '🌆' },
  { id: 'night', label: 'Night', sub: '9 PM - 4 AM', icon: '🌙' },
];

const SORT_OPTIONS = [
  { id: 'time_asc', label: 'Earliest Departure' },
  { id: 'time_desc', label: 'Latest Departure' },
  { id: 'price_asc', label: 'Lowest Fare' },
];

const PoolingList = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';
  const initialDate = searchParams.get('date') || new Date().toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTimeFilter, setActiveTimeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('time_asc');
  const [selectedScheduleMap, setSelectedScheduleMap] = useState({});

  useEffect(() => {
    fetchRoutes(selectedDate);
  }, [from, to, selectedDate]);

  const fetchRoutes = async (queryDate) => {
    setLoading(true);
    try {
      const res = await userService.searchPoolingRoutes({ from, to, date: queryDate });
      let data = Array.isArray(res?.data?.data) ? res.data.data : Array.isArray(res?.data) ? res.data : [];

      if (from || to) {
        const cleanFrom = (from || '').trim().toLowerCase();
        const cleanTo = (to || '').trim().toLowerCase();

        const scoreRoute = (route) => {
          const origin = (route.originLabel || '').trim().toLowerCase();
          const destination = (route.destinationLabel || '').trim().toLowerCase();

          const originExact = cleanFrom && origin === cleanFrom;
          const destExact = cleanTo && destination === cleanTo;

          if (originExact && destExact) return 10;

          const originIncludes = cleanFrom && origin.includes(cleanFrom);
          const destIncludes = cleanTo && destination.includes(cleanTo);

          if (originIncludes && destIncludes) return 8;
          if (originExact) return 5;
          if (originIncludes) return 4;
          if (destExact) return 3;
          if (destIncludes) return 2;
          return 0;
        };

        data = [...data].sort((a, b) => scoreRoute(b) - scoreRoute(a));
      }

      setRoutes(data);
    } catch {
      toast.error('Failed to fetch available sharing cars');
    } finally {
      setLoading(false);
    }
  };

  // Expand routes into scheduled trip instances so every departure time is an explicit option
  const trips = useMemo(() => {
    const list = [];
    routes.forEach((route) => {
      const vehicle = route.assignedVehicleTypeIds?.[0] || {};
      const activeSchedules = Array.isArray(route.schedules) && route.schedules.length > 0
        ? route.schedules
        : [
            {
              id: 'standard-slot',
              label: 'Standard Trip',
              departureTime: '08:00',
              arrivalTime: '11:00',
              status: 'active',
            },
          ];

      activeSchedules.forEach((schedule) => {
        list.push({
          tripId: `${route._id}-${schedule.id}`,
          route,
          schedule,
          vehicle,
          departureTime: schedule.departureTime || '08:00',
          arrivalTime: schedule.arrivalTime || '11:00',
          duration: getJourneyDuration(schedule.departureTime, schedule.arrivalTime),
          timeCategory: getTimePeriodCategory(schedule.departureTime),
          allSchedules: activeSchedules,
        });
      });
    });

    // Apply Time Filter
    let filtered = list;
    if (activeTimeFilter !== 'all') {
      filtered = filtered.filter((t) => t.timeCategory === activeTimeFilter);
    }

    // Apply Sorting
    return [...filtered].sort((a, b) => {
      if (sortBy === 'time_asc') {
        return parseTimeToMinutes(a.departureTime) - parseTimeToMinutes(b.departureTime);
      }
      if (sortBy === 'time_desc') {
        return parseTimeToMinutes(b.departureTime) - parseTimeToMinutes(a.departureTime);
      }
      if (sortBy === 'price_asc') {
        return Number(a.route.farePerSeat || 0) - Number(b.route.farePerSeat || 0);
      }
      return 0;
    });
  }, [routes, activeTimeFilter, sortBy]);

  // Handle user selecting a sharing car trip
  const handleSelectTrip = (trip) => {
    const activeSchedule = selectedScheduleMap[trip.route._id] || trip.schedule;
    navigate(`/taxi/user/pooling/seats/${trip.route._id}`, {
      state: {
        travelDate: selectedDate,
        scheduleId: activeSchedule.id,
        schedule: activeSchedule,
      },
    });
  };

  // Quick date change helpers
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrowStr = tomorrowObj.toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-slate-100 max-w-lg mx-auto font-sans pb-28 selection:bg-indigo-100">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl px-5 pt-10 pb-4 shadow-sm border-b border-slate-200/80">
        <div className="flex items-center gap-3 mb-3">
          <button 
            onClick={() => navigate('/taxi/user/pooling')}
            className="w-10 h-10 rounded-2xl border border-slate-200 bg-white flex items-center justify-center text-slate-900 shadow-sm active:scale-95 transition-all hover:bg-slate-50"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-black text-slate-900 leading-tight">
                {from || 'All Origins'}
              </span>
              <ChevronRight size={13} className="text-slate-400 shrink-0" />
              <span className="truncate text-sm font-black text-slate-900 leading-tight">
                {to || 'All Destinations'}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                {formatDateDisplay(selectedDate)}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-[10px] font-bold text-slate-500">
                {trips.length} time slots
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-black text-indigo-600">
            <Sparkles size={11} />
            <span>Live Times</span>
          </div>
        </div>

        {/* Quick Date Switcher Pills */}
        <div className="flex items-center gap-2 pt-1 pb-2">
          <button
            type="button"
            onClick={() => setSelectedDate(todayStr)}
            className={`px-3 py-1 rounded-full text-[11px] font-black transition-all ${
              selectedDate === todayStr
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setSelectedDate(tomorrowStr)}
            className={`px-3 py-1 rounded-full text-[11px] font-black transition-all ${
              selectedDate === tomorrowStr
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tomorrow
          </button>
          <div className="relative flex-1">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full text-[11px] font-black bg-slate-100 rounded-full px-3 py-1 text-slate-700 outline-none border border-transparent focus:border-indigo-300"
            />
          </div>
        </div>

        {/* Time Period Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-2 pb-1">
          {TIME_FILTERS.map((filter) => {
            const isActive = activeTimeFilter === filter.id;
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setActiveTimeFilter(filter.id)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <span>{filter.icon}</span>
                <span>{filter.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sort & Results Bar */}
      <div className="px-5 pt-4 flex items-center justify-between">
        <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
          {trips.length} {trips.length === 1 ? 'Trip' : 'Trips'} Available
        </p>
        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-xl shadow-xs">
          <SlidersHorizontal size={11} className="text-slate-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-transparent text-[11px] font-bold outline-none cursor-pointer"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sharing Cars List */}
      <div className="px-5 pt-3">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 w-full animate-pulse rounded-3xl bg-white border border-slate-200 shadow-sm" />
            ))}
          </div>
        ) : trips.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-3xl border border-slate-200 p-8 shadow-sm"
          >
            <div className="mb-4 relative">
              <div className="h-20 w-20 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-400">
                <Clock size={36} />
              </div>
            </div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">No Sharing Cars at this Time</h3>
            <p className="mt-2 max-w-[260px] text-xs font-medium text-slate-500 leading-relaxed">
              No carpools match your selected time slot for {formatDateDisplay(selectedDate)}. Try selecting "All Times" or changing the date.
            </p>
            <button 
              onClick={() => setActiveTimeFilter('all')}
              className="mt-6 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-white px-6 py-3 bg-slate-900 rounded-2xl shadow-lg active:scale-95 transition-all"
            >
              Show All Times
            </button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {trips.map((trip, idx) => {
              const { route, schedule, vehicle } = trip;
              const vehicleImage = (vehicle.images && vehicle.images.length > 0) ? vehicle.images[0] : taxiImg;
              const vehicleCapacity = Number(vehicle.capacity || 4);
              const bookedCount = Number(schedule.bookedSeatCount || 0);
              const remainingSeats = Math.max(1, vehicleCapacity - bookedCount);
              const timeStatus = getTimeSlotStatus(schedule.departureTime, selectedDate);
              const serviceTaxPercentage = Number(vehicle.serviceTaxPercentage || 0);

              const formattedDep = formatTime12Hour(schedule.departureTime);
              const formattedArr = formatTime12Hour(schedule.arrivalTime);

              return (
                <motion.div
                  key={trip.tripId}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => handleSelectTrip(trip)}
                  className="group relative overflow-hidden rounded-[28px] border border-slate-200/90 bg-white p-5 shadow-sm hover:shadow-md transition-all hover:border-indigo-300 cursor-pointer"
                >
                  {/* Top: Departure & Arrival Time Header */}
                  <div className="bg-slate-50 rounded-2xl p-3.5 mb-3.5 border border-slate-100 flex items-center justify-between">
                    {/* Departure info */}
                    <div className="text-left">
                      <div className="flex items-center gap-1.5">
                        <Clock size={13} className="text-indigo-600" />
                        <span className="text-lg font-black tracking-tight text-slate-900 leading-none">
                          {formattedDep}
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-500 truncate max-w-[110px] mt-1">
                        {route.originLabel}
                      </p>
                    </div>

                    {/* Journey arrow & duration */}
                    <div className="flex flex-col items-center px-2">
                      <span className="text-[9px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                        {trip.duration || 'Direct'}
                      </span>
                      <div className="flex items-center gap-1 my-1">
                        <div className="h-0.5 w-6 bg-slate-300" />
                        <ArrowRight size={10} className="text-slate-400" />
                        <div className="h-0.5 w-6 bg-slate-300" />
                      </div>
                      <span className="text-[9px] font-semibold text-slate-400">
                        {schedule.label || 'Daily Run'}
                      </span>
                    </div>

                    {/* Arrival info */}
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-lg font-black tracking-tight text-slate-900 leading-none">
                          {formattedArr}
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-500 truncate max-w-[110px] mt-1">
                        {route.destinationLabel}
                      </p>
                    </div>
                  </div>

                  {/* Middle: Vehicle details & Seat Fare */}
                  <div className="flex items-center justify-between gap-3">
                    {/* Vehicle Preview */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-14 w-20 overflow-hidden rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center p-1 shrink-0 group-hover:scale-105 transition-transform">
                        <img 
                          src={vehicleImage} 
                          alt={vehicle.name || 'Cab'} 
                          className="h-full w-full object-contain" 
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-black text-slate-900 truncate">
                            {vehicle.name || vehicle.vehicleModel || 'Shared Cab'}
                          </p>
                          <span className="bg-slate-100 text-slate-700 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                            {vehicle.vehicleType || 'Car'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                            <Armchair size={11} />
                            {remainingSeats} seats left
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            AC Vehicle
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Fare */}
                    <div className="text-right shrink-0">
                      <div className="flex items-baseline justify-end gap-1">
                        <span className="text-2xl font-black tracking-tight text-slate-900 leading-none">
                          ₹{route.farePerSeat}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          / seat
                        </span>
                      </div>
                      {serviceTaxPercentage > 0 ? (
                        <p className="text-[9px] font-bold text-amber-600 mt-0.5">
                          +{serviceTaxPercentage}% tax
                        </p>
                      ) : (
                        <p className="text-[9px] font-bold text-slate-400 mt-0.5">
                          All taxes incl.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Other Available Departure Times on this Route */}
                  {trip.allSchedules.length > 1 && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0">
                          Other times:
                        </span>
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                          {trip.allSchedules.map((s) => {
                            const isCurrent = s.id === schedule.id;
                            return (
                              <button
                                key={s.id}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectTrip({
                                    ...trip,
                                    schedule: s,
                                    departureTime: s.departureTime,
                                    arrivalTime: s.arrivalTime,
                                  });
                                }}
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-all shrink-0 ${
                                  isCurrent
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                {formatTime12Hour(s.departureTime)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bottom Footer Action */}
                  <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                        🚗
                      </div>
                      <div>
                        <p className="text-[11px] font-black text-slate-900 leading-tight">
                          {route.driverName || 'Verified Pilot'}
                        </p>
                        <p className="text-[9px] font-bold text-emerald-600 flex items-center gap-1">
                          <ShieldCheck size={9} /> Verified & GPS Tracked
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-[11px] font-black uppercase tracking-wider shadow-sm group-hover:bg-indigo-600 transition-all shrink-0">
                      <span>Book {formattedDep}</span>
                      <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PoolingList;
