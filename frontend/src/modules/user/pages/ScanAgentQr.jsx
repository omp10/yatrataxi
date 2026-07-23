import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, QrCode, ScanLine, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { userService } from '../services/userService';
import { useQrScanner } from '../../../shared/hooks/useQrScanner';

const getRoutePrefix = (pathname = '') => (pathname.startsWith('/taxi/user') ? '/taxi/user' : '');

const ScanAgentQr = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const routePrefix = getRoutePrefix(location.pathname);

  const [manualCode, setManualCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [linkedAgent, setLinkedAgent] = useState(null);

  const submitCode = async (value) => {
    const code = String(value || '').trim();
    if (!code || submitting) return;

    setSubmitting(true);
    try {
      const response = await userService.linkAgentByQr({ qrValue: code });
      const agent = response?.data?.data || response?.data || {};
      setLinkedAgent(agent);
      setManualCode('');
      stopCamera();
      toast.success(`Linked to ${agent.agentName || 'your agent'}`);
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Could not link this agent code');
    } finally {
      setSubmitting(false);
    }
  };

  const { videoRef, cameraActive, cameraError, startCamera, stopCamera } = useQrScanner({
    onDetect: submitCode,
    paused: submitting || Boolean(linkedAgent),
  });

  return (
    <div className="min-h-screen bg-slate-50 max-w-lg mx-auto font-sans pb-10">
      <div className="bg-white px-5 pt-10 pb-4 sticky top-0 z-20 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center active:scale-95 transition-all"
          >
            <ArrowLeft size={18} className="text-slate-900" />
          </button>
          <h1 className="text-lg font-bold text-slate-900">Scan Agent QR</h1>
        </div>
      </div>

      <div className="px-5 pt-6">
        {linkedAgent ? (
          <div className="rounded-[28px] border border-emerald-100 bg-emerald-50 p-6 text-center">
            <CheckCircle2 size={40} className="mx-auto text-emerald-600" />
            <h2 className="mt-3 text-xl font-black text-slate-900">Agent linked</h2>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              {linkedAgent.agentName || 'Your agent'}
              {linkedAgent.referralCode ? ` · ${linkedAgent.referralCode}` : ''}
            </p>
            <p className="mt-3 text-xs font-semibold text-slate-500">
              Your future taxi and mini bus bookings will be credited to this agent.
            </p>
            <button
              type="button"
              onClick={() => navigate(`${routePrefix}/home`)}
              className="mt-6 w-full rounded-2xl bg-slate-900 py-4 text-sm font-bold text-white active:scale-[0.98] transition-all"
            >
              Continue Booking
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-slate-900">
              <video
                ref={videoRef}
                muted
                playsInline
                className={`h-64 w-full object-cover ${cameraActive ? '' : 'hidden'}`}
              />
              {!cameraActive ? (
                <div className="flex h-64 flex-col items-center justify-center gap-3 text-white/70">
                  <QrCode size={44} />
                  <p className="text-xs font-bold uppercase tracking-[0.18em]">Camera is off</p>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={startCamera}
              disabled={cameraActive || submitting}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-4 text-sm font-bold text-white disabled:opacity-60 active:scale-[0.98] transition-all"
            >
              <ScanLine size={18} />
              {cameraActive ? 'Scanning…' : 'Start Camera Scan'}
            </button>

            {cameraError ? (
              <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">{cameraError}</p>
            ) : null}

            <div className="mt-6 rounded-[28px] border border-slate-200 bg-white p-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Or enter the agent code</p>
              <input
                value={manualCode}
                onChange={(event) => setManualCode(event.target.value.trim().toUpperCase())}
                placeholder="AGT1234ABC"
                className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-slate-900"
              />
              <button
                type="button"
                onClick={() => submitCode(manualCode)}
                disabled={submitting || !manualCode}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 py-3.5 text-sm font-bold text-slate-900 disabled:opacity-40"
              >
                <UserCheck size={16} />
                Link Agent
              </button>
            </div>

            <p className="mt-4 px-1 text-xs font-medium leading-5 text-slate-500">
              Scanning an agent QR links your account to that agent once. It cannot be changed later, so make sure you
              are scanning the right code.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default ScanAgentQr;
