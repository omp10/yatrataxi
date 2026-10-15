import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { entertainmentAdminService as api } from '../../services/entertainmentAdminService';
import VenueEditorForm from '../../../shared/components/entertainment/VenueEditorForm';
import { VenueReviewModal } from './EntertainmentVenues';
import { PageHeader, StatusPill } from './entertainmentUi';
import { VENUE_STATUS, cardClass, secondaryButton, unwrap } from './entertainmentFormat';

const EntertainmentVenueEdit = () => {
  const navigate = useNavigate();
  const { venueId } = useParams();
  const [searchParams] = useSearchParams();
  const isNew = venueId === 'new';
  const partnerId = searchParams.get('partnerId') || '';
  const [venue, setVenue] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    Promise.all([api.getCategories(), isNew ? Promise.resolve(null) : api.getVenue(venueId)])
      .then(([categoryResponse, venueResponse]) => {
        setCategories(unwrap(categoryResponse, []).filter((c) => c.active));
        setVenue(unwrap(venueResponse, null));
      })
      .catch((e) => toast.error(e?.message || 'Could not load the venue'))
      .finally(() => setLoading(false));
  }, [isNew, venueId, version]);

  const goBack = () => {
    if (isNew && partnerId) navigate(`/admin/entertainment/partners/${partnerId}`);
    else navigate('/admin/entertainment/venues');
  };

  const handleSubmit = async (payload) => {
    if (isNew) {
      if (!partnerId) throw new Error('Open "Add venue" from a partner page');
      await api.createVenue({ ...payload, partnerId });
      toast.success('Venue created and live');
    } else {
      await api.updateVenue(venueId, payload);
      toast.success('Venue saved');
    }
    goBack();
  };

  if (loading) return <div className="flex justify-center p-16 text-slate-400"><Loader2 className="animate-spin" /></div>;

  const status = venue ? VENUE_STATUS[venue.status] : null;

  return (
    <div className="p-6">
      <button type="button" onClick={goBack} className="mb-3 flex items-center gap-1 text-xs font-black text-slate-500"><ArrowLeft size={14} />Back</button>
      <PageHeader
        title={isNew ? 'New venue' : venue?.name || 'Venue'}
        subtitle={venue?.partner ? `Partner: ${venue.partner.businessName || venue.partner.name} (${venue.partner.phone})` : undefined}
        actions={venue && (
          <>
            {status && <StatusPill className={status.className}>{status.label}</StatusPill>}
            <button type="button" onClick={() => setReviewing(true)} className={secondaryButton}>Status & commission</button>
          </>
        )}
      />
      {isNew && !partnerId ? (
        <p className="text-sm font-semibold text-rose-600">Open "Add venue" from a partner's page so the venue is assigned to them.</p>
      ) : (
        <div className={`${cardClass} max-w-3xl`}>
          {venue?.adminNote && <p className="mb-4 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">Note to partner: {venue.adminNote}</p>}
          <VenueEditorForm key={version} initialVenue={venue} categories={categories} submitLabel={isNew ? 'Create venue' : 'Save venue'} onSubmit={handleSubmit} onCancel={goBack} />
        </div>
      )}
      {reviewing && venue && (
        <VenueReviewModal
          venue={{ ...venue, partnerCommission: venue.partner?.commissionPercent, effectiveCommissionPercent: venue.commissionPercent ?? venue.partner?.commissionPercent }}
          onClose={() => setReviewing(false)}
          onSaved={() => { setReviewing(false); setLoading(true); setVersion((v) => v + 1); }}
        />
      )}
    </div>
  );
};

export default EntertainmentVenueEdit;
