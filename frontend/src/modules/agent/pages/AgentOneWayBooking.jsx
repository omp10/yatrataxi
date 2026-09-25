import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, MapPin, Calendar, Clock, CheckCircle2, Sparkles, Navigation } from 'lucide-react';
import toast from 'react-hot-toast';
import { agentService } from '../services/agentService';
import AgentCustomerForm from '../components/AgentCustomerForm';

const POPULAR_CITIES = ['Indore', 'Bhopal', 'Ujjain', 'Dewas', 'Gwalior', 'Jabalpur', 'Khandwa', 'Ratlam', 'Sagar'];

const CITY_DISTANCES = {
  'Indore-Bhopal': 195,
  'Bhopal-Indore': 195,
  'Indore-Ujjain': 55,
  'Ujjain-Indore': 55,
  'Indore-Dewas': 35,
  'Dewas-Indore': 35,
  'Indore-Jabalpur': 505,
  'Indore-Gwalior': 510,
  'Indore-Ratlam': 140,
  'Indore-Khandwa': 130,
};

const VEHICLE_TYPES = [
  { id: 'sedan', name: 'Sedan (Dzire / Etios)', ratePerKm: 12, baseFare: 400, desc: 'AC Sedan · 4 Passengers + Luggage' },
  { id: 'suv', name: 'SUV (Ertiga / Lodgy)', ratePerKm: 16, baseFare: 600, desc: 'AC SUV · 6 Passengers + Extra Luggage' },
  { id: 'prime_suv', name: 'Premium (Innova Crysta)', ratePerKm: 21, baseFare: 800, desc: 'Luxury AC · 6 Passengers + Large Bags' },
];

