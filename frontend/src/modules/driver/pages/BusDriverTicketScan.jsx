import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, Loader2, QrCode, ScanLine, ShieldAlert, Ticket, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { checkInBusTicketByQr } from '../services/busDriverService';

const unwrap = (response) => response?.data?.data || response?.data || response || null;

const getSeatLabelText = (seats = []) =>
  seats.map((seat) => seat?.seatLabel || seat?.seatId).filter(Boolean).join(', ') || 'NA';

const BusDriverTicketScan = () => {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const scanLoopRef = useRef(null);
  const streamRef = useRef(null);
  const [manualPayload, setManualPayload] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  const stopCamera = () => {
    if (scanLoopRef.current) {
      window.clearInterval(scanLoopRef.current);
      scanLoopRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setCameraActive(false);
  };

  useEffect(() => () => stopCamera(), []);

  const submitPayload = async (payload) => {
    const qrValue = String(payload || '').trim();
    if (!qrValue || submitting) return;

    setSubmitting(true);
    try {
      const response = await checkInBusTicketByQr({ qrValue });
      const data = unwrap(response);
      setScanResult(data);
      setManualPayload('');
      toast.success(data?.alreadyCheckedIn ? 'Passenger already checked in' : 'Passenger checked in');
      stopCamera();
    } catch (error) {
      toast.error(error?.message || 'Unable to check in passenger');
    } finally {
      setSubmitting(false);
    }
  };

  const startCamera = async () => {
    setCameraError('');
    setScanResult(null);

    if (!('BarcodeDetector' in window)) {
      setCameraError('Camera QR scanning is not supported in this browser. Paste the QR payload below.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      setCameraActive(true);

      scanLoopRef.current = window.setInterval(async () => {
        if (!videoRef.current || submitting) return;

        try {
          const codes = await detector.detect(videoRef.current);
          const value = codes?.[0]?.rawValue;
          if (value) {
            await submitPayload(value);
          }
        } catch {
          setCameraError('Unable to read the QR. Try better light or paste the payload manually.');
        }
      }, 700);
    } catch {
      setCameraError('Camera permission was blocked. Paste the QR payload below to continue.');
      stopCamera();
    }
  };

  const booking = scanResult?.booking || {};
  const passenger = scanResult?.passenger || booking.passenger || {};
  const route = scanResult?.route || booking.routeSnapshot || {};

  return (
    <div className="min-h-screen bg-[#f6f1e8] text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-8 pt-5">
        <header className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/taxi/driver/bus-home')}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Bus Ops</p>
            <h1 className="text-lg font-black">Ticket Check-in</h1>
          </div>
        </header>

        <section className="mt-6 rounded-[32px] bg-slate-950 p-5 text-white shadow-xl shadow-slate-300/40">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                <ScanLine size={15} /> QR Scanner
              </p>
              <h2 className="mt-2 text-2xl font-black leading-tight">Scan the passenger ticket QR</h2>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-300">
                This marks attendance for the assigned bus and protects against wrong-bus scans.
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3">
              <QrCode size={24} />
            </div>
          </div>

          <div className="relative mt-5 aspect-square overflow-hidden rounded-[24px] border border-white/10 bg-black">
            <video ref={videoRef} playsInline muted className="aspect-square w-full object-cover" />
            {!cameraActive ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-center">
                <QrCode size={44} className="text-slate-600" />
                <p className="mt-3 px-8 text-sm font-bold text-slate-300">Start camera to scan the ticket QR.</p>
              </div>
            ) : null}
          </div>

          {cameraError ? (
            <div className="mt-4 rounded-2xl bg-amber-400/15 p-3 text-xs font-bold leading-5 text-amber-100">
              {cameraError}
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={startCamera}
              disabled={cameraActive || submitting}
              className="rounded-2xl bg-white px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-950 disabled:opacity-60"
            >
              {cameraActive ? 'Scanning' : 'Start Scan'}
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="rounded-2xl border border-white/15 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-white"
            >
              Stop
            </button>
          </div>
        </section>

        <section className="mt-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Manual fallback</p>
          <textarea
            value={manualPayload}
            onChange={(event) => setManualPayload(event.target.value)}
            placeholder="Paste scanned QR payload or token here"
            className="mt-3 min-h-[110px] w-full rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900"
          />
          <button
            type="button"
            onClick={() => submitPayload(manualPayload)}
            disabled={submitting || !manualPayload.trim()}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-4 text-xs font-black uppercase tracking-[0.14em] text-white disabled:opacity-60"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Ticket size={16} />}
            Check In Passenger
          </button>
        </section>

        {scanResult ? (
          <section className={`mt-4 rounded-[28px] border p-5 shadow-sm ${
            scanResult.alreadyCheckedIn ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'
          }`}>
            <div className="flex items-start gap-3">
              {scanResult.alreadyCheckedIn ? (
                <ShieldAlert size={24} className="text-amber-600" />
              ) : (
                <CheckCircle2 size={24} className="text-emerald-600" />
              )}
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  {scanResult.alreadyCheckedIn ? 'Already Checked In' : 'Check-in Successful'}
                </p>
                <h3 className="mt-1 text-lg font-black text-slate-950">{passenger.name || 'Passenger'}</h3>
                <p className="mt-1 text-sm font-bold text-slate-600">{passenger.phone || 'No phone'} · {booking.bookingCode || 'Ticket'}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/70 p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Seats</p>
                <p className="mt-1 text-sm font-black text-slate-950">{getSeatLabelText(scanResult.seats)}</p>
              </div>
              <div className="rounded-2xl bg-white/70 p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Route</p>
                <p className="mt-1 text-sm font-black text-slate-950">
                  {route.originCity || 'From'} to {route.destinationCity || 'To'}
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {!scanResult ? (
          <div className="mt-4 flex items-start gap-3 rounded-[24px] border border-slate-200 bg-white/70 p-4 text-sm font-semibold leading-6 text-slate-600">
            <XCircle size={18} className="mt-1 shrink-0 text-slate-400" />
            If the QR scanner does not open, the browser blocked camera access. Use manual fallback and paste the scanned code.
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default BusDriverTicketScan;
