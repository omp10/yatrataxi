import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { entertainmentAdminService as api } from '../../services/entertainmentAdminService';
import { PageHeader } from './entertainmentUi';
import { cardClass, inputClass, labelClass, primaryButton, secondaryButton, unwrap } from './entertainmentFormat';

const newRule = () => ({ id: `rule-${Math.random().toString(36).slice(2, 9)}`, label: '', hoursBeforeVisit: 24, refundType: 'percentage', refundValue: 100 });

const describeRule = (rule) => {
  if (rule.refundType === 'none') return `Cancel ${rule.hoursBeforeVisit}h+ before the visit: no refund`;
  if (rule.refundType === 'fixed') return `Cancel ${rule.hoursBeforeVisit}h+ before the visit: refund ₹${rule.refundValue}`;
  return `Cancel ${rule.hoursBeforeVisit}h+ before the visit: refund ${rule.refundValue}%`;
};

const CategoryManager = () => {
  const [categories, setCategories] = useState(null);
  const [draft, setDraft] = useState({ name: '', description: '', order: 0 });
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api.getCategories().then((r) => setCategories(unwrap(r, []))).catch((e) => toast.error(e?.message || 'Could not load categories')), []);
  useEffect(() => { load(); }, [load]);

  const run = async (action, success) => {
    setBusy(true);
    try {
      await action();
      if (success) toast.success(success);
      await load();
    } catch (error) {
      toast.error(error?.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const create = (event) => {
    event.preventDefault();
    run(async () => {
      await api.createCategory({ ...draft, order: Number(draft.order) || 0, active: true });
      setDraft({ name: '', description: '', order: 0 });
    }, 'Category added');
  };

  return (
    <div className={cardClass}>
      <p className="text-sm font-black text-slate-900">Venue categories</p>
      <p className="mb-4 text-xs font-semibold text-slate-500">Customers filter venues by these. Partners choose one per venue.</p>
      <form onSubmit={create} className="mb-4 grid gap-2 sm:grid-cols-[1fr_1fr_90px_auto]">
        <input required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Name (e.g. Waterpark)" className={inputClass} />
        <input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Description" className={inputClass} />
        <input type="number" value={draft.order} onChange={(e) => setDraft({ ...draft, order: e.target.value })} placeholder="Order" className={inputClass} aria-label="Display order" />
        <button type="submit" disabled={busy} className={`${primaryButton} flex items-center justify-center gap-1`}><Plus size={14} />Add</button>
      </form>
      {categories === null ? (
        <div className="flex justify-center py-6 text-slate-400"><Loader2 className="animate-spin" /></div>
      ) : categories.length === 0 ? (
        <p className="py-4 text-center text-sm font-semibold text-slate-400">No categories yet. Add one before partners create venues.</p>
      ) : categories.map((c) => (
        <div key={c.id} className="flex items-center justify-between gap-3 border-t border-slate-100 py-2.5">
          <div className="min-w-0">
            <p className={`font-black ${c.active ? 'text-slate-900' : 'text-slate-400 line-through'}`}>{c.name}</p>
            <p className="text-xs font-semibold text-slate-500">{c.venueCount} venue(s){c.description ? ` · ${c.description}` : ''}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button type="button" disabled={busy} onClick={() => run(() => api.updateCategory(c.id, { ...c, active: !c.active }), c.active ? 'Category hidden' : 'Category shown')} className="text-xs font-black text-slate-600">{c.active ? 'Hide' : 'Show'}</button>
            <button
              type="button"
              disabled={busy || c.venueCount > 0}
              title={c.venueCount > 0 ? 'Move or remove its venues first' : 'Delete'}
              onClick={() => window.confirm(`Delete category "${c.name}"?`) && run(() => api.deleteCategory(c.id), 'Category deleted')}
              className="text-rose-500 disabled:opacity-30"
              aria-label={`Delete ${c.name}`}
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

const BookingRules = () => {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getSettings().then((r) => setSettings(unwrap(r, { holdMinutes: 15, refundRules: [] }))).catch((e) => toast.error(e?.message || 'Could not load settings'));
  }, []);

  const updateRule = (index, patch) => setSettings((prev) => ({
    ...prev,
    refundRules: prev.refundRules.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)),
  }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        holdMinutes: Number(settings.holdMinutes),
        refundRules: settings.refundRules.map((rule) => ({ ...rule, hoursBeforeVisit: Number(rule.hoursBeforeVisit), refundValue: Number(rule.refundValue) })),
      };
      setSettings(unwrap(await api.saveSettings(payload), settings));
      toast.success('Booking rules saved');
    } catch (error) {
      toast.error(error?.message || 'Could not save the rules');
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return <div className={`${cardClass} flex justify-center py-10 text-slate-400`}><Loader2 className="animate-spin" /></div>;

  const sorted = [...settings.refundRules].sort((a, b) => Number(b.hoursBeforeVisit) - Number(a.hoursBeforeVisit));

  return (
    <div className={cardClass}>
      <p className="text-sm font-black text-slate-900">Booking & cancellation rules</p>
      <p className="mb-4 text-xs font-semibold text-slate-500">Apply to every venue. Admin cancellations from the bookings page always refund in full.</p>

      <div className="mb-5 max-w-xs">
        <label className={labelClass}>Seat hold while paying (minutes)</label>
        <input type="number" min="5" max="60" value={settings.holdMinutes} onChange={(e) => setSettings({ ...settings, holdMinutes: e.target.value })} className={inputClass} />
        <p className="mt-1 text-[11px] font-semibold text-slate-500">Unpaid bookings release their seats after this time (5 to 60).</p>
      </div>

      <div className="mb-2 flex items-center justify-between">
        <label className={labelClass}>Refund rules</label>
        <button type="button" onClick={() => setSettings({ ...settings, refundRules: [...settings.refundRules, newRule()] })} className="flex items-center gap-1 text-xs font-black text-indigo-600"><Plus size={14} />Add rule</button>
      </div>
      {settings.refundRules.length === 0 && (
        <p className="mb-3 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">No rules: customers cannot cancel tickets themselves.</p>
      )}
      <div className="space-y-2">
        {settings.refundRules.map((rule, index) => (
          <div key={rule.id} className="grid items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1.2fr_0.8fr_1fr_0.8fr_auto]">
            <div><label className={labelClass}>Label</label><input value={rule.label} onChange={(e) => updateRule(index, { label: e.target.value })} placeholder="e.g. Free cancellation" className={inputClass} /></div>
            <div><label className={labelClass}>Hours before visit</label><input type="number" min="0" value={rule.hoursBeforeVisit} onChange={(e) => updateRule(index, { hoursBeforeVisit: e.target.value })} className={inputClass} /></div>
            <div>
              <label className={labelClass}>Refund</label>
              <select value={rule.refundType} onChange={(e) => updateRule(index, { refundType: e.target.value })} className={inputClass}>
                <option value="percentage">Percentage of amount</option>
                <option value="fixed">Fixed amount (₹)</option>
                <option value="none">No refund</option>
              </select>
            </div>
            <div><label className={labelClass}>Value</label><input type="number" min="0" disabled={rule.refundType === 'none'} value={rule.refundValue} onChange={(e) => updateRule(index, { refundValue: e.target.value })} className={inputClass} /></div>
            <button type="button" onClick={() => setSettings({ ...settings, refundRules: settings.refundRules.filter((_, i) => i !== index) })} className="mb-2 text-rose-500" aria-label="Remove rule"><Trash2 size={16} /></button>
          </div>
        ))}
      </div>
      {sorted.length > 0 && (
        <ul className="mt-4 space-y-1 rounded-2xl bg-indigo-50 p-3 text-xs font-semibold text-indigo-900">
          {sorted.map((rule) => <li key={rule.id}>{describeRule(rule)}</li>)}
          <li>Later than {sorted[sorted.length - 1].hoursBeforeVisit}h before the visit: cancellation not allowed</li>
        </ul>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={() => window.location.reload()} className={secondaryButton}>Discard</button>
        <button type="button" onClick={save} disabled={saving} className={primaryButton}>{saving ? 'Saving...' : 'Save rules'}</button>
      </div>
    </div>
  );
};

const EntertainmentSettings = () => (
  <div className="p-6">
    <PageHeader title="Entertainment Settings" subtitle="Categories, seat holds and refund rules for ticket bookings." />
    <div className="grid gap-6 xl:grid-cols-2">
      <CategoryManager />
      <BookingRules />
    </div>
  </div>
);

export default EntertainmentSettings;
