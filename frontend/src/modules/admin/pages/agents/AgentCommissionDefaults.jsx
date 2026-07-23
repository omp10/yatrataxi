import React, { useEffect, useState } from 'react';
import { ChevronRight, Percent, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminService } from '../../services/adminService';

const cardClass = 'rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm';
const inputClass = 'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-slate-900';

const RULES = [
  { key: 'directRide', label: 'Agent-booked taxi ride', hint: 'Agent books a local taxi ride for a walk-in customer.' },
  { key: 'referredRide', label: 'Referred taxi ride', hint: 'Customer books a taxi themselves after scanning the agent QR.' },
  { key: 'intercity', label: 'Intercity trip', hint: 'One-way or return outstation trips.' },
  { key: 'bus', label: 'Mini bus seat', hint: 'Per-seat bookings on fixed mini bus routes.' },
  { key: 'pooling', label: 'Car pooling seat', hint: 'Shared taxi seats on pooling routes.' },
];

const emptyRule = { enabled: true, type: 'percentage', value: 0 };

const AgentCommissionDefaults = () => {
  const [config, setConfig] = useState(RULES.reduce((acc, rule) => ({ ...acc, [rule.key]: emptyRule }), {}));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const response = await adminService.getAgentCommissionDefaults();
      const payload = response?.data?.data || response?.data || {};
      setConfig(RULES.reduce((acc, rule) => ({ ...acc, [rule.key]: payload[rule.key] || emptyRule }), {}));
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to load commission defaults');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateRule = (key, field, value) => {
    setConfig((current) => ({ ...current, [key]: { ...current[key], [field]: value } }));
  };

  const save = async () => {
    setSaving(true);
    try {
      await adminService.updateAgentCommissionDefaults({ commissionConfig: config });
      toast.success('Commission defaults saved');
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to save commission defaults');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className={cardClass}>
        <div className="mb-4 flex items-center gap-1.5 text-xs text-slate-400">
          <span>Agent Management</span>
          <ChevronRight size={12} />
          <span className="text-slate-700">Commission Defaults</span>
        </div>
        <h1 className="text-3xl font-black tracking-tight text-slate-950">Agent commission defaults</h1>
        <p className="mt-2 text-sm font-semibold text-slate-500">
          Applied to every newly created or self-onboarded agent. Existing agents keep the rates already set on them —
          change those from the individual agent record.
        </p>
      </section>

      <section className={cardClass}>
        <div className="space-y-4">
          {RULES.map((rule) => {
            const value = config[rule.key] || emptyRule;
            return (
              <div key={rule.key} className="grid gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-5 lg:grid-cols-[2fr_1fr_1fr_auto] lg:items-center">
                <div>
                  <p className="text-sm font-black text-slate-900">{rule.label}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{rule.hint}</p>
                </div>
                <select
                  className={inputClass}
                  value={value.type}
                  onChange={(event) => updateRule(rule.key, 'type', event.target.value)}
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Flat amount</option>
                </select>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max={value.type === 'percentage' ? 100 : undefined}
                    className={inputClass}
                    value={value.value}
                    onChange={(event) => updateRule(rule.key, 'value', Number(event.target.value))}
                  />
                  {value.type === 'percentage' ? (
                    <Percent size={14} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  ) : null}
                </div>
                <label className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-600">
                  <input
                    type="checkbox"
                    checked={value.enabled !== false}
                    onChange={(event) => updateRule(rule.key, 'enabled', event.target.checked)}
                  />
                  Enabled
                </label>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={save}
          disabled={saving || loading}
          className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-xs font-black uppercase tracking-[0.16em] text-white disabled:opacity-40"
        >
          <Save size={14} />
          {saving ? 'Saving' : 'Save defaults'}
        </button>
      </section>
    </div>
  );
};

export default AgentCommissionDefaults;
