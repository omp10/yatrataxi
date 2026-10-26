import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  Film,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  Upload,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { getOptimizedImageUrl, getVideoPosterUrl } from '../../../../shared/utils/cloudinaryMedia';

const Motion = motion;
const LIST_PATH = '/admin/promotions/banner-image';
const CREATE_PATH = '/admin/promotions/banner-image/create';
const MEDIA_ACCEPT = { image: 'image/*', video: 'video/mp4,video/webm,video/quicktime' };
const MEDIA_LIMIT_LABEL = { image: '10 MB', video: '50 MB' };

const createInitialFormData = () => ({
  media_type: 'image',
  media_file: null,
  media_url: '',
  use_url: false,
  poster_file: null,
  poster_url: '',
  title: '',
  subtitle: '',
  cta_label: '',
  link_type: 'deep_link',
  redirect_url: '',
  sort_order: 0,
  active: true,
});

const formDataFromBanner = (banner) => ({
  ...createInitialFormData(),
  media_type: banner.media_type || 'image',
  media_url: banner.image || '',
  use_url: true,
  poster_url: banner.poster || '',
  title: banner.title || '',
  subtitle: banner.subtitle || '',
  cta_label: banner.cta_label || '',
  link_type: banner.link_type || 'deep_link',
  redirect_url: banner.redirect_url || '',
  sort_order: Number(banner.sort_order || 0),
  active: banner.active !== false,
});

const inputClass =
  'w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-800 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors';
const labelClass = 'block text-[14px] font-semibold text-gray-900 mb-2';

// Upload a file straight to Cloudinary using a signature from the backend, so
// large videos never pass through the API server's JSON body limit.
const uploadToCloudinary = async ({ file, mediaType, baseUrl, token, onProgress }) => {
  const signatureRes = await fetch(`${baseUrl}/banners/upload-signature`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ media_type: mediaType }),
  });
  const signaturePayload = await signatureRes.json().catch(() => null);
  if (!signatureRes.ok || !signaturePayload?.success) {
    throw new Error(signaturePayload?.message || 'Could not prepare the upload');
  }

  const signed = signaturePayload.data;
  if (signed.max_bytes && file.size > signed.max_bytes) {
    throw new Error(`File is too large. Maximum size is ${MEDIA_LIMIT_LABEL[mediaType]}.`);
  }

  const body = new FormData();
  body.append('file', file);
  body.append('api_key', signed.api_key);
  Object.entries(signed.fields || {}).forEach(([key, value]) => body.append(key, value));
  body.append('signature', signed.signature);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', signed.upload_url);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      let result = null;
      try {
        result = JSON.parse(xhr.responseText);
      } catch {
        result = null;
      }
      if (xhr.status >= 200 && xhr.status < 300 && result?.secure_url) {
        resolve(result.secure_url);
      } else {
        reject(new Error(result?.error?.message || 'Upload failed'));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(body);
  });
};

