import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Eye, Plus, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminService } from '../../services/adminService';

const emptyForm = {
  id: '',
  name: '',
  phone: '',
  email: '',
  password: '',
  active: true,
  status: 'active',
  kycStatus: 'pending',
  referralCode: '',
  notes: '',
  commissionConfig: {
    directRide: { enabled: true, type: 'percentage', value: 5 },
    referredRide: { enabled: true, type: 'percentage', value: 3 },
    intercity: { enabled: true, type: 'percentage', value: 6 },
    bus: { enabled: true, type: 'percentage', value: 4 },
  },
};

const cardClass = 'rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm';
const inputClass = 'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-slate-900';

const formatMoney = (value) => `Rs ${Number(value || 0).toFixed(2)}`;

const AgentManager = () => {
  const navigate = useNavigate();
  const [agents, setAgents] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [totals, setTotals] = useState({ total: 0, pending: 0, verified: 0, inactive: 0 });
  const [loading, setLoading] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  const loadAgents = async (query = '') => {
    setLoading(true);
    try {
      const response = await adminService.getAgents(query);
      setAgents(response?.data?.data?.results || response?.data?.results || []);
      setTotals(response?.data?.data?.totals || { total: 0, pending: 0, verified: 0, inactive: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();
  }, []);

  const submit = async () => {
    const payload = { ...form };
    if (!payload.password) {
      delete payload.password;
    }

    if (form.id) {
      await adminService.updateAgent(form.id, payload);
      toast.success('Agent updated');
    } else {
      await adminService.createAgent(payload);
      toast.success('Agent created');
    }

    setForm(emptyForm);
    setIsComposerOpen(false);
    await loadAgents(search);
  };

  const startCreate = () => {
    setForm(emptyForm);
    setIsComposerOpen(true);
  };

  const startEdit = (agent) => {
    setForm({
      id: agent.id,
      name: agent.name || '',
      phone: agent.phone || '',
      email: agent.email || '',
      password: '',
      active: agent.active !== false,
      status: agent.status || 'active',
      kycStatus: agent.kycStatus || 'pending',
      referralCode: agent.referralCode || '',
      notes: agent.notes || '',
      commissionConfig: agent.commissionConfig || emptyForm.commissionConfig,
    });
    setIsComposerOpen(true);
  };

  const updateCommission = (section, field, value) => {
    setForm((current) => ({
      ...current,
      commissionConfig: {
        ...current.commissionConfig,
        [section]: {
          ...current.commissionConfig[section],
          [field]: field === 'enabled' ? value : field === 'value' ? Number(value) : value,
        },
      },
    }));
  };

  const summaryCards = useMemo(
    () => [
      { label: 'Total Agents', value: totals.total },
      { label: 'Pending Review', value: totals.pending },
      { label: 'Verified', value: totals.verified },
      { label: 'Inactive', value: totals.inactive },
    ],
    [totals],
  );

  return (
    <div className="space-y-6">
      <section className={cardClass}>
        <div className="mb-6 flex items-center gap-1.5 text-xs text-slate-400">
          <span>Admin</span>
          <ChevronRight size={12} />
          <span className="text-slate-700">Agent Management</span>
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Agent Program</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Agents, commissions, customers, and wallets</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={startCreate} className="rounded-2xl bg-slate-900 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-white">
              <span className="inline-flex items-center gap-2"><Plus size={14} /> Add Agent</span>
            </button>
            <button type="button" onClick={() => navigate('/admin/agents/pending')} className="rounded-2xl border border-slate-200 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-slate-600">
              Pending Agents
            </button>
            <button type="button" onClick={() => navigate('/admin/agents/withdrawals')} className="rounded-2xl border border-slate-200 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-slate-600">
              Withdrawal Requests
            </button>
            <button type="button" onClick={() => navigate('/admin/agents/documents')} className="rounded-2xl bg-slate-900 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-white">
              Agent Documents
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((item) => (
          <div key={item.label} className={cardClass}>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
            <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{item.value}</p>
          </div>
        ))}
      </section>

      <section className={cardClass}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, phone, email, referral"
              className={`${inputClass} pl-11`}
            />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => loadAgents(search)} className="rounded-2xl border border-slate-200 px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-slate-700">
              Search
            </button>
          </div>
        </div>
      </section>

      {isComposerOpen ? (
      <section className={cardClass}>
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
              {form.id ? 'Edit Agent' : 'Create Agent'}
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
              {form.id ? 'Update agent profile and commission' : 'Add a new agent directly'}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsComposerOpen(false);
              setForm(emptyForm);
            }}
            className="rounded-2xl border border-slate-200 px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-slate-600"
          >
            Close
          </button>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <input className={inputClass} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Agent name" />
          <input className={inputClass} value={form.phone} maxLength={10} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value.replace(/\D/g, '') }))} placeholder="Phone" />
          <input className={inputClass} value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="Email" />
          <input className={inputClass} value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} placeholder={form.id ? 'New password (optional)' : 'Password'} />
          <input className={inputClass} value={form.referralCode} onChange={(event) => setForm((current) => ({ ...current, referralCode: event.target.value.toUpperCase() }))} placeholder="Referral code" />
          <select className={inputClass} value={form.kycStatus} onChange={(event) => setForm((current) => ({ ...current, kycStatus: event.target.value }))}>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>
          <textarea className={`${inputClass} min-h-24 resize-none lg:col-span-2`} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Notes" />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {Object.entries(form.commissionConfig).map(([key, value]) => (
            <div key={key} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{key}</p>
              <div className="mt-3 flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <input type="checkbox" checked={value.enabled} onChange={(event) => updateCommission(key, 'enabled', event.target.checked)} />
                  Enabled
                </label>
                <select className={inputClass} value={value.type} onChange={(event) => updateCommission(key, 'type', event.target.value)}>
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed</option>
                </select>
                <input className={inputClass} type="number" value={value.value} onChange={(event) => updateCommission(key, 'value', event.target.value)} placeholder="Value" />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex gap-3">
          <button type="button" onClick={submit} className="rounded-2xl bg-slate-900 px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-white">
            {form.id ? 'Update Agent' : 'Create Agent'}
          </button>
          <button type="button" onClick={startCreate} className="rounded-2xl border border-slate-200 px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-slate-600">
            Reset
          </button>
        </div>
      </section>
      ) : null}

      <section className={cardClass}>
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Available Agents</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Agent list</h2>
          </div>
          <p className="text-sm font-semibold text-slate-500">{agents.length} visible</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                <th className="pb-3">Agent</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Commission</th>
                <th className="pb-3">Wallet</th>
                <th className="pb-3">Metrics</th>
                <th className="pb-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {agents.map((agent) => (
                <tr key={agent.id} className="align-top">
                  <td className="py-4">
                    <p className="text-sm font-black text-slate-900">{agent.name}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{agent.phone} · {agent.email || 'No email'}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">Referral: {agent.referralCode || '--'}</p>
                  </td>
                  <td className="py-4 text-xs font-bold text-slate-600">
                    <p>KYC: {agent.kycStatus || 'pending'}</p>
                    <p className="mt-1">Portal: {agent.status || 'active'}</p>
                  </td>
                  <td className="py-4 text-xs font-semibold text-slate-600">
                    <p>Ride: {agent.commissionConfig?.directRide?.value || 0}{agent.commissionConfig?.directRide?.type === 'fixed' ? ' flat' : '%'}</p>
                    <p className="mt-1">Referral: {agent.commissionConfig?.referredRide?.value || 0}{agent.commissionConfig?.referredRide?.type === 'fixed' ? ' flat' : '%'}</p>
                    <p className="mt-1">Bus: {agent.commissionConfig?.bus?.value || 0}{agent.commissionConfig?.bus?.type === 'fixed' ? ' flat' : '%'}</p>
                  </td>
                  <td className="py-4">
                    <p className="text-sm font-black text-slate-900">{formatMoney(agent.wallet?.balance || 0)}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">Earned {formatMoney(agent.wallet?.lifetimeEarned || 0)}</p>
                  </td>
                  <td className="py-4 text-xs font-semibold text-slate-600">
                    <p>Customers: {agent.metrics?.totalCustomers || 0}</p>
                    <p>Ride bookings: {(agent.metrics?.directRideBookings || 0) + (agent.metrics?.referredRideBookings || 0)}</p>
                    <p>Bus bookings: {(agent.metrics?.directBusBookings || 0) + (agent.metrics?.referredBusBookings || 0)}</p>
                  </td>
                  <td className="py-4 text-right">
                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => startEdit(agent)}
                        className="rounded-2xl border border-slate-200 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-slate-700"
                      >
                        Edit Commission
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/agents/${agent.id}`)}
                        className="rounded-2xl bg-slate-900 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-white"
                      >
                        <span className="inline-flex items-center gap-2"><Eye size={14} /> View</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && agents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-sm font-semibold text-slate-500">No agents found.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default AgentManager;
