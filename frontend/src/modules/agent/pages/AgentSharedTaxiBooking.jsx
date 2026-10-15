import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CheckCircle2, Sparkles, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/shared/api/axiosInstance';
import { agentService } from '../services/agentService';
import AgentCustomerForm from '../components/AgentCustomerForm';
import { estimateAgentCommission, formatCommissionRule, useAgentCommissionRule } from '../hooks/useAgentCommission';

const unwrapList = (response) => (Array.isArray(response?.data) ? response.data : (response?.data?.results || []));
const roundMoney = (value) => Math.round(Number(value || 0) * 100) / 100;
const tomorrow = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
};

export const AgentSharedTaxiBooking = () => {
  const navigate = useNavigate();
  const commissionRule = useAgentCommissionRule('pooling');
  const [routes, setRoutes] = useState([]);
  const [loadingRoutes, setLoadingRoutes] = useState(true);
  const [routeId, setRouteId] = useState('');
  const [scheduleId, setScheduleId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [pickupStopId, setPickupStopId] = useState('');
  const [dropStopId, setDropStopId] = useState('');
  const [travelDate, setTravelDate] = useState(tomorrow);
  const [bookedSeatIds, setBookedSeatIds] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '' });
  const [submitting, setSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  useEffect(() => {
    let active = true;
    agentService.getPoolingRoutes()
      .then((response) => {
        const items = unwrapList(response).filter((route) => route.vehicles?.length && route.schedules?.length);
        if (active) {
          setRoutes(items);
          setRouteId(items[0]?.id || '');
        }
      })
      .catch((error) => toast.error(error?.message || 'Could not load shared taxi routes'))
      .finally(() => { if (active) setLoadingRoutes(false); });
    return () => { active = false; };
  }, []);

  const selectedRoute = routes.find((route) => route.id === routeId) || null;
  const selectedVehicle = selectedRoute?.vehicles.find((vehicle) => vehicle.id === vehicleId) || selectedRoute?.vehicles[0] || null;
  const selectedSchedule = selectedRoute?.schedules.find((schedule) => schedule.id === scheduleId) || selectedRoute?.schedules[0] || null;
  const pickupPoints = selectedRoute?.pickupPoints?.length ? selectedRoute.pickupPoints : (selectedRoute?.stops || []);
  const dropPoints = selectedRoute?.dropPoints?.length ? selectedRoute.dropPoints : (selectedRoute?.stops || []);

  // Keep dependent selections valid when the route changes.
  useEffect(() => {
    setVehicleId(selectedRoute?.vehicles[0]?.id || '');
    setScheduleId(selectedRoute?.schedules[0]?.id || '');
    setPickupStopId(String(pickupPoints[0]?.id || ''));
    setDropStopId(String(dropPoints[dropPoints.length - 1]?.id || ''));
    setSelectedSeats([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId]);

  // Seats already sold for this route, vehicle, schedule and date.
  useEffect(() => {
    if (!selectedRoute || !selectedVehicle || !selectedSchedule || !travelDate) {
      setBookedSeatIds([]);
      return undefined;
    }
    let active = true;
    api.get(`/users/pooling/routes/${selectedRoute.id}`, { params: { travelDate } })
      .then((response) => {
        const availability = response?.data?.seatAvailability || {};
        if (active) setBookedSeatIds(availability[`${selectedVehicle.id}:${selectedSchedule.id}`] || []);
      })
      .catch(() => { if (active) setBookedSeatIds([]); });
    setSelectedSeats([]);
    return () => { active = false; };
  }, [selectedRoute, selectedSchedule, selectedVehicle, travelDate]);

  const seatLayout = selectedVehicle?.blueprint?.layout || [];
  const seatColumns = selectedVehicle?.blueprint?.cols || 2;

  // Same breakdown the server charges (route fare per seat + vehicle service tax).
  const fare = useMemo(() => {
    const baseFare = roundMoney(Number(selectedRoute?.farePerSeat || 0) * selectedSeats.length);
    const tax = roundMoney((baseFare * Number(selectedVehicle?.serviceTaxPercentage || 0)) / 100);
    return { baseFare, tax, total: roundMoney(baseFare + tax) };
  }, [selectedRoute?.farePerSeat, selectedSeats.length, selectedVehicle?.serviceTaxPercentage]);
  const estimatedCommission = estimateAgentCommission(fare.total, commissionRule);
  const commissionLabel = formatCommissionRule(commissionRule);

  const toggleSeat = (seatId) => {
    setSelectedSeats((current) => (current.includes(seatId) ? current.filter((id) => id !== seatId) : [...current, seatId]));
  };

  const handleBooking = async () => {
    if (!customer.phone || customer.phone.length < 10) {
      toast.error('Enter a valid 10-digit customer phone number');
      return;
    }
    if (!selectedRoute || !selectedVehicle || !selectedSchedule) {
      toast.error('Select a route, vehicle and departure');
      return;
    }
    if (selectedSeats.length === 0) {
      toast.error('Select at least 1 seat');
      return;
    }

    setSubmitting(true);
    try {
      const response = await agentService.createPoolingBooking({
        routeId: selectedRoute.id,
        vehicleId: selectedVehicle.id,
        scheduleId: selectedSchedule.id,
        travelDate,
        selectedSeats,
        pickupStopId,
        dropStopId,
        customer,
      });
      const data = response?.data || {};
      toast.success('Shared taxi booked');
      setConfirmedBooking({
        bookingCode: data.bookingCode || '',
        totalFare: Number(data.amount ?? fare.total),
        commission: estimateAgentCommission(Number(data.amount ?? fare.total), commissionRule),
        route: `${selectedRoute.originLabel} to ${selectedRoute.destinationLabel}`,
        travelDate,
        seats: selectedSeats.length,
      });
    } catch (error) {
      toast.error(error?.message || 'Could not book these seats');
    } finally {
      setSubmitting(false);
    }
  };

  const selectClass = 'w-full rounded-[18px] border border-[#d8e5f1] bg-white px-3 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-[#143a5a]';

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#F8FAFC_0%,#F3F4F6_38%,#EEF2F7_100%)] max-w-lg mx-auto font-sans pb-28 relative overflow-hidden">
      <header className="bg-white/90 backdrop-blur-md px-5 pt-8 pb-4 sticky top-0 z-20 border-b border-white/80 shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/taxi/agent/services')}
            className="w-9 h-9 rounded-[12px] border border-white/80 bg-white/90 flex items-center justify-center shadow-sm active:scale-95 transition-all"
          >
            <ArrowLeft size={18} className="text-slate-900" strokeWidth={2.5} />
          </button>
          <div className="flex-1">
            <p className="text-[9px] font-black uppercase tracking-[0.26em] text-slate-400">Agent Desk</p>
            <h1 className="text-[19px] font-black tracking-tight text-slate-900">Book Shared Taxi</h1>
          </div>
          {commissionLabel && (
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-600 border border-emerald-100">
              {commissionLabel}
            </span>
          )}
        </div>
      </header>

      <div className="px-5 pt-4 space-y-4">
        <AgentCustomerForm customer={customer} onChange={setCustomer} />

        <div className="rounded-[24px] border border-white/70 bg-white/90 p-4 shadow-[0_12px_28px_rgba(20,58,90,0.06)] space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5b7a93]">1. Route & Departure</p>
          {loadingRoutes ? (
            <div className="py-4 flex items-center justify-center gap-2 text-slate-400">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-xs font-semibold">Loading routes...</span>
            </div>
          ) : routes.length === 0 ? (
            <p className="text-xs font-semibold text-slate-400">No shared taxi routes are configured by admin yet.</p>
          ) : (
            <>
              <select value={routeId} onChange={(e) => setRouteId(e.target.value)} className={selectClass}>
                {routes.map((route) => (
                  <option key={route.id} value={route.id}>
                    {route.routeName || `${route.originLabel} → ${route.destinationLabel}`} · ₹{route.farePerSeat}/seat
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Travel Date</label>
                  <input type="date" value={travelDate} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setTravelDate(e.target.value)} className={selectClass} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Departure</label>
                  <select value={selectedSchedule?.id || ''} onChange={(e) => setScheduleId(e.target.value)} className={selectClass}>
                    {selectedRoute?.schedules.map((schedule) => (
                      <option key={schedule.id} value={schedule.id}>{schedule.label || schedule.departureTime || schedule.id}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Pickup Point</label>
                  <select value={pickupStopId} onChange={(e) => setPickupStopId(e.target.value)} className={selectClass}>
                    {pickupPoints.map((point) => (
                      <option key={point.id} value={point.id}>{point.name || point.address}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Drop Point</label>
                  <select value={dropStopId} onChange={(e) => setDropStopId(e.target.value)} className={selectClass}>
                    {dropPoints.map((point) => (
                      <option key={point.id} value={point.id}>{point.name || point.address}</option>
                    ))}
                  </select>
                </div>
              </div>
              {selectedRoute?.vehicles.length > 1 && (
                <select value={selectedVehicle?.id || ''} onChange={(e) => setVehicleId(e.target.value)} className={selectClass}>
                  {selectedRoute.vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>{[vehicle.name, vehicle.vehicleNumber].filter(Boolean).join(' · ')}</option>
                  ))}
                </select>
              )}
            </>
          )}
        </div>

        {selectedVehicle && (
          <div className="rounded-[24px] border border-white/70 bg-white/90 p-4 shadow-[0_12px_28px_rgba(20,58,90,0.06)]">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5b7a93]">2. Select Seats</p>
              <span className="text-xs font-black text-slate-700">₹{selectedRoute.farePerSeat} / seat</span>
            </div>
            {seatLayout.length === 0 ? (
              <p className="text-xs font-semibold text-slate-400">This vehicle has no seat layout configured.</p>
            ) : (
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${seatColumns}, minmax(0, 1fr))` }}>
                {seatLayout.map((item, idx) => {
                  if (item.type === 'empty' || item.type === 'gap') {
                    return <div key={`gap-${idx}`} className="h-12" />;
                  }
                  const seatId = `${item.r}-${item.c}`;
                  const isDriver = item.type === 'driver';
                  const isBooked = item.status === 'booked' || bookedSeatIds.includes(seatId);
                  const isSelected = selectedSeats.includes(seatId);
                  return (
                    <button
                      key={seatId}
                      type="button"
                      disabled={isDriver || isBooked}
                      onClick={() => toggleSeat(seatId)}
                      className={`h-12 rounded-[14px] border text-[11px] font-black transition-all ${
                        isDriver
                          ? 'bg-slate-900 border-slate-900 text-slate-400'
                          : isBooked
                            ? 'bg-slate-100 border-slate-100 text-slate-300 cursor-not-allowed'
                            : isSelected
                              ? 'bg-[#143a5a] border-[#143a5a] text-white'
                              : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      {isDriver ? 'DRV' : (item.label || `S${idx + 1}`)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="rounded-[24px] bg-[linear-gradient(145deg,#143a5a_0%,#0f6aa8_100%)] p-4 text-white shadow-[0_14px_30px_rgba(20,58,90,0.18)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/60">Total Fare</p>
              <h3 className="mt-1 text-2xl font-black">₹{fare.total}</h3>
              <p className="text-xs font-semibold text-white/75">{selectedSeats.length} seat(s){fare.tax > 0 ? ` · incl. ₹${fare.tax} tax` : ''}</p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-black text-emerald-300 ring-1 ring-emerald-400/40">
                <Sparkles size={12} />
                Est. Commission
              </span>
              <p className="mt-1 text-xl font-black text-emerald-300">+₹{estimatedCommission}</p>
            </div>
          </div>
        </div>

        <button
          type="button"
          disabled={submitting || !selectedVehicle || selectedSeats.length === 0}
          onClick={handleBooking}
          className="w-full rounded-[22px] bg-[#143a5a] py-4 text-sm font-black uppercase tracking-[0.2em] text-white shadow-[0_12px_28px_rgba(20,58,90,0.22)] active:scale-95 transition-all disabled:opacity-50"
        >
          {submitting ? 'Booking Seats...' : 'Confirm & Book Seats'}
        </button>
      </div>

      <AnimatePresence>
        {confirmedBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm rounded-[32px] bg-white p-6 text-center shadow-2xl space-y-4"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 shadow-inner">
                <CheckCircle2 size={36} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400">Booking Confirmed</p>
                <h3 className="text-xl font-black text-slate-900 mt-1">Seats Booked</h3>
                {confirmedBooking.bookingCode && (
                  <p className="text-xs font-bold text-slate-500 mt-1">Code: <span className="font-mono text-slate-800">{confirmedBooking.bookingCode}</span></p>
                )}
              </div>
              <div className="rounded-[20px] bg-slate-50 p-4 text-left text-xs font-semibold text-slate-700 space-y-2 border border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-400">Route:</span>
                  <span className="font-black text-slate-900 truncate max-w-[180px]">{confirmedBooking.route}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Date · Seats:</span>
                  <span className="font-black text-slate-900">{confirmedBooking.travelDate} · {confirmedBooking.seats}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 font-black">
                  <span className="text-slate-500">Collected Fare:</span>
                  <span className="text-base text-slate-900">₹{confirmedBooking.totalFare}</span>
                </div>
                <div className="flex justify-between font-black text-emerald-600">
                  <span>Commission:</span>
                  <span className="text-base">+₹{confirmedBooking.commission}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/taxi/agent/bookings')}
                className="w-full rounded-[20px] bg-[#143a5a] py-3.5 text-xs font-black uppercase tracking-[0.18em] text-white shadow-lg active:scale-95 transition-all"
              >
                Go to Bookings Ledger
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AgentSharedTaxiBooking;
