import React, { useState } from 'react';
import { Plus, Trash2, ImagePlus, Loader2, X } from 'lucide-react';
import { uploadService } from '../../../../shared/services/uploadService';

const newId = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

const emptyTicket = () => ({ id: newId('tt'), name: '', description: '', price: '', weekendPrice: '', active: true });
const emptySlot = () => ({ id: newId('slot'), label: '', startTime: '10:00', endTime: '18:00', capacity: 100, active: true });

const venueToForm = (venue) => ({
  name: venue?.name || '',
  categoryId: venue?.categoryId || '',
  description: venue?.description || '',
  coverImage: venue?.coverImage || '',
  images: venue?.images || [],
  address: venue?.address || '',
  city: venue?.city || '',
  latitude: venue?.latitude ?? '',
  longitude: venue?.longitude ?? '',
  rules: venue?.rules || '',
  amenitiesText: (venue?.amenities || []).join(', '),
  ticketTypes: venue?.ticketTypes?.length ? venue.ticketTypes.map((t) => ({ ...t, weekendPrice: t.weekendPrice || '' })) : [emptyTicket()],
  timeSlots: venue?.timeSlots?.length ? venue.timeSlots : [emptySlot()],
  closedDates: venue?.closedDates || [],
  bookingWindowDays: venue?.bookingWindowDays || 30,
});

const formToPayload = (form) => ({
  name: form.name,
  categoryId: form.categoryId,
  description: form.description,
  coverImage: form.coverImage,
  images: form.images,
  address: form.address,
  city: form.city,
  latitude: form.latitude === '' ? undefined : Number(form.latitude),
  longitude: form.longitude === '' ? undefined : Number(form.longitude),
  rules: form.rules,
  amenities: form.amenitiesText.split(',').map((item) => item.trim()).filter(Boolean),
  ticketTypes: form.ticketTypes.map((t) => ({ ...t, price: Number(t.price), weekendPrice: Number(t.weekendPrice) || 0 })),
  timeSlots: form.timeSlots.map((s) => ({ ...s, capacity: Number(s.capacity) })),
  closedDates: form.closedDates,
  bookingWindowDays: Number(form.bookingWindowDays) || 30,
});

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error('Unable to read the selected image'));
  reader.onloadend = () => resolve(reader.result);
  reader.readAsDataURL(file);
});

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-500';
const labelClass = 'mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400';

/**
 * Venue details, ticket types, time slots and closed dates. Shared by the
 * partner console and the admin panel; the server validates everything again.
 */
