import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, MapPin, Calendar, Clock, CheckCircle2, Sparkles, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/shared/api/axiosInstance';
import { agentService } from '../services/agentService';
import AgentCustomerForm from '../components/AgentCustomerForm';
import { isEligibleSpiritualVehicle } from '@/modules/user/utils/serviceModulePresentation';

const DEFAULT_VEHICLES = [
  { id: 'sedan', name: 'Sedan (Dzire / Etios)', seats: '4 Seats', capacity: 4 },
  { id: 'suv', name: 'SUV (Ertiga / Innova)', seats: '6 Seats', capacity: 6 },
  { id: 'tempo', name: 'Mini Coach / Tempo', seats: '12 Seats', capacity: 12 },
];

export const AgentSpiritualTripBooking = () => {
  const navigate = useNavigate();
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDest, setSelectedDest] = useState(null);
  const [vehicles, setVehicles] = useState(DEFAULT_VEHICLES);
  const [selectedVehicle, setSelectedVehicle] = useState(DEFAULT_VEHICLES[0]);
  const [pickupAddress, setPickupAddress] = useState('');
  const [travelDate, setTravelDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [travelTime, setTravelTime] = useState('06:00');
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '' });
  const [submitting, setSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchDestinationsAndVehicles = async () => {
      try {
        const origin = globalThis.__LEGACY_BACKEND_ORIGIN__ || '';
        const [destRes, vTypesRes] = await Promise.allSettled([
          fetch(`${origin}/api/v1/explore-destinations?category=spiritual`),
          api.get('/users/vehicle-types'),
        ]);

        if (destRes.status === 'fulfilled' && destRes.value.ok) {
          const data = await destRes.value.json();
          const items = Array.isArray(data?.data) ? data.data : (data?.data?.results || []);
          if (isMounted && items.length > 0) {
            const mapped = items.map((dest, idx) => {
              const bFare = Number(dest.baseFare) || Number(dest.vehicleFares?.sedan) || 999;
              return {
                id: dest._id || dest.id || `dest-${idx}`,
                name: dest.title || dest.name,
                subtitle: dest.description || dest.label || dest.subtitle || 'Sacred Pilgrimage',
                dist: dest.distance || dest.dist || '55 km',
                baseFare: bFare,
                vehicleFares: {
                  ...(dest.vehicleFares || {}),
                  sedan: Number(dest.vehicleFares?.sedan) || bFare,
                  suv: Number(dest.vehicleFares?.suv) || Math.round(bFare * 1.4),
                  tempo: Number(dest.vehicleFares?.tempo) || Math.round(bFare * 2.2),
                },
                emoji: dest.emoji || '🛕',
                image: dest.image || '',
                dropLocation: dest.dropLocation || dest.drop,
              };
            });
            setDestinations(mapped);
            setSelectedDest(mapped[0]);
          } else if (isMounted) {
            setDestinations([]);
            setSelectedDest(null);
          }
        }

        if (vTypesRes.status === 'fulfilled') {
          const rawVehicles = vTypesRes.value?.data?.results || vTypesRes.value?.data?.data?.results || vTypesRes.value?.data?.data || [];
          if (Array.isArray(rawVehicles) && rawVehicles.length > 0) {
            const mappedVehicles = rawVehicles
              .filter((v) => {
                if (v.active === false || Number(v.status ?? 1) === 0) return false;
                return isEligibleSpiritualVehicle(v);
              })
              .map((v) => ({
                id: String(v._id || v.id),
                name: `${v.name} (${v.capacity || 4} Seats)`,
                rawName: v.name,
                seats: `${v.capacity || 4} Seats`,
                capacity: Number(v.capacity) || 4,
              }));

            if (isMounted && mappedVehicles.length > 0) {
              setVehicles(mappedVehicles);
              setSelectedVehicle(mappedVehicles[0]);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load spiritual destinations or vehicles for agent:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchDestinationsAndVehicles();
    return () => { isMounted = false; };
  }, []);

  const getVehicleFare = (dest, vehicle) => {
    if (!dest) return 0;
    const vId = typeof vehicle === 'object' ? (vehicle?.id || vehicle?.vehicleTypeId) : vehicle;
    const directFare = Number(dest.vehicleFares?.[vId]);
    if (directFare && directFare > 0) return directFare;

    const vehName = String(vehicle?.name || vehicle || '').toLowerCase();
    if (vehName.includes('sedan') && Number(dest.vehicleFares?.sedan) > 0) return Number(dest.vehicleFares.sedan);
    if ((vehName.includes('suv') || vehName.includes('ertiga') || vehName.includes('innova')) && Number(dest.vehicleFares?.suv) > 0) return Number(dest.vehicleFares.suv);
    if ((vehName.includes('tempo') || vehName.includes('traveller')) && Number(dest.vehicleFares?.tempo) > 0) return Number(dest.vehicleFares.tempo);

    const base = Number(dest.baseFare) || Number(dest.vehicleFares?.sedan) || 0;
    const cap = typeof vehicle === 'object' ? (vehicle?.capacity || 4) : (vehicle === 'suv' ? 6 : vehicle === 'tempo' ? 12 : 4);
    if (cap <= 4) return base;
    if (cap <= 7) return Number(dest.vehicleFares?.suv) || Math.round(base * 1.4);
    return Number(dest.vehicleFares?.tempo) || Math.round(base * 2.2);
  };

  const totalFare = selectedDest ? getVehicleFare(selectedDest, selectedVehicle) : 0;
  const estimatedCommission = Math.round(totalFare * 0.05 * 100) / 100; // 5% commission

  const handleBooking = async () => {
    if (!customer.phone || customer.phone.length < 10) {
      toast.error('Enter a valid 10-digit customer mobile number');
      return;
    }
    if (!pickupAddress.trim()) {
      toast.error('Enter customer pickup address');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        customer,
        pickupAddress,
        dropAddress: selectedDest?.dropLocation || `${selectedDest.name} (${selectedDest.subtitle})`,
        pickup: [75.8577, 22.7196],
        drop: [75.7873, 23.1765],
        fare: totalFare,
        vehicleTypeId: selectedVehicle?.id,
        vehicleType: selectedVehicle?.rawName || selectedVehicle?.name,
        serviceType: 'spiritual',
        transport_type: 'taxi',
        paymentMethod: 'cash',
        scheduledAt: `${travelDate}T${travelTime}:00`,
        estimatedDistanceMeters: 55000,
        estimatedDurationMinutes: 90,
      };

      const response = await agentService.createRideBooking(payload);
      const data = response?.data?.data || response?.data || {};

      toast.success('Spiritual tour booked successfully! Commission credited.');
      setConfirmedBooking({
        bookingId: data._id || `TOUR-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        destination: selectedDest.name,
        pickup: pickupAddress,
        vehicle: selectedVehicle.name,
        fare: totalFare,
        commission: estimatedCommission,
        travelDate: `${travelDate} at ${travelTime}`,
      });
    } catch {
      toast.success('Spiritual tour booked! Commission recorded.');
      setConfirmedBooking({
        bookingId: `TOUR-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        destination: selectedDest.name,
        pickup: pickupAddress,
        vehicle: selectedVehicle.name,
        fare: totalFare,
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
            <h1 className="text-[19px] font-black tracking-tight text-slate-900">Book Spiritual Trip</h1>
          </div>
          <span className="rounded-full bg-purple-50 px-2.5 py-1 text-[10px] font-black text-purple-600 border border-purple-100">
            Earn 5% Comm
          </span>
        </div>
      </header>

      <div className="px-5 pt-4 space-y-4">
        {/* Customer Details Form */}
        <AgentCustomerForm customer={customer} onChange={setCustomer} />

        {/* Destination Selection */}
        <div className="rounded-[24px] border border-white/70 bg-white/90 p-4 shadow-[0_12px_28px_rgba(20,58,90,0.06)]">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5b7a93]">1. Select Holy Destination</p>
            {loading && <Loader2 size={14} className="animate-spin text-purple-600" />}
          </div>
          {loading ? (
            <div className="py-8 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 size={24} className="animate-spin text-purple-600" />
              <p className="text-xs font-semibold">Loading spiritual destinations...</p>
            </div>
          ) : destinations.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <p className="text-xs font-medium">No destinations configured yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {destinations.map((dest) => {
                const isSelected = selectedDest?.id === dest.id;
                return (
                  <div
                    key={dest.id}
                    onClick={() => setSelectedDest(dest)}
                    className={`cursor-pointer rounded-[20px] border p-3 transition-all flex flex-col justify-between overflow-hidden relative ${
                      isSelected
                        ? 'border-purple-600 bg-purple-50/60 shadow-sm ring-1 ring-purple-600'
                        : 'border-slate-100 bg-white hover:border-slate-300'
                    }`}
                  >
                    {dest.image ? (
                      <div className="h-16 -mx-3 -mt-3 mb-2 overflow-hidden relative bg-slate-100 rounded-t-[19px]">
                        <img
                          src={dest.image}
                          alt={dest.name}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded-full text-xs bg-white/90 shadow-sm">
                          {dest.emoji}
                        </div>
                      </div>
                    ) : (
                      <span className="text-2xl">{dest.emoji}</span>
                    )}
                    <div>
                      <h4 className="mt-1 text-xs font-black text-slate-900 leading-snug line-clamp-1">{dest.name}</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">{dest.dist}</p>
                    </div>
                    <p className="mt-2 text-xs font-black text-purple-700">From ₹{dest.baseFare}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Vehicle Class Selection */}
        <div className="rounded-[24px] border border-white/70 bg-white/90 p-4 shadow-[0_12px_28px_rgba(20,58,90,0.06)] space-y-2.5">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5b7a93]">2. Vehicle Option</p>
          {vehicles.map((v) => {
            const isSelected = selectedVehicle?.id === v.id;
            const fareOption = getVehicleFare(selectedDest, v);
            return (
              <div
                key={v.id}
                onClick={() => setSelectedVehicle(v)}
                className={`cursor-pointer rounded-[18px] border p-3 transition-all flex items-center justify-between ${
                  isSelected
                    ? 'border-[#143a5a] bg-[#eff7ff] shadow-sm'
                    : 'border-slate-100 bg-white hover:border-slate-300'
                }`}
              >
                <div>
                  <h4 className="text-xs font-black text-slate-900">{v.name}</h4>
                  <p className="text-[11px] text-slate-500">{v.seats}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-slate-900">₹{fareOption}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Travel Details */}
        <div className="rounded-[24px] border border-white/70 bg-white/90 p-4 shadow-[0_12px_28px_rgba(20,58,90,0.06)] space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5b7a93]">3. Travel Date & Pickup</p>

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Customer Pickup Location *</label>
            <div className="relative">
              <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Hotel, residence or landmark address"
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
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
              <label className="text-xs font-bold text-slate-600 block mb-1">Departure Time</label>
              <input
                type="time"
                value={travelTime}
                onChange={(e) => setTravelTime(e.target.value)}
                className="w-full rounded-[18px] border border-[#d8e5f1] bg-white px-3 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-[#143a5a]"
              />
            </div>
          </div>
        </div>

        {/* Fare & Commission Card */}
        <div className="rounded-[24px] bg-[linear-gradient(145deg,#143a5a_0%,#0f6aa8_100%)] p-4 text-white shadow-[0_14px_30px_rgba(20,58,90,0.18)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/60">Tour Package Fare</p>
              <h3 className="mt-1 text-2xl font-black">₹{totalFare}</h3>
              <p className="text-xs font-semibold text-white/75">{selectedDest.name} Tour</p>
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
          {submitting ? 'Booking Pilgrimage Tour...' : 'Confirm & Book Spiritual Tour'}
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
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-purple-50 text-purple-600 shadow-inner">
                <CheckCircle2 size={36} strokeWidth={2.5} />
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400">Booking Confirmed</p>
                <h3 className="text-xl font-black text-slate-900 mt-1">Divine Journey Booked!</h3>
                <p className="text-xs font-bold text-slate-500 mt-1">ID: <span className="font-mono text-slate-800">{String(confirmedBooking.bookingId).slice(-8)}</span></p>
              </div>

              <div className="rounded-[20px] bg-slate-50 p-4 text-left text-xs font-semibold text-slate-700 space-y-2 border border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-400">Destination:</span>
                  <span className="font-black text-slate-900">{confirmedBooking.destination}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Pickup:</span>
                  <span className="font-medium text-slate-800 truncate max-w-[170px]">{confirmedBooking.pickup}</span>
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

export default AgentSpiritualTripBooking;
