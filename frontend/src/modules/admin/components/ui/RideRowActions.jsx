import React, { useState } from 'react';
import { MoreVertical, X } from 'lucide-react';

const formatDateTime = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const getTripStatusLabel = (row) =>
  row?.isScheduled && row?.tripStatus === 'UPCOMING' ? 'SCHEDULED' : row?.tripStatus || 'UNKNOWN';

const Field = ({ label, value }) => (
  <div>
    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
    <p className="mt-0.5 break-words text-sm font-semibold text-slate-800">{value || '--'}</p>
  </div>
);

const RideRowActions = ({ row }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="View request details"
        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800"
      >
        <MoreVertical size={18} />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900">{row.requestId}</h3>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Status" value={getTripStatusLabel(row)} />
              <Field label="Payment" value={row.paymentOption} />
              <Field label="User" value={[row.user?.name || row.userName, row.user?.phone].filter(Boolean).join(' · ')} />
              <Field label="Driver" value={[row.driver?.name || row.driverName, row.driver?.phone].filter(Boolean).join(' · ')} />
              <Field label="Vehicle" value={[row.driver?.vehicleType || row.transportType, row.driver?.vehicleNumber].filter(Boolean).join(' · ')} />
              <Field label="Fare" value={Number.isFinite(row.fare) ? `₹${row.fare}` : ''} />
              <Field label="Requested At" value={formatDateTime(row.date)} />
              {row.isScheduled ? <Field label="Scheduled For" value={formatDateTime(row.scheduledAt)} /> : null}
            </div>
            <div className="mt-4 space-y-4">
              <Field label="Pickup" value={row.pickupLabel} />
              <Field label="Drop" value={row.dropLabel} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default RideRowActions;
