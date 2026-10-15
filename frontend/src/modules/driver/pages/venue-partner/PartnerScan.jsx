import React, { useRef, useState } from 'react';
import { Camera, CameraOff, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { useQrScanner } from '../../../../shared/hooks/useQrScanner';
import { venuePartnerService } from '../../services/venuePartnerService';

const PartnerScan = () => {
  const [manualCode, setManualCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const lastScanRef = useRef({ value: '', at: 0 });

  const submit = async (value) => {
    const code = String(value || '').trim();
    if (!code || busy) return;
    // The camera keeps reading the same QR; ignore repeats for a few seconds.
    const now = Date.now();
    if (lastScanRef.current.value === code && now - lastScanRef.current.at < 4000) return;
    lastScanRef.current = { value: code, at: now };

    setBusy(true);
    try {
      const response = await venuePartnerService.checkIn(code);
      const { booking, alreadyCheckedIn } = response?.data || {};
      setResult({ kind: alreadyCheckedIn ? 'warning' : 'success', booking });
      setManualCode('');
    } catch (error) {
      setResult({ kind: 'error', message: error?.message || 'This ticket could not be checked in' });
    } finally {
      setBusy(false);
    }
  };

  const { videoRef, cameraActive, cameraError, startCamera, stopCamera } = useQrScanner({ onDetect: submit, paused: busy });

  const booking = result?.booking;
  const tone = result?.kind === 'success'
    ? { box: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', Icon: CheckCircle2, title: 'Entry allowed' }
    : result?.kind === 'warning'
      ? { box: 'bg-amber-50 border-amber-200', text: 'text-amber-700', Icon: AlertTriangle, title: 'Already checked in' }
      : { box: 'bg-rose-50 border-rose-200', text: 'text-rose-700', Icon: XCircle, title: 'Not valid' };

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-3xl bg-slate-900">
        <video ref={videoRef} className={`aspect-square w-full object-cover ${cameraActive ? '' : 'hidden'}`} muted playsInline />
        {!cameraActive && (
          <div className="flex aspect-square w-full flex-col items-center justify-center gap-3 text-slate-400">
            <Camera size={40} />
            <p className="px-6 text-center text-xs font-semibold">Scan the QR code on the visitor's ticket</p>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={cameraActive ? stopCamera : startCamera}
        className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-black ${cameraActive ? 'border border-slate-200 bg-white text-slate-700' : 'bg-indigo-600 text-white'}`}
      >
        {cameraActive ? <><CameraOff size={16} />Stop camera</> : <><Camera size={16} />Start camera</>}
      </button>
      {cameraError && <p className="text-xs font-semibold text-amber-700">{cameraError}</p>}

      <form onSubmit={(e) => { e.preventDefault(); lastScanRef.current = { value: '', at: 0 }; submit(manualCode); }} className="flex gap-2">
        <input
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value.toUpperCase())}
          placeholder="Or type booking code (ENT...)"
          className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm font-bold outline-none focus:border-indigo-500"
        />
        <button type="submit" disabled={busy || !manualCode.trim()} className="rounded-2xl bg-slate-900 px-5 text-sm font-black text-white disabled:opacity-40">{busy ? '...' : 'Check in'}</button>
      </form>

      {result && (
        <div className={`rounded-3xl border p-4 ${tone.box}`}>
          <p className={`flex items-center gap-2 text-base font-black ${tone.text}`}><tone.Icon size={20} />{tone.title}</p>
          {booking ? (
            <div className="mt-2 space-y-1 text-sm font-semibold text-slate-700">
              <p><span className="font-black">{booking.customer?.name || 'Visitor'}</span> · {booking.bookingCode}</p>
              <p>{booking.venue?.name} · {booking.slot?.label} ({booking.slot?.startTime}-{booking.slot?.endTime})</p>
              <p className="text-lg font-black text-slate-900">{booking.totalTickets} ticket(s): {(booking.items || []).map((i) => `${i.name} × ${i.quantity}`).join(', ')}</p>
              {result.kind === 'warning' && booking.checkIn?.checkedInAt && (
                <p className="text-xs">First scanned at {new Date(booking.checkIn.checkedInAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
              )}
            </div>
          ) : (
            <p className="mt-1 text-sm font-semibold text-slate-700">{result.message}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default PartnerScan;
