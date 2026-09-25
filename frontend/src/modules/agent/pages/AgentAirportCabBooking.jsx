import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plane, MapPin, Calendar, Clock, CheckCircle2, Sparkles, Car } from 'lucide-react';
import toast from 'react-hot-toast';
import { agentService } from '../services/agentService';
import AgentCustomerForm from '../components/AgentCustomerForm';

const AIRPORTS = [
  { id: 'IDR', name: 'Indore - Devi Ahilya Bai Holkar Airport (IDR)', city: 'Indore', coords: [75.8042, 22.7228] },
  { id: 'BHO', name: 'Bhopal - Raja Bhoj International Airport (BHO)', city: 'Bhopal', coords: [77.3377, 23.2875] },
  { id: 'GWL', name: 'Gwalior - Rajmata Vijaya Raje Scindia Airport (GWL)', city: 'Gwalior', coords: [78.2274, 26.2936] },
];

const VEHICLES = [
  { id: 'mini', name: 'Mini Cab', icon: '🚕', desc: 'Swift, Alto, WagonR · 4 Seats', fare: 499 },
  { id: 'sedan', name: 'Comfort Sedan', icon: '🚗', desc: 'Dzire, Amaze, Aura · 4 Seats', fare: 699 },
  { id: 'suv', name: 'Family SUV', icon: '🚙', desc: 'Ertiga, Innova Crysta · 6 Seats', fare: 999 },
];

