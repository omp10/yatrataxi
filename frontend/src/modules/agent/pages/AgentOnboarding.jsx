import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, Camera, CheckCircle2, ChevronRight, FileText, ImagePlus, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { uploadService } from '../../../shared/services/uploadService';
import { agentService, clearAgentLoginSession, getStoredAgentLoginSession } from '../services/agentService';

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });

const AgentOnboarding = () => {
  const navigate = useNavigate();
  const session = getStoredAgentLoginSession();
  const phone = String(session.phone || '').replace(/\D/g, '').slice(-10);
  const [templates, setTemplates] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [documents, setDocuments] = useState({});
  const [documentMeta, setDocumentMeta] = useState({});
  const [uploadingKey, setUploadingKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!phone || !session.verified) {
      navigate('/taxi/agent/login', { replace: true });
      return;
    }

    agentService.getOnboardingDocuments().then((response) => {
      setTemplates(response?.data?.data?.results || response?.data?.results || []);
    }).catch((err) => {
      setError(err?.message || 'Unable to load agent documents');
    });
  }, [navigate, phone, session.verified]);

  const requiredFields = useMemo(
    () => templates.flatMap((item) => (Array.isArray(item.fields) ? item.fields : []).filter((field) => field.required)),
    [templates],
  );

  const requiredTemplateIssue = useMemo(
    () =>
      templates.find((template) => {
        const meta = documentMeta[template.id] || {};
        if (template.has_identify_number && !String(meta.documentNumber || '').trim()) {
          return true;
        }
        if (template.has_expiry_date && !String(meta.expiryDate || '').trim()) {
          return true;
        }
        return false;
      }),
    [documentMeta, templates],
  );

  const handleFileChange = async (field, event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploadingKey(field.key);
    setError('');

    try {
      const dataUrl = await fileToDataUrl(file);
      if (!String(dataUrl || '').startsWith('data:image/')) {
        throw new Error('Please upload an image file');
      }

      const uploadResult = await uploadService.uploadImage(dataUrl, 'agent-onboarding');
      const imageUrl = uploadResult?.url || uploadResult?.secureUrl || uploadResult?.data?.url || uploadResult?.data?.secureUrl || '';
      if (!imageUrl) {
        throw new Error('Upload did not return an image URL');
      }

      setDocuments((current) => ({
        ...current,
        [field.key]: {
          label: field.label,
          side: field.side || 'single',
          imageUrl,
          uploadedAt: new Date().toISOString(),
          previewUrl: dataUrl,
        },
      }));
    } catch (uploadError) {
      setError(uploadError?.message || 'Unable to upload document');
    } finally {
      setUploadingKey('');
    }
  };

  const isComplete =
    name.trim() &&
    requiredFields.every((field) => Boolean(documents[field.key]?.imageUrl)) &&
    !requiredTemplateIssue &&
    !uploadingKey;

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Please enter your full name');
      return;
    }

    if (requiredTemplateIssue?.has_identify_number && !String(documentMeta[requiredTemplateIssue.id]?.documentNumber || '').trim()) {
      setError(`Please enter the ID number for ${requiredTemplateIssue.name}`);
      return;
    }

    if (requiredTemplateIssue?.has_expiry_date && !String(documentMeta[requiredTemplateIssue.id]?.expiryDate || '').trim()) {
      setError(`Please enter the expiry date for ${requiredTemplateIssue.name}`);
      return;
    }

    if (!requiredFields.every((field) => Boolean(documents[field.key]?.imageUrl)) || uploadingKey) {
      setError('Please fill your details and upload all required documents');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await agentService.completeOnboarding({
        phone,
        name,
        email,
        notes,
        documents,
        documentMeta,
      });
      clearAgentLoginSession();
      const payload = response?.data?.data || response?.data || {};
      navigate('/taxi/agent/pending', {
        replace: true,
        state: {
          agent: payload?.agent || {},
        },
      });
    } catch (submitError) {
      setError(submitError?.message || 'Unable to submit onboarding');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#d7f4ff_0%,_#f8fbff_46%,_#f3f4f8_100%)] px-5 pb-32 pt-8">
      <main className="mx-auto max-w-lg space-y-6">
        <header className="rounded-[34px] border border-white/70 bg-white/85 p-6 shadow-[0_22px_50px_rgba(20,58,90,0.12)] backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => navigate('/taxi/agent/login')} className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#d9e7f3] bg-white text-[#143a5a] shadow-sm">
              <ArrowLeft size={18} />
            </button>
            <div className="rounded-full bg-[#143a5a]/8 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#143a5a]">
              New Agent
            </div>
          </div>
          <div className="mt-6">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#5b7a93]">Onboarding</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-[#143a5a]">Submit Your Agent KYC</h1>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
              This number is new, so let&apos;s onboard you. Upload the required agent documents and we&apos;ll send your profile for verification.
            </p>
          </div>
        </header>

        <section className="rounded-[34px] border border-white/70 bg-white/85 p-6 shadow-[0_22px_50px_rgba(20,58,90,0.08)] backdrop-blur-xl space-y-4">
          <div className="grid gap-4">
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Full name" className="w-full rounded-3xl border border-[#d9e7f3] bg-white px-5 py-4 text-[15px] font-semibold text-slate-900 outline-none focus:border-[#143a5a] focus:ring-4 focus:ring-[#143a5a]/8" />
            <input value={phone} disabled className="w-full rounded-3xl border border-[#d9e7f3] bg-slate-50 px-5 py-4 text-[15px] font-semibold text-slate-500 outline-none" />
            <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email (optional)" className="w-full rounded-3xl border border-[#d9e7f3] bg-white px-5 py-4 text-[15px] font-semibold text-slate-900 outline-none focus:border-[#143a5a] focus:ring-4 focus:ring-[#143a5a]/8" />
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Notes for admin (optional)" className="min-h-24 w-full resize-none rounded-3xl border border-[#d9e7f3] bg-white px-5 py-4 text-[15px] font-semibold text-slate-900 outline-none focus:border-[#143a5a] focus:ring-4 focus:ring-[#143a5a]/8" />
          </div>
        </section>

        {templates.map((template) => (
          <section key={template.id} className="rounded-[34px] border border-white/70 bg-white/85 p-6 shadow-[0_22px_50px_rgba(20,58,90,0.08)] backdrop-blur-xl space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-[#143a5a]">{template.name}</h2>
                <p className="mt-1 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  {template.is_required ? 'Required document' : 'Optional document'}
                </p>
              </div>
              <div className="rounded-2xl bg-[#eff7ff] p-3 text-[#143a5a]">
                <ShieldCheck size={18} />
              </div>
            </div>

            {template.has_identify_number || template.has_expiry_date ? (
              <div className="grid gap-4 md:grid-cols-2">
                {template.has_identify_number ? (
                  <input
                    value={documentMeta[template.id]?.documentNumber || ''}
                    onChange={(event) =>
                      setDocumentMeta((current) => ({
                        ...current,
                        [template.id]: {
                          ...(current[template.id] || {}),
                          documentNumber: event.target.value,
                        },
                      }))
                    }
                    placeholder={`${template.name} ID number`}
                    className="w-full rounded-3xl border border-[#d9e7f3] bg-white px-5 py-4 text-[15px] font-semibold text-slate-900 outline-none focus:border-[#143a5a] focus:ring-4 focus:ring-[#143a5a]/8"
                  />
                ) : null}
                {template.has_expiry_date ? (
                  <input
                    type="date"
                    value={documentMeta[template.id]?.expiryDate || ''}
                    onChange={(event) =>
                      setDocumentMeta((current) => ({
                        ...current,
                        [template.id]: {
                          ...(current[template.id] || {}),
                          expiryDate: event.target.value,
                        },
                      }))
                    }
                    className="w-full rounded-3xl border border-[#d9e7f3] bg-white px-5 py-4 text-[15px] font-semibold text-slate-900 outline-none focus:border-[#143a5a] focus:ring-4 focus:ring-[#143a5a]/8"
                  />
                ) : null}
              </div>
            ) : null}

            {(template.fields || []).map((field) => {
              const document = documents[field.key];
              const isUploading = uploadingKey === field.key;
              return (
                <div key={field.key} className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">{field.label}</p>
                    {document?.imageUrl ? <span className="inline-flex items-center gap-2 text-xs font-black text-emerald-600"><CheckCircle2 size={14} /> Uploaded</span> : null}
                  </div>
                  <div className={`relative min-h-[150px] overflow-hidden rounded-[26px] border-2 ${document?.previewUrl ? 'border-emerald-200 bg-emerald-50/30' : 'border-dashed border-[#d9e7f3] bg-[#eff7ff]'}`}>
                    {document?.previewUrl ? <img src={document.previewUrl} alt={field.label} className="absolute inset-0 h-full w-full object-cover" /> : null}
                    <div className="relative z-10 flex min-h-[150px] flex-col items-center justify-center gap-3 bg-black/10 p-4 text-center">
                      {isUploading ? (
                        <>
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-[#143a5a]" />
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#143a5a]">Uploading</p>
                        </>
                      ) : (
                        <>
                          <div className="rounded-2xl bg-white p-3 text-[#143a5a] shadow-sm">
                            {document?.previewUrl ? <Camera size={18} /> : <FileText size={18} />}
                          </div>
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#143a5a]">
                            {document?.previewUrl ? 'Replace image if needed' : 'Upload clear document photo'}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="relative inline-flex items-center justify-center gap-2 rounded-[20px] border border-[#d9e7f3] bg-white px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-[#143a5a] shadow-sm">
                      <ImagePlus size={14} />
                      Gallery
                      <input type="file" accept="image/*" className="absolute inset-0 cursor-pointer opacity-0" disabled={isUploading} onChange={(event) => handleFileChange(field, event)} />
                    </label>
                    <label className="relative inline-flex items-center justify-center gap-2 rounded-[20px] bg-[#143a5a] px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-white shadow-sm">
                      <Camera size={14} />
                      Camera
                      <input type="file" accept="image/*" capture="environment" className="absolute inset-0 cursor-pointer opacity-0" disabled={isUploading} onChange={(event) => handleFileChange(field, event)} />
                    </label>
                  </div>
                </div>
              );
            })}
          </section>
        ))}

        {templates.length === 0 ? (
          <section className="rounded-[34px] border border-white/70 bg-white/85 p-6 shadow-[0_22px_50px_rgba(20,58,90,0.08)] backdrop-blur-xl">
            <p className="text-sm font-semibold leading-6 text-slate-500">
              No onboarding documents are configured yet. You can still submit your basic profile and the admin team can request documents later.
            </p>
          </section>
        ) : null}

        {error ? (
          <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm font-bold text-rose-600">
            <span className="inline-flex items-center gap-2"><AlertCircle size={16} /> {error}</span>
          </div>
        ) : null}

        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white/90 to-transparent p-8">
          <div className="mx-auto max-w-lg">
            <button type="button" onClick={handleSubmit} disabled={loading || !isComplete} className="flex w-full items-center justify-center gap-3 rounded-[26px] bg-[#143a5a] px-5 py-4 text-sm font-black uppercase tracking-[0.2em] text-white shadow-[0_18px_36px_rgba(20,58,90,0.22)] transition disabled:cursor-not-allowed disabled:opacity-50">
              {loading ? 'Submitting...' : 'Submit For Verification'}
              {!loading ? <ChevronRight size={18} /> : null}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AgentOnboarding;
