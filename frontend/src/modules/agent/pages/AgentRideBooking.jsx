import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { agentService } from '../services/agentService';
import api from '../../../shared/api/axiosInstance';

const cardClass = 'rounded-[30px] border border-white/70 bg-white/90 p-5 shadow-[0_18px_36px_rgba(20,58,90,0.08)] backdrop-blur-xl';
const inputClass = 'w-full rounded-[22px] border border-[#d8e5f1] bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-[#143a5a]';

const AgentRideBooking = () => {
  const navigate = useNavigate();
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [form, setForm] = useState({
    customer: { name: '', phone: '', email: '' },
    pickupAddress: '',
    dropAddress: '',
    pickup: [77.5946, 12.9716],
    drop: [77.609, 12.985],
    fare: '',
    estimatedDistanceMeters: '',
    estimatedDurationMinutes: '',
    vehicleTypeId: '',
    paymentMethod: 'cash',
    serviceType: 'ride',
    transport_type: 'taxi',
  });

  useEffect(() => {
    const load = async () => {
      const response = await api.get('/users/vehicle-types');
      const results = response?.data?.data?.results || response?.data?.results || response?.data || [];
      setVehicleTypes(Array.isArray(results) ? results : []);
    };

    load();
  }, []);

  const submit = async () => {
    await agentService.createRideBooking({
      ...form,
      fare: Number(form.fare || 0),
      estimatedDistanceMeters: Number(form.estimatedDistanceMeters || 0),
      estimatedDurationMinutes: Number(form.estimatedDurationMinutes || 0),
      pickup: form.pickup.map(Number),
      drop: form.drop.map(Number),
    });
    toast.success('Ride booking created');
    navigate('/taxi/agent/bookings');
  };

  return (
    <div className="space-y-4">
      <button type="button" onClick={() => navigate('/taxi/agent')} className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[#143a5a]">
        <ArrowLeft size={14} />
        Back
      </button>

      <section className={cardClass}>
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5b7a93]">Customer details</p>
        <div className="mt-4 grid gap-3">
          <input className={inputClass} value={form.customer.name} onChange={(event) => setForm((current) => ({ ...current, customer: { ...current.customer, name: event.target.value } }))} placeholder="Customer name" />
          <input className={inputClass} value={form.customer.phone} maxLength={10} onChange={(event) => setForm((current) => ({ ...current, customer: { ...current.customer, phone: event.target.value.replace(/\D/g, '') } }))} placeholder="Customer phone" />
          <input className={inputClass} value={form.customer.email} onChange={(event) => setForm((current) => ({ ...current, customer: { ...current.customer, email: event.target.value } }))} placeholder="Customer email" />
        </div>
      </section>

      <section className={cardClass}>
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5b7a93]">Trip setup</p>
        <div className="mt-4 grid gap-3">
          <select className={inputClass} value={form.serviceType} onChange={(event) => setForm((current) => ({ ...current, serviceType: event.target.value, transport_type: event.target.value === 'intercity' ? 'intercity' : 'taxi' }))}>
            <option value="ride">Ride</option>
            <option value="intercity">Outstation</option>
          </select>
          <select className={inputClass} value={form.vehicleTypeId} onChange={(event) => setForm((current) => ({ ...current, vehicleTypeId: event.target.value }))}>
            <option value="">Select vehicle type</option>
            {vehicleTypes.map((item) => (
              <option key={item._id || item.id} value={item._id || item.id}>{item.name || item.vehicle_type || 'Vehicle'}</option>
            ))}
          </select>
          <input className={inputClass} value={form.pickupAddress} onChange={(event) => setForm((current) => ({ ...current, pickupAddress: event.target.value }))} placeholder="Pickup address" />
          <input className={inputClass} value={form.dropAddress} onChange={(event) => setForm((current) => ({ ...current, dropAddress: event.target.value }))} placeholder="Drop address" />
          <input className={inputClass} value={form.pickup.join(', ')} onChange={(event) => setForm((current) => ({ ...current, pickup: event.target.value.split(',').map((item) => item.trim()) }))} placeholder="Pickup coordinates lng, lat" />
          <input className={inputClass} value={form.drop.join(', ')} onChange={(event) => setForm((current) => ({ ...current, drop: event.target.value.split(',').map((item) => item.trim()) }))} placeholder="Drop coordinates lng, lat" />
          <input className={inputClass} value={form.fare} onChange={(event) => setForm((current) => ({ ...current, fare: event.target.value }))} placeholder="Fare" />
          <input className={inputClass} value={form.estimatedDistanceMeters} onChange={(event) => setForm((current) => ({ ...current, estimatedDistanceMeters: event.target.value }))} placeholder="Estimated distance meters" />
          <input className={inputClass} value={form.estimatedDurationMinutes} onChange={(event) => setForm((current) => ({ ...current, estimatedDurationMinutes: event.target.value }))} placeholder="Estimated duration minutes" />
          <select className={inputClass} value={form.paymentMethod} onChange={(event) => setForm((current) => ({ ...current, paymentMethod: event.target.value }))}>
            <option value="cash">Cash</option>
            <option value="online">Online</option>
          </select>
        </div>
      </section>

      <button type="button" onClick={submit} className="w-full rounded-[24px] bg-[#143a5a] px-5 py-4 text-sm font-black uppercase tracking-[0.2em] text-white">
        Create Agent Ride Booking
      </button>
    </div>
  );
};

export default AgentRideBooking;