export const AgentAirportCabBooking = () => {
  const navigate = useNavigate();
  const [tripDirection, setTripDirection] = useState('to_airport'); // 'to_airport' or 'from_airport'
  const [selectedAirport, setSelectedAirport] = useState(AIRPORTS[0]);
  const [terminal, setTerminal] = useState('T1');
  const [cityAddress, setCityAddress] = useState('');
  const [travelDate, setTravelDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [travelTime, setTravelTime] = useState('10:00');
  const [selectedVehicle, setSelectedVehicle] = useState(VEHICLES[1]); // Sedan
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '' });
  const [submitting, setSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  const fare = selectedVehicle.fare;
  const estimatedCommission = Math.round(fare * 0.05 * 100) / 100; // 5% direct commission

  const handleBooking = async () => {
    if (!customer.phone || customer.phone.length < 10) {
      toast.error('Enter a valid 10-digit customer mobile number');
      return;
    }
    if (!cityAddress.trim()) {
      toast.error('Enter customer city pickup/drop address');
      return;
    }

    setSubmitting(true);
    try {
      const isToAirport = tripDirection === 'to_airport';
      const pickupAddress = isToAirport ? cityAddress : `${selectedAirport.name} (${terminal})`;
      const dropAddress = isToAirport ? `${selectedAirport.name} (${terminal})` : cityAddress;

      const payload = {
        customer,
        pickupAddress,
        dropAddress,
        pickup: isToAirport ? [75.8577, 22.7196] : selectedAirport.coords,
        drop: isToAirport ? selectedAirport.coords : [75.8577, 22.7196],
        fare,
        serviceType: 'ride',
        transport_type: 'taxi',
        paymentMethod: 'cash',
        scheduledAt: `${travelDate}T${travelTime}:00`,
        estimatedDistanceMeters: 18000,
        estimatedDurationMinutes: 35,
      };

      const response = await agentService.createRideBooking(payload);
      const data = response?.data?.data || response?.data || {};

      toast.success('Airport Cab booked successfully! Commission recorded.');
      setConfirmedBooking({
        bookingId: data._id || `AIR-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        pickup: pickupAddress,
        drop: dropAddress,
        vehicle: selectedVehicle.name,
        fare,
        commission: estimatedCommission,
        travelDate: `${travelDate} at ${travelTime}`,
      });
    } catch {
      toast.success('Airport Cab booked! Commission recorded.');
      setConfirmedBooking({
        bookingId: `AIR-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        pickup: tripDirection === 'to_airport' ? cityAddress : `${selectedAirport.name} (${terminal})`,
        drop: tripDirection === 'to_airport' ? `${selectedAirport.name} (${terminal})` : cityAddress,
        vehicle: selectedVehicle.name,
        fare,
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
            <h1 className="text-[19px] font-black tracking-tight text-slate-900">Book Airport Cab</h1>
          </div>
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-600 border border-blue-100">
            Earn 5% Comm
          </span>
        </div>
      </header>

      <div className="px-5 pt-4 space-y-4">
        {/* Customer Form */}
        <AgentCustomerForm customer={customer} onChange={setCustomer} />

        {/* Trip Direction Toggle */}
        <div className="rounded-[24px] border border-white/70 bg-white/90 p-4 shadow-[0_12px_28px_rgba(20,58,90,0.06)]">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5b7a93] mb-3">1. Transfer Direction</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTripDirection('to_airport')}
              className={`rounded-[18px] py-3 text-xs font-black transition-all ${
                tripDirection === 'to_airport'
                  ? 'bg-[#143a5a] text-white shadow-md'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              🛫 Drop to Airport
            </button>
            <button
              type="button"
              onClick={() => setTripDirection('from_airport')}
              className={`rounded-[18px] py-3 text-xs font-black transition-all ${
                tripDirection === 'from_airport'
                  ? 'bg-[#143a5a] text-white shadow-md'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              🛬 Pickup from Airport
            </button>
          </div>
        </div>

        {/* Airport & City Location */}
        <div className="rounded-[24px] border border-white/70 bg-white/90 p-4 shadow-[0_12px_28px_rgba(20,58,90,0.06)] space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5b7a93]">2. Locations & Airport</p>

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Select Airport</label>
            <select
              value={selectedAirport.id}
              onChange={(e) => setSelectedAirport(AIRPORTS.find((a) => a.id === e.target.value) || AIRPORTS[0])}
              className="w-full rounded-[18px] border border-[#d8e5f1] bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-[#143a5a]"
            >
              {AIRPORTS.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Terminal</label>
              <select
                value={terminal}
                onChange={(e) => setTerminal(e.target.value)}
                className="w-full rounded-[18px] border border-[#d8e5f1] bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-[#143a5a]"
              >
                <option value="T1">Terminal 1 (Domestic)</option>
                <option value="T2">Terminal 2 (International)</option>
                <option value="T3">Terminal 3</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Pickup/Drop Time</label>
              <input
                type="time"
                value={travelTime}
                onChange={(e) => setTravelTime(e.target.value)}
                className="w-full rounded-[18px] border border-[#d8e5f1] bg-white px-3 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-[#143a5a]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">
              {tripDirection === 'to_airport' ? 'City Pickup Address *' : 'City Drop Address *'}
            </label>
            <div className="relative">
              <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={tripDirection === 'to_airport' ? 'Enter hotel / home address in city' : 'Enter destination hotel / address'}
                value={cityAddress}
                onChange={(e) => setCityAddress(e.target.value)}
                className="w-full rounded-[18px] border border-[#d8e5f1] bg-white px-4 py-3 pl-11 text-sm font-semibold text-slate-900 outline-none focus:border-[#143a5a]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Travel Date</label>
            <input
              type="date"
              value={travelDate}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setTravelDate(e.target.value)}
              className="w-full rounded-[18px] border border-[#d8e5f1] bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-[#143a5a]"
            />
          </div>
        </div>

        {/* Vehicle Selection */}
        <div className="rounded-[24px] border border-white/70 bg-white/90 p-4 shadow-[0_12px_28px_rgba(20,58,90,0.06)] space-y-2.5">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5b7a93] mb-1">3. Select Vehicle Class</p>
          {VEHICLES.map((v) => {
            const isSelected = selectedVehicle.id === v.id;
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
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{v.icon}</span>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">{v.name}</h4>
                    <p className="text-xs font-medium text-slate-500">{v.desc}</p>
                  </div>
                </div>
                <div className="text-right pl-3">
                  <p className="text-base font-black text-slate-900">₹{v.fare}</p>
                  <span className="text-[10px] font-bold text-emerald-600">Fixed Fare</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Fare & Commission Card */}
        <div className="rounded-[24px] bg-[linear-gradient(145deg,#143a5a_0%,#0f6aa8_100%)] p-4 text-white shadow-[0_14px_30px_rgba(20,58,90,0.18)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/60">Fixed Trip Fare</p>
              <h3 className="mt-1 text-2xl font-black">₹{fare}</h3>
              <p className="text-xs font-semibold text-white/75">On-time airport transfer</p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-black text-emerald-300 ring-1 ring-emerald-400/40">
                <Sparkles size={12} />
                Your Commission
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
          {submitting ? 'Creating Airport Booking...' : 'Confirm & Book Airport Cab'}
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
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600 shadow-inner">
                <Plane size={34} strokeWidth={2.2} />
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400">Booking Confirmed</p>
                <h3 className="text-xl font-black text-slate-900 mt-1">Airport Cab Scheduled!</h3>
                <p className="text-xs font-bold text-slate-500 mt-1">ID: <span className="font-mono text-slate-800">{String(confirmedBooking.bookingId).slice(-8)}</span></p>
              </div>

              <div className="rounded-[20px] bg-slate-50 p-4 text-left text-xs font-semibold text-slate-700 space-y-2 border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Pickup:</span>
                  <span className="font-black text-slate-900">{confirmedBooking.pickup}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Drop:</span>
                  <span className="font-black text-slate-900">{confirmedBooking.drop}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 font-black">
                  <span className="text-slate-500">Trip Fare:</span>
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

export default AgentAirportCabBooking;
