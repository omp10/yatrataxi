import React, { useEffect, useState } from 'react';
import { ArrowRight, Bus, CarFront, IndianRupee, UsersRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { agentService } from '../services/agentService';

const formatMoney = (value) => `Rs ${Number(value || 0).toFixed(2)}`;

const cardClass = 'rounded-[30px] border border-white/70 bg-white/85 p-5 shadow-[0_20px_40px_rgba(20,58,90,0.08)] backdrop-blur-xl';

const AgentHome = () => {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const response = await agentService.getDashboard();
        setDashboard(response?.data?.data || response?.data || null);
        setError('');
      } catch (err) {
        setError(err?.message || 'Unable to load agent dashboard');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const quickStats = dashboard?.quickStats || {};
  const wallet = dashboard?.wallet || {};
  const commission = dashboard?.commission || {};
  const channels = commission.channels || {};
  // lifetimeEarned is the wallet's own running total; the per-channel sum is derived
  // from the bookings. They should agree -- prefer the wallet as the headline figure.
  const totalCommission = wallet.lifetimeEarned ?? commission.totalCommission ?? 0;

  return (
    <div className="space-y-4">
      <section className={`${cardClass} overflow-hidden bg-[linear-gradient(140deg,_rgba(20,58,90,0.98)_0%,_rgba(15,106,168,0.92)_100%)] text-white`}>
        <p className="text-[10px] font-black uppercase tracking-[0.26em] text-white/55">Today’s Control Room</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight">
          {loading ? 'Loading...' : `Welcome back, ${dashboard?.profile?.name || 'Agent'}`}
        </h2>
        <p className="mt-3 max-w-sm text-sm font-semibold leading-6 text-white/72">
          Create bookings for customers, grow your referral network, and keep an eye on the commission wallet in real time.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => navigate('/taxi/agent/book-ride')}
            className="rounded-[24px] bg-white px-4 py-4 text-left text-[#143a5a] shadow-lg"
          >
            <CarFront size={20} />
            <p className="mt-3 text-sm font-black uppercase tracking-[0.16em]">Book Ride</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">Taxi and outstation</p>
          </button>
          <button
            type="button"
            onClick={() => navigate('/taxi/agent/book-bus')}
            className="rounded-[24px] bg-white/12 px-4 py-4 text-left ring-1 ring-white/18"
          >
            <Bus size={20} />
            <p className="mt-3 text-sm font-black uppercase tracking-[0.16em]">Book Bus</p>
            <p className="mt-1 text-xs font-semibold text-white/70">Ticket booking desk</p>
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className={cardClass}>
          <IndianRupee size={18} className="text-[#0f6aa8]" />
          <p className="mt-3 text-[10px] font-black uppercase tracking-[0.22em] text-[#5b7a93]">Wallet Balance</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-[#143a5a]">{formatMoney(wallet.balance)}</p>
          <p className="mt-1 text-[11px] font-bold text-slate-400">Paid out {formatMoney(wallet.lifetimePaidOut)}</p>
        </div>
        <div className={cardClass}>
          <IndianRupee size={18} className="text-emerald-600" />
          <p className="mt-3 text-[10px] font-black uppercase tracking-[0.22em] text-[#5b7a93]">Commission Earned</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-emerald-600">{formatMoney(totalCommission)}</p>
          <p className="mt-1 text-[11px] font-bold text-slate-400">{commission.totalBookings || 0} booking(s)</p>
        </div>
        <div className={cardClass}>
          <UsersRound size={18} className="text-[#0f6aa8]" />
          <p className="mt-3 text-[10px] font-black uppercase tracking-[0.22em] text-[#5b7a93]">Referred Users</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-[#143a5a]">{quickStats.totalCustomers || 0}</p>
        </div>
      </section>

      <section className={cardClass}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5b7a93]">Commission Mix</p>
            <h3 className="mt-2 text-xl font-black tracking-tight text-[#143a5a]">Commission by channel</h3>
          </div>
        </div>
        <div className="mt-5 grid gap-3">
          {[
            { label: 'Rides booked by you', key: 'directRides' },
            { label: 'Rides from your referrals', key: 'referralRides' },
            { label: 'Bus seats booked by you', key: 'directBuses' },
            { label: 'Bus seats from your referrals', key: 'referralBuses' },
            { label: 'Pooling booked by you', key: 'directPooling' },
            { label: 'Pooling from your referrals', key: 'referralPooling' },
          ].map((item) => {
            const row = channels[item.key] || { commission: 0, bookings: 0 };
            return (
              <div key={item.key} className="flex items-center justify-between rounded-[22px] bg-[#eef7ff] px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[#143a5a]">{item.label}</p>
                  <p className="mt-0.5 text-[11px] font-semibold text-slate-500">{row.bookings} booking(s)</p>
                </div>
                <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-black text-emerald-600">
                  {formatMoney(row.commission)}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className={cardClass}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5b7a93]">Recent rides</p>
            <h3 className="mt-2 text-xl font-black tracking-tight text-[#143a5a]">Latest customer activity</h3>
          </div>
          <button
            type="button"
            onClick={() => navigate('/taxi/agent/bookings')}
            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[#0f6aa8]"
          >
            View All
            <ArrowRight size={14} />
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {(dashboard?.recentRides || []).slice(0, 3).map((ride) => (
            <div key={ride.id} className="rounded-[22px] border border-[#dfeaf5] bg-white px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-[#143a5a]">{ride.customerName || 'Customer'}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{ride.pickupAddress || 'Pickup'} to {ride.dropAddress || 'Drop'}</p>
                </div>
                <span className="rounded-full bg-[#eff7ff] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#0f6aa8]">
                  {ride.status}
                </span>
              </div>
            </div>
          ))}
          {!dashboard?.recentRides?.length && !loading ? (
            <p className="text-sm font-semibold text-slate-500">{error || 'No ride bookings yet. Start with a direct booking from the hero actions.'}</p>
          ) : null}
        </div>
      </section>
    </div>
  );
};

export default AgentHome;
