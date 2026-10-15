import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { venuePartnerService } from '../../services/venuePartnerService';
import VenueEditorForm from '../../../shared/components/entertainment/VenueEditorForm';
import { VENUE_STATUS_STYLES } from './partnerFormat';

const PartnerVenueEditor = () => {
  const navigate = useNavigate();
  const { venueId } = useParams();
  const isNew = !venueId || venueId === 'new';
  const [categories, setCategories] = useState([]);
  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      venuePartnerService.getCategories(),
      isNew ? Promise.resolve(null) : venuePartnerService.getVenue(venueId),
    ])
      .then(([categoryResponse, venueResponse]) => {
        setCategories(categoryResponse?.data || []);
        setVenue(venueResponse?.data || null);
      })
      .catch((e) => setError(e?.message || 'Could not load the venue'))
      .finally(() => setLoading(false));
  }, [isNew, venueId]);

  const backToList = () => navigate('/taxi/driver/venue-partner?tab=venues', { replace: true });

  const handleSubmit = async (payload) => {
    if (isNew) await venuePartnerService.createVenue(payload);
    else await venuePartnerService.updateVenue(venueId, payload);
    backToList();
  };

  const status = venue ? VENUE_STATUS_STYLES[venue.status] : null;

  return (
    <div className="min-h-screen bg-slate-50 max-w-2xl mx-auto pb-16">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur px-5 pt-8 pb-4 border-b border-slate-100 flex items-center gap-3">
        <button type="button" onClick={backToList} className="w-9 h-9 rounded-xl border border-slate-100 bg-white flex items-center justify-center" aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.26em] text-slate-400">{isNew ? 'New venue' : 'Edit venue'}</p>
          <h1 className="truncate text-[19px] font-black text-slate-900">{venue?.name || 'Venue details'}</h1>
        </div>
        {status && <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${status.className}`}>{status.label}</span>}
      </header>
      <div className="px-5 pt-5">
        {loading ? (
          <div className="py-20 flex justify-center text-slate-400"><Loader2 className="animate-spin" /></div>
        ) : error ? (
          <p className="py-16 text-center text-sm font-semibold text-rose-600">{error}</p>
        ) : (
          <>
            {venue?.adminNote && <p className="mb-4 rounded-2xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">Admin note: {venue.adminNote}</p>}
            {isNew && <p className="mb-4 rounded-2xl bg-indigo-50 p-3 text-xs font-semibold text-indigo-800">Your venue will be visible to customers once the admin approves it.</p>}
            <VenueEditorForm
              initialVenue={venue}
              categories={categories}
              submitLabel={isNew ? 'Submit for approval' : venue?.status === 'rejected' ? 'Resubmit for approval' : 'Save changes'}
              onSubmit={handleSubmit}
              onCancel={backToList}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default PartnerVenueEditor;
