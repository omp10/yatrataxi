import React, { useEffect, useState } from 'react';
import { ChevronRight, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminService } from '../../services/adminService';

const cardClass = 'rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm';
const inputClass = 'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-slate-900';
const selectClass = 'rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-slate-900';
const formatMoney = (value) => `Rs ${Number(value || 0).toFixed(2)}`;
const formatDate = (value) => (value ? new Date(value).toLocaleString() : '--');

const AgentBookings = () => {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ totalBookings: 0, totalRevenue: 0, totalCommission: 0 });
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async (nextSearch = search, nextType = type) => {
    setLoading(true);
    try {
      const response = await adminService.getAgentBookings({
        ...(nextSearch ? { search: nextSearch } : {}),
        ...(nextType ? { type: nextType } : {}),
      });
      const payload = response?.data?.data || response?.data || {};
      setItems(payload.results || []);
      setSummary(payload.summary || { totalBookings: 0, totalRevenue: 0, totalCommission: 0 });
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to load agent bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load('', '');
  }, []);

  return (
    <div className="space-y-6">
      <section className={cardClass}>
        <div className="mb-4 flex items-center gap-1.5 text-xs text-slate-400">
          <span>Agent Management</span>
          <ChevronRight size={12} />
          <span className="text-slate-700">Agent Bookings</span>
        </div>
        <h1 className="text-3xl font-black tracking-tight text-slate-950">Agent bookings &amp; commission</h1>
        <p className="mt-2 text-sm font-semibold text-slate-500">
          Every taxi, intercity and mini bus booking attributed to an agent, with the commission credited for each one.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Bookings', value: summary.totalBookings },
          { label: 'Booking Revenue', value: formatMoney(summary.totalRevenue) },
          { label: 'Agent Commission', value: formatMoney(summary.totalCommission) },
        ].map((tile) => (
          <div key={tile.label} className={cardClass}>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{tile.label}</p>
            <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{tile.value}</p>
          </div>
        ))}
      </section>

      <section className={cardClass}>
        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className={`${inputClass} pl-11`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search booking code, agent, customer or route"
            />
          </div>
          <select className={selectClass} value={type} onChange={(event) => setType(event.target.value)}>
            <option value="">All booking types</option>
            <option value="ride">Taxi / Intercity</option>
            <option value="pooling">Car Pooling</option>
            <option value="bus">Mini Bus</option>
          </select>
          <button
            type="button"
            onClick={() => load(search, type)}
            className="rounded-2xl bg-slate-900 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-white"
          >
            Filter
          </button>
        </div>
      </section>

      <section className={cardClass}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                <th className="pb-3">Booking</th>
                <th className="pb-3">Agent</th>
                <th className="pb-3">Customer</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3">Commission</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={`${item.type}-${item.id}`}>
                  <td className="py-4">
                    <p className="text-sm font-black text-slate-900">{item.reference}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{item.route || '--'}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {item.type} · {formatDate(item.createdAt)}
                    </p>
                  </td>
                  <td className="py-4">
                    <p className="text-sm font-black text-slate-900">{item.agentName || 'Agent'}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{item.agentPhone || '--'}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-400">{item.agentCode || ''}</p>
                  </td>
                  <td className="py-4">
                    <p className="text-sm font-semibold text-slate-700">{item.customerName || '--'}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{item.customerPhone || ''}</p>
                  </td>
                  <td className="py-4 text-sm font-black text-slate-900">{formatMoney(item.amount)}</td>
                  <td className="py-4">
                    <p className="text-sm font-black text-emerald-700">{formatMoney(item.commissionAmount)}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{item.commissionMode || '--'}</p>
                  </td>
                  <td className="py-4 text-xs font-black uppercase tracking-[0.16em] text-slate-600">{item.status || '--'}</td>
                </tr>
              ))}
              {!loading && items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm font-semibold text-slate-500">
                    No agent-attributed bookings found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default AgentBookings;
