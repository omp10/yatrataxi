import React, { useState, useEffect } from 'react';
import {
  ChevronRight,
  Share2,
  Save,
  Loader2,
  Info,
  Users,
  UserCheck,
  Building2,
  ArrowLeft,
  Percent,
  Coins,
  ShieldCheck,
  Search,
  CheckCircle2,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const unwrap = (response) => response?.data?.data || response?.data || response || {};

const AgentReferralSettings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [treesLoading, setTreesLoading] = useState(true);
  const [agentTrees, setAgentTrees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [settings, setSettings] = useState({
    enabled: true,
    agent_to_user_enabled: true,
    agent_to_agent_enabled: true,
    agent_referral_bonus: 100,
    welcome_bonus: 50,
    reward_trigger: 'on_approval',
    override_commission_enabled: false,
    override_commission_rate: 5,
    min_bookings_for_payout: 1,
  });

  const loadSettingsAndTrees = async () => {
    try {
      setLoading(true);
      const res = await adminService.getReferralSettings('agent');
      const payload = unwrap(res);
      if (payload) {
        setSettings({
          enabled: payload.enabled ?? true,
          agent_to_user_enabled: payload.agent_to_user_enabled ?? true,
          agent_to_agent_enabled: payload.agent_to_agent_enabled ?? true,
          agent_referral_bonus: Number(payload.agent_referral_bonus || 0),
          welcome_bonus: Number(payload.welcome_bonus || 0),
          reward_trigger: payload.reward_trigger || 'on_approval',
          override_commission_enabled: Boolean(payload.override_commission_enabled),
          override_commission_rate: Number(payload.override_commission_rate || 0),
          min_bookings_for_payout: Number(payload.min_bookings_for_payout || 1),
        });
      }
    } catch (err) {
      console.error('Fetch agent referral settings error:', err);
      toast.error('Failed to load agent referral settings');
    } finally {
      setLoading(false);
    }

    try {
      setTreesLoading(true);
      const treeRes = await adminService.getAgentReferralTrees();
      const treePayload = unwrap(treeRes);
      setAgentTrees(Array.isArray(treePayload?.agents) ? treePayload.agents : []);
    } catch (treeErr) {
      console.error('Fetch agent referral trees error:', treeErr);
    } finally {
      setTreesLoading(false);
    }
  };

  useEffect(() => {
    loadSettingsAndTrees();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...settings,
        agent_referral_bonus: Math.max(0, Number(settings.agent_referral_bonus || 0)),
        welcome_bonus: Math.max(0, Number(settings.welcome_bonus || 0)),
        override_commission_rate: Math.max(0, Number(settings.override_commission_rate || 0)),
        min_bookings_for_payout: Math.max(1, Number(settings.min_bookings_for_payout || 1)),
      };
      await adminService.updateReferralSettings('agent', payload);
      toast.success('Agent referral settings saved successfully');
    } catch (err) {
      console.error('Save error:', err);
      toast.error(err?.response?.data?.message || err?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleMasterToggle = async (newVal) => {
    const updated = { ...settings, enabled: newVal };
    setSettings(updated);
    try {
      await adminService.updateReferralSettings('agent', updated);
      toast.success(`Agent referral program ${newVal ? 'activated' : 'paused'}`);
    } catch (err) {
      toast.error('Failed to toggle referral status');
      setSettings(settings);
    }
  };

  const filteredAgents = agentTrees.filter((item) => {
    const q = searchTerm.toLowerCase();
    return (
      item.name?.toLowerCase().includes(q) ||
      item.phone?.toLowerCase().includes(q) ||
      item.referralCode?.toLowerCase().includes(q) ||
      item.referredByName?.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-sky-600" size={32} />
          <span className="text-sm text-gray-500 font-medium">Loading Agent Referral Settings...</span>
        </div>
      </div>
    );
  }

  const labelClass = 'block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider';
  const inputClass =
    'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-600/10 outline-none transition-all';

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-8 font-sans">
      {/* HEADER BLOCK */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
            <span>Referrals</span>
            <ChevronRight size={12} />
            <span className="text-gray-700 font-medium">Agent Referral Settings</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Building2 className="text-sky-600" size={26} />
            Agent Referral Management
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Configure agent-to-customer deep links and multi-tier agent recruitment incentives.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-sky-600 rounded-xl hover:bg-sky-700 transition-colors shadow-sm disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Settings
          </button>
        </div>
      </div>

      <div className="space-y-6 max-w-6xl">
        {/* MASTER PROGRAM STATUS */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-600">
              <Users size={24} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Enable Agent Referral System</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Master switch for both Agent-to-Customer and Agent-to-Agent referral functionality.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleMasterToggle(!settings.enabled)}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${
              settings.enabled ? 'bg-sky-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                settings.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* SECTION 1: CHANNELS TOGGLE */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Agent to User */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col justify-between">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <UserCheck size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Agent to Customer Referral</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Agents can share custom QR codes/links to onboard customers.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.agent_to_user_enabled}
                onChange={(e) => setSettings({ ...settings, agent_to_user_enabled: e.target.checked })}
                className="w-5 h-5 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
              />
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
              Linked customers automatically attribute bookings and commissions to the referring agent.
            </div>
          </div>

          {/* Agent to Agent */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col justify-between">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Agent to Agent Recruitment</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Agents can recruit sub-agents and build an affiliate network.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.agent_to_agent_enabled}
                onChange={(e) => setSettings({ ...settings, agent_to_agent_enabled: e.target.checked })}
                className="w-5 h-5 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
              />
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
              Enables recruiter bonuses, welcome credits, and optional override commissions.
            </div>
          </div>
        </div>

        {/* SECTION 2: BONUS RULES */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 pb-4 mb-6 border-b border-gray-100">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Coins size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Recruitment & Welcome Bonus Rules</h3>
              <p className="text-xs text-gray-500">Direct wallet incentives for expanding the agent network.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className={labelClass}>
                Referrer Agent Bonus (₹)
                <Info size={13} className="inline ml-1 text-gray-400" title="Credited to referring agent" />
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={settings.agent_referral_bonus}
                  onChange={(e) => setSettings({ ...settings, agent_referral_bonus: e.target.value })}
                  className={inputClass}
                  placeholder="100"
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">Paid to the recruiter agent.</p>
            </div>

            <div>
              <label className={labelClass}>
                New Agent Welcome Bonus (₹)
                <Info size={13} className="inline ml-1 text-gray-400" title="Credited to new agent" />
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={settings.welcome_bonus}
                  onChange={(e) => setSettings({ ...settings, welcome_bonus: e.target.value })}
                  className={inputClass}
                  placeholder="50"
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">Gifted to new agent upon verification.</p>
            </div>

            <div>
              <label className={labelClass}>Reward Payout Trigger</label>
              <div className="relative">
                <select
                  value={settings.reward_trigger}
                  onChange={(e) => setSettings({ ...settings, reward_trigger: e.target.value })}
                  className={inputClass}
                >
                  <option value="on_approval">On Admin KYC Verification (Instant)</option>
                  <option value="first_booking">On First Completed Booking</option>
                </select>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">Determines when bonuses are credited.</p>
            </div>
          </div>
        </div>

        {/* SECTION 3: OVERRIDE COMMISSION */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Percent size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Multi-Tier Override Commission</h3>
                <p className="text-xs text-gray-500">Allow parent agents to earn a percentage of sub-agents' commissions.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSettings({ ...settings, override_commission_enabled: !settings.override_commission_enabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                settings.override_commission_enabled ? 'bg-purple-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                  settings.override_commission_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {settings.override_commission_enabled ? (
            <div className="max-w-md space-y-2">
              <label className={labelClass}>Override Commission Rate (%)</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={settings.override_commission_rate}
                  onChange={(e) => setSettings({ ...settings, override_commission_rate: e.target.value })}
                  className={inputClass}
                  placeholder="5"
                />
              </div>
              <p className="text-[11px] text-gray-400">
                Example: If set to 5%, when a sub-agent earns ₹1,000 commission, the parent recruiter receives ₹50 override reward.
              </p>
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">
              Override commission is currently disabled. Parent agents only receive one-time recruitment bonuses.
            </p>
          )}
        </div>

        {/* SECTION 4: AGENT REFERRAL AUDIT / HIERARCHY TREE */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-gray-900">Agent Referral Network & Audit</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Audit all active agents, their recruiters, sub-agent count, and referral earnings.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search agent / recruiter..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs bg-gray-50 focus:bg-white focus:border-sky-600 outline-none"
              />
            </div>
          </div>

          {treesLoading ? (
            <div className="p-12 flex justify-center items-center">
              <Loader2 className="animate-spin text-sky-600" size={28} />
            </div>
          ) : filteredAgents.length === 0 ? (
            <div className="p-12 text-center text-xs font-semibold text-gray-400">
              No agents matching search criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50/75 border-b border-gray-100 text-gray-500 uppercase tracking-wider font-bold">
                    <th className="py-3 px-5">Agent</th>
                    <th className="py-3 px-4">Referral Code</th>
                    <th className="py-3 px-4">Recruited By</th>
                    <th className="py-3 px-4 text-center">Sub-Agents</th>
                    <th className="py-3 px-4 text-center">Customers</th>
                    <th className="py-3 px-4 text-right">Referral Earnings</th>
                    <th className="py-3 px-4 text-center">KYC Status</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredAgents.map((agent) => (
                    <tr key={agent.id} className="hover:bg-sky-50/30 transition-colors">
                      <td className="py-3.5 px-5">
                        <p className="font-bold text-gray-900">{agent.name || 'Unnamed Agent'}</p>
                        <p className="text-[11px] text-gray-500">{agent.phone} · {agent.email || 'No email'}</p>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-sky-700">
                        {agent.referralCode || '----'}
                      </td>
                      <td className="py-3.5 px-4">
                        {agent.referredByName ? (
                          <div>
                            <span className="font-semibold text-gray-800">{agent.referredByName}</span>
                            <span className="block text-[10px] text-gray-400">{agent.referredByPhone}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Direct / Organic</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-gray-800">
                        {agent.subAgentsCount || 0}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-gray-800">
                        {agent.totalCustomers || 0}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-emerald-600">
                        ₹{Number(agent.referralEarnings || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            agent.kycStatus === 'verified'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : agent.kycStatus === 'rejected'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {agent.kycStatus === 'verified' && <CheckCircle2 size={11} />}
                          {agent.kycStatus === 'pending' && <Clock size={11} />}
                          {agent.kycStatus || 'pending'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/agents`)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 hover:text-sky-800 hover:underline"
                        >
                          View <ExternalLink size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentReferralSettings;