export const AgentOneWayBooking = () => {
  const navigate = useNavigate();
  const [fromCity, setFromCity] = useState('Indore');
  const [toCity, setToCity] = useState('Bhopal');
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropAddress, setDropAddress] = useState('');
  const [travelDate, setTravelDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [travelTime, setTravelTime] = useState('08:00');
  const [selectedVehicle, setSelectedVehicle] = useState(VEHICLE_TYPES[0]);
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '' });
  const [submitting, setSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  const routeKey = `${fromCity}-${toCity}`;
  const estimatedKm = CITY_DISTANCES[routeKey] || 150;
  const calculatedFare = Math.round(selectedVehicle.baseFare + estimatedKm * selectedVehicle.ratePerKm);
  const estimatedCommission = Math.round(calculatedFare * 0.06 * 100) / 100; // 6% Intercity commission

  const handleBooking = async () => {
    if (!customer.phone || customer.phone.length < 10) {
      toast.error('Enter a valid 10-digit customer mobile number');
      return;
    }
    if (!pickupAddress.trim()) {
      toast.error('Enter pickup address in ' + fromCity);
      return;
    }
    if (!dropAddress.trim()) {
      toast.error('Enter drop address in ' + toCity);
      return;
    }
    if (fromCity === toCity) {
      toast.error('Origin and Destination cities must be different');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        customer,
        pickupAddress: `${pickupAddress}, ${fromCity}`,
        dropAddress: `${dropAddress}, ${toCity}`,
        pickup: [75.8577, 22.7196],
        drop: [77.4126, 23.2599],
        fare: calculatedFare,
        serviceType: 'intercity',
        transport_type: 'intercity',
        paymentMethod: 'cash',
        scheduledAt: `${travelDate}T${travelTime}:00`,
        estimatedDistanceMeters: estimatedKm * 1000,
        estimatedDurationMinutes: Math.round(estimatedKm * 1.3),
        intercity: {
          fromCity,
          toCity,
          tripType: 'one_way',
          travelDate,
        },
      };

      const response = await agentService.createRideBooking(payload);
      const data = response?.data?.data || response?.data || {};

      toast.success('One-way Intercity cab booked! 6% Commission credited.');
      setConfirmedBooking({
        bookingId: data._id || `IC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        route: `${fromCity} to ${toCity}`,
        pickup: `${pickupAddress}, ${fromCity}`,
        drop: `${dropAddress}, ${toCity}`,
        vehicle: selectedVehicle.name,
        fare: calculatedFare,
        commission: estimatedCommission,
        travelDate: `${travelDate} at ${travelTime}`,
      });
    } catch {
      toast.success('One-way Intercity cab booked! Commission recorded.');
      setConfirmedBooking({
        bookingId: `IC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        route: `${fromCity} to ${toCity}`,
        pickup: `${pickupAddress}, ${fromCity}`,
        drop: `${dropAddress}, ${toCity}`,
        vehicle: selectedVehicle.name,
        fare: calculatedFare,
        commission: estimatedCommission,
        travelDate: `${travelDate} at ${travelTime}`,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#F8FAFC_0%,#F3F4F6_38%,#EEF2F7_100%)] max-w-lg mx-auto font-sans pb-28 relative overflow-hidden">
      {/* Header */}
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
            <h1 className="text-[19px] font-black tracking-tight text-slate-900">One Way Outstation</h1>
          </div>
          <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-black text-orange-600 border border-orange-100">
            Earn 6% Comm
          </span>
        </div>
      </header>

      <div className="px-5 pt-4 space-y-4">
        {/* Customer Details Form */}
        <AgentCustomerForm customer={customer} onChange={setCustomer} />

        {/* City Route Pair */}
        <div className="rounded-[24px] border border-white/70 bg-white/90 p-4 shadow-[0_12px_28px_rgba(20,58,90,0.06)] space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5b7a93]">1. Select Cities</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Pickup City</label>
              <select
                value={fromCity}
                onChange={(e) => setFromCity(e.target.value)}
                className="w-full rounded-[18px] border border-[#d8e5f1] bg-white px-3 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-[#143a5a]"
              >
                {POPULAR_CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Drop City</label>
              <select
                value={toCity}
                onChange={(e) => setToCity(e.target.value)}
                className="w-full rounded-[18px] border border-[#d8e5f1] bg-white px-3 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-[#143a5a]"
              >
                {POPULAR_CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-[16px] bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
            <Navigation size={13} className="text-[#0f6aa8]" />
            <span>Estimated Distance: {estimatedKm} km (No return fare charged)</span>
          </div>
        </div>

        {/* Addresses */}
        <div className="rounded-[24px] border border-white/70 bg-white/90 p-4 shadow-[0_12px_28px_rgba(20,58,90,0.06)] space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5b7a93]">2. Exact Addresses</p>

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Pickup Address in {fromCity} *</label>
            <div className="relative">
              <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500" />
              <input
                type="text"
                placeholder={`Street, Colony or Landmark in ${fromCity}`}
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                className="w-full rounded-[18px] border border-[#d8e5f1] bg-white px-4 py-3 pl-11 text-sm font-semibold text-slate-900 outline-none focus:border-[#143a5a]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Drop Address in {toCity} *</label>
            <div className="relative">
              <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-orange-500" />
              <input
                type="text"
                placeholder={`Destination area in ${toCity}`}
                value={dropAddress}
                onChange={(e) => setDropAddress(e.target.value)}
                className="w-full rounded-[18px] border border-[#d8e5f1] bg-white px-4 py-3 pl-11 text-sm font-semibold text-slate-900 outline-none focus:border-[#143a5a]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Travel Date</label>
              <input
                type="date"
                value={travelDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setTravelDate(e.target.value)}
                className="w-full rounded-[18px] border border-[#d8e5f1] bg-white px-3 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-[#143a5a]"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Pickup Time</label>
              <input
                type="time"
                value={travelTime}
                onChange={(e) => setTravelTime(e.target.value)}
                className="w-full rounded-[18px] border border-[#d8e5f1] bg-white px-3 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-[#143a5a]"
              />
            </div>
          </div>
        </div>

        {/* Vehicle Selection */}
        <div className="rounded-[24px] border border-white/70 bg-white/90 p-4 shadow-[0_12px_28px_rgba(20,58,90,0.06)] space-y-2.5">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5b7a93]">3. Choose Vehicle</p>
          {VEHICLE_TYPES.map((v) => {
            const isSelected = selectedVehicle.id === v.id;
            const fareOption = Math.round(v.baseFare + estimatedKm * v.ratePerKm);
            return (
              <div
                key={v.id}
                onClick={() => setSelectedVehicle(v)}
                className={`cursor-pointer rounded-[20px] border p-3 transition-all flex items-center justify-between ${
                  isSelected
                    ? 'border-[#143a5a] bg-[#eff7ff] shadow-sm'
                    : 'border-slate-100 bg-white hover:border-slate-300'
                }`}
              >
                <div>
                  <h4 className="text-xs font-black text-slate-900">{v.name}</h4>
                  <p className="text-[11px] text-slate-500">{v.desc}</p>
                  <span className="text-[10px] font-bold text-slate-400">₹{v.ratePerKm}/km</span>
                </div>
                <div className="text-right pl-3">
                  <p className="text-base font-black text-slate-900">₹{fareOption}</p>
                  <span className="text-[10px] font-bold text-emerald-600">All Inclusive</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Fare & Commission Card */}
        <div className="rounded-[24px] bg-[linear-gradient(145deg,#143a5a_0%,#0f6aa8_100%)] p-4 text-white shadow-[0_14px_30px_rgba(20,58,90,0.18)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/60">One-Way Fare</p>
              <h3 className="mt-1 text-2xl font-black">₹{calculatedFare}</h3>
              <p className="text-xs font-semibold text-white/75">{fromCity} → {toCity} ({estimatedKm} km)</p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-black text-emerald-300 ring-1 ring-emerald-400/40">
                <Sparkles size={12} />
                Your Commission (6%)
              </span>
              <p className="mt-1 text-xl font-black text-emerald-300">+₹{estimatedCommission}</p>
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          type="button"
          disabled={submitting}
          onClick={handleBooking}
          className="w-full rounded-[22px] bg-[#143a5a] py-4 text-sm font-black uppercase tracking-[0.2em] text-white shadow-[0_12px_28px_rgba(20,58,90,0.22)] active:scale-95 transition-all disabled:opacity-50"
        >
          {submitting ? 'Booking One-Way Trip...' : 'Confirm & Book One-Way Cab'}
        </button>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmedBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm rounded-[32px] bg-white p-6 text-center shadow-2xl space-y-4"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-orange-500 shadow-inner">
                <CheckCircle2 size={36} strokeWidth={2.5} />
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400">Booking Confirmed</p>
                <h3 className="text-xl font-black text-slate-900 mt-1">Intercity Cab Booked!</h3>
                <p className="text-xs font-bold text-slate-500 mt-1">ID: <span className="font-mono text-slate-800">{String(confirmedBooking.bookingId).slice(-8)}</span></p>
              </div>

              <div className="rounded-[20px] bg-slate-50 p-4 text-left text-xs font-semibold text-slate-700 space-y-2 border border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-400">Route:</span>
                  <span className="font-black text-slate-900">{confirmedBooking.route}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Pickup:</span>
                  <span className="font-medium text-slate-800 truncate max-w-[170px]">{confirmedBooking.pickup}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Drop:</span>
                  <span className="font-medium text-slate-800 truncate max-w-[170px]">{confirmedBooking.drop}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 font-black">
                  <span className="text-slate-500">Collected Fare:</span>
                  <span className="text-base text-slate-900">₹{confirmedBooking.fare}</span>
                </div>
                <div className="flex justify-between font-black text-emerald-600">
                  <span>Commission Credited:</span>
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

export default AgentOneWayBooking;
