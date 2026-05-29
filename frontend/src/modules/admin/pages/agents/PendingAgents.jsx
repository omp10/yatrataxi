import React, { useEffect, useState } from 'react';
import { CheckCircle2, ChevronRight, Eye, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/adminService';

const cardClass = 'rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm';

const PendingAgents = () => {
  const navigate = useNavigate();
  const [agents, setAgents] = useState([]);

  const load = async () => {
    const response = await adminService.getAgents('', 'pending');
    setAgents(response?.data?.data?.results || response?.data?.results || []);
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (agent, kycStatus) => {
    await adminService.updateAgent(agent.id, {
      ...agent,
      kycStatus,
      status: kycStatus === 'verified' ? 'active' : 'inactive',
      active: kycStatus === 'verified',
    });
    toast.success(`Agent ${kycStatus === 'verified' ? 'approved' : 'rejected'}`);
    await load();
  };

  return (
    <div className="space-y-6">
      <section className={cardClass}>
        <div className="mb-4 flex items-center gap-1.5 text-xs text-slate-400">
          <span>Agent Management</span>
          <ChevronRight size={12} />
          <span className="text-slate-700">Pending Agents</span>
        </div>
        <h1 className="text-3xl font-black tracking-tight text-slate-950">Pending agents</h1>
        <p className="mt-2 text-sm font-semibold text-slate-500">Review agents awaiting approval and move them into the active program.</p>
      </section>

      <section className={cardClass}>
        <div className="space-y-4">
          {agents.map((agent) => (
            <div key={agent.id} className="flex flex-col gap-4 rounded-3xl border border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-lg font-black text-slate-950">{agent.name}</p>
                <p className="mt-1 text-sm font-semibold text-slate-500">{agent.phone} · {agent.email || 'No email'}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Referral {agent.referralCode || '--'}</p>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => navigate(`/admin/agents/${agent.id}`)} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-slate-700">
                  <Eye size={14} />
                  View
                </button>
                <button type="button" onClick={() => updateStatus(agent, 'verified')} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-white">
                  <CheckCircle2 size={14} />
                  Approve
                </button>
                <button type="button" onClick={() => updateStatus(agent, 'rejected')} className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-white">
                  <XCircle size={14} />
                  Reject
                </button>
              </div>
            </div>
          ))}
          {agents.length === 0 ? <p className="text-sm font-semibold text-slate-500">No pending agents right now.</p> : null}
        </div>
      </section>
    </div>
  );
};

export default PendingAgents;