const VenueEditorForm = ({ initialVenue = null, categories = [], submitLabel = 'Save venue', onSubmit, onCancel }) => {
  const [form, setForm] = useState(() => venueToForm(initialVenue));
  const [closedInput, setClosedInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const updateRow = (key, index, patch) => setForm((prev) => ({
    ...prev,
    [key]: prev[key].map((row, i) => (i === index ? { ...row, ...patch } : row)),
  }));
  const removeRow = (key, index) => setForm((prev) => ({ ...prev, [key]: prev[key].filter((_, i) => i !== index) }));

  const handleImages = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    setUploading(true);
    setError('');
    try {
      const urls = [];
      for (const file of files) {
        const dataUrl = await readFileAsDataUrl(file);
        if (!String(dataUrl).startsWith('data:image/')) throw new Error('Please choose image files only');
        const result = await uploadService.uploadImage(dataUrl, 'entertainment');
        const url = result?.secureUrl || result?.url;
        if (url) urls.push(url);
      }
      setForm((prev) => {
        const images = [...prev.images, ...urls].slice(0, 12);
        return { ...prev, images, coverImage: prev.coverImage || images[0] || '' };
      });
    } catch (e) {
      setError(e?.message || 'Image upload failed');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (url) => setForm((prev) => {
    const images = prev.images.filter((item) => item !== url);
    return { ...prev, images, coverImage: prev.coverImage === url ? images[0] || '' : prev.coverImage };
  });

  const addClosedDate = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(closedInput)) return;
    setForm((prev) => ({ ...prev, closedDates: [...new Set([...prev.closedDates, closedInput])].sort() }));
    setClosedInput('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      await onSubmit(formToPayload(form));
    } catch (e) {
      setError(e?.message || 'Could not save the venue');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="space-y-3">
        <div>
          <label className={labelClass}>Venue name *</label>
          <input required value={form.name} onChange={(e) => set('name', e.target.value)} className={inputClass} placeholder="e.g. Aqua Splash Waterpark" />
        </div>
        <div>
          <label className={labelClass}>Category *</label>
          <select required value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)} className={inputClass}>
            <option value="">Choose a category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Description</label>
          <textarea rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Address</label>
            <input value={form.address} onChange={(e) => set('address', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>City</label>
            <input value={form.city} onChange={(e) => set('city', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Latitude</label>
            <input type="number" step="any" value={form.latitude} onChange={(e) => set('latitude', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Longitude</label>
            <input type="number" step="any" value={form.longitude} onChange={(e) => set('longitude', e.target.value)} className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Rules for visitors</label>
          <textarea rows={2} value={form.rules} onChange={(e) => set('rules', e.target.value)} className={inputClass} placeholder="e.g. Swimwear mandatory. Outside food not allowed." />
        </div>
        <div>
          <label className={labelClass}>Amenities (comma separated)</label>
          <input value={form.amenitiesText} onChange={(e) => set('amenitiesText', e.target.value)} className={inputClass} placeholder="Parking, Lockers, Food court" />
        </div>
      </section>

      <section>
        <label className={labelClass}>Photos (first is the cover)</label>
        <div className="flex flex-wrap gap-2">
          {form.images.map((url) => (
            <div key={url} className={`relative h-20 w-24 overflow-hidden rounded-xl border-2 ${form.coverImage === url ? 'border-indigo-500' : 'border-transparent'}`}>
              <button type="button" onClick={() => set('coverImage', url)} className="h-full w-full" title="Use as cover">
                <img src={url} alt="" className="h-full w-full object-cover" />
              </button>
              <button type="button" onClick={() => removeImage(url)} className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white" aria-label="Remove photo"><X size={12} /></button>
            </div>
          ))}
          <label className="flex h-20 w-24 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-slate-400">
            {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
            <span className="text-[10px] font-bold">Add</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleImages} disabled={uploading} />
          </label>
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <label className={labelClass}>Ticket types *</label>
          <button type="button" onClick={() => set('ticketTypes', [...form.ticketTypes, emptyTicket()])} className="flex items-center gap-1 text-xs font-black text-indigo-600"><Plus size={14} />Add</button>
        </div>
        <div className="space-y-2">
          {form.ticketTypes.map((ticket, index) => (
            <div key={ticket.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-2">
              <div className="flex gap-2">
                <input required value={ticket.name} onChange={(e) => updateRow('ticketTypes', index, { name: e.target.value })} placeholder="Name (e.g. Adult)" className={inputClass} />
                <button type="button" onClick={() => removeRow('ticketTypes', index)} disabled={form.ticketTypes.length === 1} className="rounded-xl border border-slate-200 px-2 text-rose-500 disabled:opacity-30" aria-label="Remove ticket type"><Trash2 size={14} /></button>
              </div>
              <input value={ticket.description} onChange={(e) => updateRow('ticketTypes', index, { description: e.target.value })} placeholder="Description (e.g. Height above 4 ft)" className={inputClass} />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelClass}>Price (₹) *</label>
                  <input required type="number" min="1" step="0.01" value={ticket.price} onChange={(e) => updateRow('ticketTypes', index, { price: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Weekend price (₹)</label>
                  <input type="number" min="0" step="0.01" value={ticket.weekendPrice} onChange={(e) => updateRow('ticketTypes', index, { weekendPrice: e.target.value })} placeholder="Same as price" className={inputClass} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <input type="checkbox" checked={ticket.active !== false} onChange={(e) => updateRow('ticketTypes', index, { active: e.target.checked })} /> On sale
              </label>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <label className={labelClass}>Time slots *</label>
          <button type="button" onClick={() => set('timeSlots', [...form.timeSlots, emptySlot()])} className="flex items-center gap-1 text-xs font-black text-indigo-600"><Plus size={14} />Add</button>
        </div>
        <div className="space-y-2">
          {form.timeSlots.map((slot, index) => (
            <div key={slot.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-2">
              <div className="flex gap-2">
                <input value={slot.label} onChange={(e) => updateRow('timeSlots', index, { label: e.target.value })} placeholder="Label (e.g. Morning)" className={inputClass} />
                <button type="button" onClick={() => removeRow('timeSlots', index)} disabled={form.timeSlots.length === 1} className="rounded-xl border border-slate-200 px-2 text-rose-500 disabled:opacity-30" aria-label="Remove time slot"><Trash2 size={14} /></button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className={labelClass}>Start</label>
                  <input required type="time" value={slot.startTime} onChange={(e) => updateRow('timeSlots', index, { startTime: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>End</label>
                  <input required type="time" value={slot.endTime} onChange={(e) => updateRow('timeSlots', index, { endTime: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Capacity</label>
                  <input required type="number" min="1" value={slot.capacity} onChange={(e) => updateRow('timeSlots', index, { capacity: e.target.value })} className={inputClass} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <input type="checkbox" checked={slot.active !== false} onChange={(e) => updateRow('timeSlots', index, { active: e.target.checked })} /> Open for booking
              </label>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Bookable days ahead</label>
          <input type="number" min="1" max="365" value={form.bookingWindowDays} onChange={(e) => set('bookingWindowDays', e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Closed dates</label>
          <div className="flex gap-2">
            <input type="date" value={closedInput} onChange={(e) => setClosedInput(e.target.value)} className={inputClass} />
            <button type="button" onClick={addClosedDate} className="rounded-xl bg-slate-900 px-3 text-xs font-black text-white">Add</button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {form.closedDates.map((date) => (
              <span key={date} className="flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700">
                {date}
                <button type="button" onClick={() => set('closedDates', form.closedDates.filter((d) => d !== date))} aria-label={`Reopen ${date}`}><X size={11} /></button>
              </span>
            ))}
          </div>
        </div>
      </section>

      {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}
      <div className="flex gap-2">
        {onCancel && <button type="button" onClick={onCancel} className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-bold text-slate-700">Cancel</button>}
        <button type="submit" disabled={saving || uploading} className="flex-1 rounded-2xl bg-indigo-600 py-3 text-sm font-black text-white disabled:opacity-50">{saving ? 'Saving...' : submitLabel}</button>
      </div>
    </form>
  );
};

export default VenueEditorForm;
