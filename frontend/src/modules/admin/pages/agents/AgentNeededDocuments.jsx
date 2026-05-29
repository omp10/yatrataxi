import React, { useEffect, useState } from 'react';
import { ChevronRight, PencilLine, Plus, Trash2 } from 'lucide-react';
import { adminService } from '../../services/adminService';

const cardClass = 'rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm';
const inputClass = 'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-slate-900';

const emptyForm = {
  id: '',
  name: '',
  image_type: 'front_back',
  has_expiry_date: false,
  has_identify_number: false,
  is_editable: false,
  is_required: true,
  active: true,
};

const AgentNeededDocuments = () => {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    const response = await adminService.getAgentNeededDocuments();
    setItems(response?.data?.data?.results || response?.data?.results || []);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    if (form.id) await adminService.updateAgentNeededDocument(form.id, form);
    else await adminService.createAgentNeededDocument(form);
    setForm(emptyForm);
    await load();
  };

  const remove = async (id) => {
    await adminService.deleteAgentNeededDocument(id);
    await load();
  };

  return (
    <div className="space-y-6">
      <section className={cardClass}>
        <div className="mb-4 flex items-center gap-1.5 text-xs text-slate-400">
          <span>Agent Management</span>
          <ChevronRight size={12} />
          <span className="text-slate-700">Agent Needed Documents</span>
        </div>
        <h1 className="text-3xl font-black tracking-tight text-slate-950">Agent needed documents</h1>
        <p className="mt-2 text-sm font-semibold text-slate-500">Control the onboarding and KYC document checklist required from each agent.</p>
      </section>

      <section className={cardClass}>
        <div className="grid gap-4 lg:grid-cols-2">
          <input className={inputClass} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Document name" />
          <select className={inputClass} value={form.image_type} onChange={(event) => setForm((current) => ({ ...current, image_type: event.target.value }))}>
            <option value="front_back">Front & Back</option>
            <option value="front">Front</option>
            <option value="back">Back</option>
            <option value="image">Single Image</option>
          </select>
        </div>
        <div className="mt-4 flex flex-wrap gap-5 text-sm font-semibold text-slate-700">
          {[
            ['has_expiry_date', 'Has expiry date'],
            ['has_identify_number', 'Has identity number'],
            ['is_editable', 'Editable'],
            ['is_required', 'Required'],
            ['active', 'Active'],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-2">
              <input type="checkbox" checked={Boolean(form[key])} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.checked }))} />
              {label}
            </label>
          ))}
        </div>
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={submit} className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-white">
            <Plus size={14} />
            {form.id ? 'Update Document' : 'Add Document'}
          </button>
          <button type="button" onClick={() => setForm(emptyForm)} className="rounded-2xl border border-slate-200 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-slate-600">
            Reset
          </button>
        </div>
      </section>

      <section className={cardClass}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                <th className="pb-3">Name</th>
                <th className="pb-3">Image Type</th>
                <th className="pb-3">Flags</th>
                <th className="pb-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="py-4 text-sm font-black text-slate-900">{item.name}</td>
                  <td className="py-4 text-sm font-semibold text-slate-600">{item.image_type}</td>
                  <td className="py-4 text-xs font-semibold text-slate-600">
                    {[
                      item.has_expiry_date ? 'Expiry' : null,
                      item.has_identify_number ? 'ID Number' : null,
                      item.is_editable ? 'Editable' : null,
                      item.is_required ? 'Required' : null,
                      item.active ? 'Active' : 'Inactive',
                    ].filter(Boolean).join(' · ')}
                  </td>
                  <td className="py-4 text-right">
                    <div className="flex justify-end gap-3">
                      <button type="button" onClick={() => setForm(item)} className="rounded-2xl border border-slate-200 p-3 text-amber-600"><PencilLine size={14} /></button>
                      <button type="button" onClick={() => remove(item.id)} className="rounded-2xl border border-slate-200 p-3 text-rose-600"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 ? <tr><td colSpan={4} className="py-8 text-center text-sm font-semibold text-slate-500">No agent documents configured yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default AgentNeededDocuments;
