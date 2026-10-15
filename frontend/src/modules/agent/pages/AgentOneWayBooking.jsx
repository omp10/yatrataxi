import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, MapPin, CheckCircle2, Sparkles, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/shared/api/axiosInstance';
import { agentService } from '../services/agentService';
import AgentCustomerForm from '../components/AgentCustomerForm';
import { useAppGoogleMapsLoader } from '@/modules/admin/utils/googleMaps';
import { geocodeAddress } from '@/shared/utils/geocoding';
import { estimateAgentCommission, formatCommissionRule, useAgentCommissionRule } from '../hooks/useAgentCommission';

const TRIP_TYPES = [
  { id: 'One Way', label: 'One Way', priceKey: 'basePrice' },
  { id: 'Round Trip', label: 'Round Trip', priceKey: 'roundTripPrice' },
];

export const AgentOneWayBooking = () => {
  const navigate = useNavigate();
  const { isLoaded: isMapsLoaded } = useAppGoogleMapsLoader();
  const commissionRule = useAgentCommissionRule('intercity');
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [packageId, setPackageId] = useState('');
  const [vehicleTypeId, setVehicleTypeId] = useState('');
  const [tripType, setTripType] = useState('One Way');
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropAddress, setDropAddress] = useState('');
  const [travelDate, setTravelDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [travelTime, setTravelTime] = useState('08:00');
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '' });
  const [submitting, setSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  useEffect(() => {
    let active = true;
    api.get('/users/intercity-packages')
      .then((response) => {
        const items = Array.isArray(response?.results) ? response.results : (response?.data?.results || []);
        const available = items.filter((pkg) => pkg.availability === 'available' && (pkg.vehicles || []).length > 0);
        if (active) {
          setPackages(available);
          setPackageId(available[0]?.id || '');
        }
      })
      .catch((error) => toast.error(error?.message || 'Could not load outstation packages'))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const selectedPackage = packages.find((pkg) => pkg.id === packageId) || null;
  const priceKey = TRIP_TYPES.find((item) => item.id === tripType)?.priceKey || 'basePrice';
  // Package prices are set by the admin per vehicle; a 0 price means not offered.
  const vehicles = useMemo(
    () => (selectedPackage?.vehicles || [])
      .map((vehicle) => ({ ...vehicle, fare: Math.round(Number(vehicle[priceKey]) || 0) }))
      .filter((vehicle) => vehicle.vehicleTypeId && vehicle.fare > 0),
    [priceKey, selectedPackage],
  );
  const selectedVehicle = vehicles.find((vehicle) => vehicle.vehicleTypeId === vehicleTypeId) || vehicles[0] || null;
  const fare = selectedVehicle?.fare || 0;
  const estimatedCommission = estimateAgentCommission(fare, commissionRule);
  const commissionLabel = formatCommissionRule(commissionRule);
  const fromCity = selectedPackage?.serviceLocationName || '';
  const toCity = selectedPackage?.destination || '';

  const handleBooking = async () => {
    if (!customer.phone || customer.phone.length < 10) {
      toast.error('Enter a valid 10-digit customer mobile number');
      return;
    }
    if (!selectedPackage || !selectedVehicle) {
      toast.error('Select a route and vehicle');
      return;
    }
    if (!pickupAddress.trim() || !dropAddress.trim()) {
      toast.error('Enter the pickup and drop addresses');
      return;
    }
    const scheduledAt = new Date(`${travelDate}T${travelTime}:00`);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
      toast.error('Choose a travel date and time in the future');
      return;
    }

    setSubmitting(true);
    try {
      const fullPickup = fromCity ? `${pickupAddress.trim()}, ${fromCity}` : pickupAddress.trim();
      const fullDrop = toCity ? `${dropAddress.trim()}, ${toCity}` : dropAddress.trim();
      const [pickup, drop] = await Promise.all([geocodeAddress(fullPickup), geocodeAddress(fullDrop)]);

      const response = await agentService.createRideBooking({
        customer,
        pickupAddress: fullPickup,
        dropAddress: fullDrop,
        pickup,
        drop,
        // The server charges the package price for this vehicle and trip type.
        fare,
        vehicleTypeId: selectedVehicle.vehicleTypeId,
        vehicleIconType: selectedVehicle.iconType || 'car',
        serviceType: 'intercity',
        transport_type: 'intercity',
        paymentMethod: 'cash',
        scheduledAt: scheduledAt.toISOString(),
        intercity: {
          packageId: selectedPackage.id,
          fromCity,
          toCity,
          tripType,
          travelDate,
          vehicleName: selectedVehicle.vehicleName,
        },
      });
      const data = response?.data || {};
      const bookedFare = Number(data.fare ?? fare);

      toast.success('Outstation cab booked');
      setConfirmedBooking({
        bookingId: data._id || data.id || '',
        route: `${fromCity} to ${toCity}`,
        pickup: fullPickup,
        drop: fullDrop,
        fare: bookedFare,
        commission: estimateAgentCommission(bookedFare, commissionRule),
      });
    } catch (error) {
      toast.error(error?.message || 'Could not book this trip');
    } finally {
      setSubmitting(false);
    }
  };

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
            <h1 className="text-[19px] font-black tracking-tight text-slate-900">Outstation Cab</h1>
          </div>
          {commissionLabel && (
            <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-black text-orange-600 border border-orange-100">
              {commissionLabel}
            </span>
          )}
        </div>
      </header>

      <div className="px-5 pt-4 space-y-4">
        <AgentCustomerForm customer={customer} onChange={setCustomer} />

        {/* Route */}
        <div className="rounded-[24px] border border-white/70 bg-white/90 p-4 shadow-[0_12px_28px_rgba(20,58,90,0.06)] space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5b7a93]">1. Route & Trip Type</p>
          {loading ? (
            <div className="py-4 flex items-center justify-center text-slate-400 gap-2">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-xs font-semibold">Loading routes...</span>
            </div>
          ) : packages.length === 0 ? (
            <p className="text-xs font-semibold text-slate-400">No outstation packages are configured by admin yet.</p>
          ) : (
            <select
              value={packageId}
              onChange={(e) => { setPackageId(e.target.value); setVehicleTypeId(''); }}
              className="w-full rounded-[18px] border border-[#d8e5f1] bg-white px-3 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-[#143a5a]"
            >
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {[pkg.serviceLocationName, pkg.destination].filter(Boolean).join(' → ')}{pkg.packageTypeName ? ` (${pkg.packageTypeName})` : ''}
                </option>
              ))}
            </select>
          )}
          <div className="grid grid-cols-2 gap-2">
            {TRIP_TYPES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTripType(item.id)}
                className={`rounded-[18px] py-3 text-xs font-black transition-all ${
                  tripType === item.id ? 'bg-[#143a5a] text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Addresses */}
        <div className="rounded-[24px] border border-white/70 bg-white/90 p-4 shadow-[0_12px_28px_rgba(20,58,90,0.06)] space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5b7a93]">2. Exact Addresses</p>
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Pickup Address{fromCity ? ` in ${fromCity}` : ''} *</label>
            <div className="relative">
              <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500" />
              <input
                type="text"
                placeholder="Street, colony or landmark"
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                className="w-full rounded-[18px] border border-[#d8e5f1] bg-white px-4 py-3 pl-11 text-sm font-semibold text-slate-900 outline-none focus:border-[#143a5a]"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Drop Address{toCity ? ` in ${toCity}` : ''} *</label>
            <div className="relative">
              <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-orange-500" />
              <input
                type="text"
                placeholder="Destination area or landmark"
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

        {/* Vehicle */}
        <div className="rounded-[24px] border border-white/70 bg-white/90 p-4 shadow-[0_12px_28px_rgba(20,58,90,0.06)] space-y-2.5">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5b7a93]">3. Choose Vehicle</p>
          {!loading && vehicles.length === 0 && (
            <p className="text-xs font-semibold text-slate-400">{tripType} is not priced for any vehicle on this route.</p>
          )}
          {vehicles.map((v) => {
            const isSelected = selectedVehicle?.vehicleTypeId === v.vehicleTypeId;
            return (
              <div
                key={v.vehicleTypeId}
                onClick={() => setVehicleTypeId(v.vehicleTypeId)}
                className={`cursor-pointer rounded-[20px] border p-3 transition-all flex items-center justify-between ${
                  isSelected ? 'border-[#143a5a] bg-[#eff7ff] shadow-sm' : 'border-slate-100 bg-white hover:border-slate-300'
                }`}
              >
                <div>
                  <h4 className="text-xs font-black text-slate-900">{v.vehicleName}</h4>
                  {v.capacity > 0 && <p className="text-[11px] text-slate-500">{v.capacity} seats</p>}
                </div>
                <div className="text-right pl-3">
                  <p className="text-base font-black text-slate-900">₹{v.fare.toLocaleString('en-IN')}</p>
                  <span className="text-[10px] font-bold text-emerald-600">Package price</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Fare & Commission */}
        <div className="rounded-[24px] bg-[linear-gradient(145deg,#143a5a_0%,#0f6aa8_100%)] p-4 text-white shadow-[0_14px_30px_rgba(20,58,90,0.18)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/60">{tripType} Fare</p>
              <h3 className="mt-1 text-2xl font-black">₹{fare.toLocaleString('en-IN')}</h3>
              {fromCity && toCity && <p className="text-xs font-semibold text-white/75">{fromCity} → {toCity}</p>}
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
          disabled={submitting || !isMapsLoaded || !selectedVehicle}
          onClick={handleBooking}
          className="w-full rounded-[22px] bg-[#143a5a] py-4 text-sm font-black uppercase tracking-[0.2em] text-white shadow-[0_12px_28px_rgba(20,58,90,0.22)] active:scale-95 transition-all disabled:opacity-50"
        >
          {submitting ? 'Booking Trip...' : 'Confirm & Book Cab'}
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
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-orange-500 shadow-inner">
                <CheckCircle2 size={36} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400">Booking Confirmed</p>
                <h3 className="text-xl font-black text-slate-900 mt-1">Outstation Cab Booked</h3>
                {confirmedBooking.bookingId && (
                  <p className="text-xs font-bold text-slate-500 mt-1">ID: <span className="font-mono text-slate-800">{String(confirmedBooking.bookingId).slice(-8)}</span></p>
                )}
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
                  <span className="text-slate-500">Trip Fare:</span>
                  <span className="text-base text-slate-900">₹{confirmedBooking.fare}</span>
                </div>
                <div className="flex justify-between font-black text-emerald-600">
                  <span>Est. Commission:</span>
                  <span className="text-base">+₹{confirmedBooking.commission}</span>
                </div>
                <p className="text-[10px] font-semibold text-slate-400">Commission is credited to your wallet when the trip is completed.</p>
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