const BannerPreview = ({ src, mediaType, poster, className, thumbnail = false }) => {
  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-gray-50 text-gray-300 ${className}`}>
        <ImageIcon size={16} />
      </div>
    );
  }

  // In the list, a still frame is enough and avoids downloading every video.
  if (mediaType === 'video' && thumbnail) {
    const still = poster || getVideoPosterUrl(src, { width: 320 });
    if (still) return <img src={still} alt="Banner video" className={`object-cover bg-black ${className}`} />;
  }

  if (mediaType === 'video') {
    return (
      <video
        src={src}
        poster={poster || undefined}
        className={`object-cover bg-black ${className}`}
        muted
        loop
        playsInline
        autoPlay
      />
    );
  }

  return (
    <img
      src={thumbnail ? getOptimizedImageUrl(src, { width: 320 }) : src}
      alt="Banner"
      className={`object-cover ${className}`}
    />
  );
};

const BannerImage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isCreateRoute = location.pathname === CREATE_PATH;
  const editId = isCreateRoute ? new URLSearchParams(location.search).get('edit') : null;

  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [formData, setFormData] = useState(createInitialFormData);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [posterPreview, setPosterPreview] = useState(null);

  const token = localStorage.getItem('adminToken') || '';
  const baseUrl = globalThis.__LEGACY_BACKEND_ORIGIN__ + '/api/v1/admin';

  const resolveImageUrl = useCallback(
    (img) => {
      if (!img) return null;
      if (img.startsWith('data:') || img.startsWith('http') || img.startsWith('blob:')) return img;
      const rootUrl = baseUrl.replace('/api/v1/admin', '');
      return `${rootUrl}/${img.startsWith('/') ? img.slice(1) : img}`;
    },
    [baseUrl],
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${baseUrl}/banners?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const items = data.data?.results || (Array.isArray(data.data) ? data.data : data.results || []);
          setBanners(items);
        } else {
          setBanners([]);
        }
      } else {
        setBanners([]);
      }
    } catch (error) {
      console.error('Error fetching banners:', error);
      setBanners([]);
    } finally {
      setLoading(false);
    }
  }, [baseUrl, token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const editingBanner = useMemo(
    () => (editId ? banners.find((item) => String(item._id || item.id) === editId) : null),
    [banners, editId],
  );

  useEffect(() => {
    if (!isCreateRoute) {
      setFormData(createInitialFormData());
      setMediaPreview(null);
      setPosterPreview(null);
      return;
    }

    if (editingBanner) {
      setFormData(formDataFromBanner(editingBanner));
      setMediaPreview(null);
      setPosterPreview(null);
    }
  }, [isCreateRoute, editingBanner]);

  const updateField = (field, value) => setFormData((current) => ({ ...current, [field]: value }));

  const handleMediaTypeChange = (mediaType) => {
    setFormData((current) => ({
      ...current,
      media_type: mediaType,
      media_file: null,
      media_url: current.media_type === mediaType ? current.media_url : '',
    }));
    setMediaPreview(null);
  };

  const handleMediaChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFormData((current) => ({ ...current, media_file: file, use_url: false }));
    setMediaPreview(URL.createObjectURL(file));
  };

  const handlePosterChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFormData((current) => ({ ...current, poster_file: file }));
    setPosterPreview(URL.createObjectURL(file));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    const mediaLabel = formData.media_type === 'video' ? 'video' : 'image';

    if (!formData.use_url && !formData.media_file) {
      alert(`Please upload a banner ${mediaLabel}`);
      return;
    }

    if (formData.use_url && !formData.media_url.trim()) {
      alert(`Please enter a ${mediaLabel} URL`);
      return;
    }

    setSaving(true);
    try {
      let mediaUrl = formData.use_url ? formData.media_url.trim() : '';
      if (!formData.use_url && formData.media_file instanceof File) {
        setUploadProgress(0);
        mediaUrl = await uploadToCloudinary({
          file: formData.media_file,
          mediaType: formData.media_type,
          baseUrl,
          token,
          onProgress: setUploadProgress,
        });
      }

      let posterUrl = formData.poster_url.trim();
      if (formData.media_type === 'video' && formData.poster_file instanceof File) {
        setUploadProgress(0);
        posterUrl = await uploadToCloudinary({
          file: formData.poster_file,
          mediaType: 'image',
          baseUrl,
          token,
          onProgress: setUploadProgress,
        });
      }

      const payload = {
        media_type: formData.media_type,
        image: mediaUrl,
        poster: formData.media_type === 'video' ? posterUrl : '',
        title: formData.title.trim(),
        subtitle: formData.subtitle.trim(),
        cta_label: formData.cta_label.trim(),
        link_type: formData.link_type,
        redirect_url: formData.redirect_url.trim(),
        sort_order: Number(formData.sort_order) || 0,
        active: formData.active,
      };

      const res = await fetch(editingBanner ? `${baseUrl}/banners/${editId}` : `${baseUrl}/banners`, {
        method: editingBanner ? 'PATCH' : 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setFormData(createInitialFormData());
        setMediaPreview(null);
        setPosterPreview(null);
        await fetchData();
        navigate(LIST_PATH);
      } else {
        alert(data.message || 'Failed to save banner');
      }
    } catch (error) {
      console.error('Save banner error:', error);
      alert(error.message || 'Failed to save banner');
    } finally {
      setSaving(false);
      setUploadProgress(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this banner?')) return;

    try {
      const res = await fetch(`${baseUrl}/banners/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        await fetchData();
      }
    } catch (error) {
      console.error('Delete banner error:', error);
    }
  };

  const toggleStatus = async (item) => {
    const id = item._id || item.id;
    try {
      const res = await fetch(`${baseUrl}/banners/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ active: !item.active }),
      });
      const data = await res.json();
      if (data.success) {
        setBanners((current) =>
          current.map((banner) => ((banner._id || banner.id) === id ? { ...banner, active: !item.active } : banner)),
        );
      }
    } catch (error) {
      console.error('Banner status toggle error:', error);
    }
  };

  const currentMediaSrc = mediaPreview || (formData.use_url ? resolveImageUrl(formData.media_url.trim()) : null);
  const currentPosterSrc = posterPreview || resolveImageUrl(formData.poster_url.trim());
  const pageTitle = isCreateRoute ? (editId ? 'EDIT BANNER' : 'CREATE') : 'HOME BANNERS';

  return (
    <div className="space-y-6 p-1 animate-in fade-in duration-500 font-sans text-gray-950 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[17px] font-black text-[#2D3A6E] uppercase tracking-tight italic leading-none mb-1">
            {pageTitle}
          </h1>
          <div className="flex items-center gap-2 text-[11px] font-bold text-gray-400 uppercase tracking-widest leading-none">
            <span>Banner Image</span>
            <ChevronRight size={12} className="opacity-50" />
            <span className="text-gray-900">{isCreateRoute ? (editId ? 'Edit' : 'Create') : 'Banner Image'}</span>
          </div>
        </div>
        {isCreateRoute ? (
          <button
            type="button"
            onClick={() => navigate(LIST_PATH)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft size={16} /> Back
          </button>
        ) : null}
      </div>

      <AnimatePresence mode="wait">
        {!isCreateRoute ? (
          <Motion.div
            key="banner-list"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-[22px] border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 flex items-center justify-between gap-4 border-b border-gray-100">
                <p className="text-sm text-gray-500">
                  Active banners appear in the hero slider at the top of the user app home screen, lowest order first.
                </p>

                <button
                  type="button"
                  onClick={() => navigate(CREATE_PATH)}
                  className="shrink-0 bg-[#2D3A6E] text-white h-10 px-5 rounded-lg flex items-center gap-2 text-[13px] font-bold hover:bg-[#1d2756] transition-all"
                >
                  <Plus size={16} />
                  Add Banner
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50">
                    <tr className="text-[13px] font-bold text-gray-700">
                      <th className="px-6 py-4">Media</th>
                      <th className="px-6 py-4">Title</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">Order</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loading ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-14 text-center text-sm text-gray-400">
                          Loading banners...
                        </td>
                      </tr>
                    ) : banners.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-14 text-center text-sm text-gray-400">
                          No banners found.
                        </td>
                      </tr>
                    ) : (
                      banners.map((item) => {
                        const id = item._id || item.id;
                        return (
                          <tr key={id}>
                            <td className="px-6 py-4">
                              <BannerPreview
                                src={resolveImageUrl(item.image)}
                                mediaType={item.media_type}
                                poster={resolveImageUrl(item.poster)}
                                className="h-16 w-36 rounded border border-gray-200"
                                thumbnail
                              />
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-[13px] font-semibold text-gray-900">{item.title || '—'}</p>
                              {item.subtitle ? <p className="text-[12px] text-gray-500">{item.subtitle}</p> : null}
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-gray-600">
                                {item.media_type === 'video' ? <Film size={14} /> : <ImageIcon size={14} />}
                                {item.media_type === 'video' ? 'Video' : 'Image'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-[13px] text-gray-700">{Number(item.sort_order || 0)}</td>
                            <td className="px-6 py-4">
                              <button
                                type="button"
                                onClick={() => toggleStatus(item)}
                                className={`inline-flex rounded px-2.5 py-1 text-[11px] font-bold uppercase ${
                                  item.active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'
                                }`}
                              >
                                {item.active ? 'Active' : 'Inactive'}
                              </button>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => navigate(`${CREATE_PATH}?edit=${id}`)}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-indigo-600"
                                  aria-label="Edit banner"
                                >
                                  <Pencil size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(id)}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-rose-600"
                                  aria-label="Delete banner"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Motion.div>
        ) : (
          <Motion.form
            key="banner-create"
            onSubmit={handleSave}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white rounded-[22px] border border-gray-200 shadow-sm p-8"
          >
            {editId && !editingBanner && !loading ? (
              <p className="text-sm text-rose-600">This banner no longer exists.</p>
            ) : (
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-6">
                  <div>
                    <label className={labelClass}>Media type</label>
                    <div className="inline-flex rounded-lg border border-gray-200 p-1">
                      {[
                        { value: 'image', label: 'Image', icon: <ImageIcon size={15} /> },
                        { value: 'video', label: 'Video', icon: <Film size={15} /> },
                      ].map(({ value, label, icon }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => handleMediaTypeChange(value)}
                          className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-[13px] font-semibold transition-colors ${
                            formData.media_type === value ? 'bg-[#2D3A6E] text-white' : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {icon} {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>
                      Banner {formData.media_type === 'video' ? 'video' : 'image'}
                      <span className="text-rose-500">*</span>
                      <span className="ml-1 text-gray-400 font-medium">
                        (16:9 landscape, max {MEDIA_LIMIT_LABEL[formData.media_type]})
                      </span>
                    </label>

                    {!formData.use_url ? (
                      <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-300 bg-white py-8 text-center hover:border-indigo-300">
                        <input
                          key={formData.media_type}
                          type="file"
                          className="hidden"
                          accept={MEDIA_ACCEPT[formData.media_type]}
                          onChange={handleMediaChange}
                        />
                        <Upload size={28} className="text-gray-500" />
                        <p className="text-[15px] font-medium text-gray-900">
                          {formData.media_file ? formData.media_file.name : `Upload ${formData.media_type === 'video' ? 'MP4 / WebM video' : 'image'}`}
                        </p>
                      </label>
                    ) : (
                      <input
                        type="url"
                        value={formData.media_url}
                        onChange={(e) => updateField('media_url', e.target.value)}
                        className={inputClass}
                        placeholder={formData.media_type === 'video' ? 'https://example.com/banner.mp4' : 'https://example.com/banner.jpg'}
                      />
                    )}

                    {formData.media_type === 'video' ? (
                      <p className="mt-2 text-xs text-gray-500">
                        Best results: 10–20 seconds, landscape, no sound needed (banners play muted). Users get an
                        automatically compressed 720p copy, so a large upload still loads quickly in the app.
                      </p>
                    ) : null}

                    <label className="mt-3 inline-flex items-center gap-2 text-sm text-gray-800">
                      <input
                        type="checkbox"
                        checked={formData.use_url}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setFormData((current) => ({ ...current, use_url: checked, media_file: checked ? null : current.media_file }));
                          if (checked) setMediaPreview(null);
                        }}
                        className="rounded border-gray-300 text-[#2D3A6E] focus:ring-[#2D3A6E]"
                      />
                      <span>Use a URL instead</span>
                    </label>
                  </div>

                  {formData.media_type === 'video' ? (
                    <div>
                      <label className={labelClass}>
                        Poster image <span className="text-gray-400 font-medium">(optional — the first frame is used if left empty)</span>
                      </label>
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                          <input type="file" className="hidden" accept="image/*" onChange={handlePosterChange} />
                          <Upload size={15} />
                          {formData.poster_file ? formData.poster_file.name : 'Upload poster'}
                        </label>
                        <span className="text-xs text-gray-400">or</span>
                        <input
                          type="url"
                          value={formData.poster_url}
                          onChange={(e) => {
                            updateField('poster_url', e.target.value);
                            updateField('poster_file', null);
                            setPosterPreview(null);
                          }}
                          className={`${inputClass} max-w-xs`}
                          placeholder="https://example.com/poster.jpg"
                        />
                      </div>
                    </div>
                  ) : null}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={labelClass}>
                        Headline <span className="text-gray-400 font-medium">(optional)</span>
                      </label>
                      <input
                        type="text"
                        maxLength={40}
                        value={formData.title}
                        onChange={(e) => updateField('title', e.target.value)}
                        className={inputClass}
                        placeholder="Move your way"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>
                        Subtitle <span className="text-gray-400 font-medium">(optional)</span>
                      </label>
                      <input
                        type="text"
                        maxLength={60}
                        value={formData.subtitle}
                        onChange={(e) => updateField('subtitle', e.target.value)}
                        className={inputClass}
                        placeholder="Your next journey starts here"
                      />
                    </div>
                  </div>
                  <p className="-mt-3 text-xs text-gray-400">
                    Leave the headline empty if the text is already part of the image or video.
                  </p>

                  <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
                    <div>
                      <label className={labelClass}>On tap</label>
                      <select
                        value={formData.link_type}
                        onChange={(e) => updateField('link_type', e.target.value)}
                        className={inputClass}
                      >
                        <option value="deep_link">Open app page</option>
                        <option value="external_link">Open website</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>
                        {formData.link_type === 'deep_link' ? 'App path' : 'Website URL'}{' '}
                        <span className="text-gray-400 font-medium">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={formData.redirect_url}
                        onChange={(e) => updateField('redirect_url', e.target.value)}
                        className={inputClass}
                        placeholder={formData.link_type === 'deep_link' ? '/taxi/user/rental' : 'https://example.com/offer'}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className={labelClass}>
                        Button label <span className="text-gray-400 font-medium">(optional)</span>
                      </label>
                      <input
                        type="text"
                        maxLength={20}
                        value={formData.cta_label}
                        onChange={(e) => updateField('cta_label', e.target.value)}
                        className={inputClass}
                        placeholder="Book now"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Display order</label>
                      <input
                        type="number"
                        value={formData.sort_order}
                        onChange={(e) => updateField('sort_order', e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Status</label>
                      <label className="inline-flex h-[42px] items-center gap-2 text-sm text-gray-800">
                        <input
                          type="checkbox"
                          checked={formData.active}
                          onChange={(e) => updateField('active', e.target.checked)}
                          className="rounded border-gray-300 text-[#2D3A6E] focus:ring-[#2D3A6E]"
                        />
                        Active
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <p className={labelClass}>Preview</p>
                  <div className="relative aspect-[16/10] overflow-hidden rounded-[22px] bg-slate-900 shadow-lg">
                    {currentMediaSrc ? (
                      <BannerPreview
                        src={currentMediaSrc}
                        mediaType={formData.media_type}
                        poster={currentPosterSrc}
                        className="absolute inset-0 h-full w-full"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-sm text-white/50">
                        No media selected
                      </div>
                    )}
                    {formData.title || formData.subtitle || formData.cta_label ? (
                      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 via-black/10 to-transparent p-4">
                        {formData.title ? (
                          <p className="text-[22px] font-black uppercase leading-none text-[#FFC21A]">{formData.title}</p>
                        ) : null}
                        {formData.subtitle ? <p className="mt-1 text-[12px] font-semibold text-white">{formData.subtitle}</p> : null}
                        {formData.cta_label ? (
                          <span className="mt-2 inline-flex w-fit rounded-full bg-white px-3 py-1 text-[11px] font-bold text-slate-900">
                            {formData.cta_label}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <p className="mt-2 text-xs text-gray-400">Roughly how it looks on the user home screen.</p>
                </div>
              </div>
            )}

            <div className="mt-8 flex items-center justify-end gap-4">
              {uploadProgress !== null ? (
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <div className="h-2 w-40 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full bg-[#2D3A6E] transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  Uploading {uploadProgress}%
                </div>
              ) : null}
              <button
                type="submit"
                disabled={saving || (editId && !editingBanner)}
                className="h-10 px-6 bg-[#2D3A6E] text-white rounded-lg text-[13px] font-bold hover:bg-[#1d2756] transition-all inline-flex items-center gap-2 disabled:opacity-60"
              >
                {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                {editId ? 'Update' : 'Save'}
              </button>
            </div>
          </Motion.form>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BannerImage;
