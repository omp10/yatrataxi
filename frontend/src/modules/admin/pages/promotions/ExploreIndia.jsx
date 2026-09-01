import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpDown,
  Check,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  Filter,
  Globe2,
  Grid,
  Image as ImageIcon,
  LayoutGrid,
  List,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const Motion = motion;

const createInitialFormData = () => ({
  title: '',
  label: '',
  code: '',
  dropLocation: '',
  image: null,
  imageUrl: '',
  useUrl: false,
  description: '',
  order: 0,
  active: true,
  isFeatured: false,
});

const ExploreIndia = () => {
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, inactive
  const [viewMode, setViewMode] = useState('grid'); // grid, table

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDestination, setEditingDestination] = useState(null);
  const [formData, setFormData] = useState(createInitialFormData);
  const [imagePreview, setImagePreview] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const token = localStorage.getItem('adminToken') || '';
  const baseUrl = (globalThis.__LEGACY_BACKEND_ORIGIN__ || '') + '/api/v1/admin';

  const fetchDestinations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${baseUrl}/explore-destinations`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const items = data.data?.results || (Array.isArray(data.data) ? data.data : []);
          setDestinations(items);
        } else {
          setDestinations([]);
        }
      } else {
        // Fallback check from promotions bootstrap
        const bootRes = await fetch(`${baseUrl}/promotions/bootstrap`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (bootRes.ok) {
          const bootData = await bootRes.json();
          if (bootData.data?.explore_destinations) {
            setDestinations(bootData.data.explore_destinations);
            return;
          }
        }
        setDestinations([]);
      }
    } catch (error) {
      console.error('Error fetching explore destinations:', error);
      toast.error('Failed to load explore destinations');
      setDestinations([]);
    } finally {
      setLoading(false);
    }
  }, [baseUrl, token]);

  useEffect(() => {
    fetchDestinations();
  }, [fetchDestinations]);

  // Open modal for Create
  const handleOpenCreateModal = () => {
    setEditingDestination(null);
    setFormData(createInitialFormData());
    setImagePreview(null);
    setModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEditModal = (dest) => {
    setEditingDestination(dest);
    setFormData({
      title: dest.title || '',
      label: dest.label || '',
      code: dest.code || '',
      dropLocation: dest.dropLocation || dest.drop || '',
      image: null,
      imageUrl: dest.image || '',
      useUrl: Boolean(dest.image && !dest.image.startsWith('data:')),
      description: dest.description || '',
      order: dest.order ?? 0,
      active: dest.active !== false,
      isFeatured: Boolean(dest.isFeatured),
    });
    setImagePreview(dest.image || null);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingDestination(null);
    setFormData(createInitialFormData());
    setImagePreview(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({
        ...prev,
        image: reader.result, // base64 data url
        useUrl: false,
      }));
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUrlChange = (e) => {
    const url = e.target.value;
    setFormData((prev) => ({
      ...prev,
      imageUrl: url,
      image: null,
      useUrl: true,
    }));
    setImagePreview(url || null);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Please enter a destination title (e.g. Taj Mahal)');
      return;
    }
    if (!formData.label.trim()) {
      toast.error('Please enter the city or state (e.g. Agra)');
      return;
    }
    if (!formData.code.trim()) {
      toast.error('Please enter a short 3-letter code (e.g. AGR)');
      return;
    }
    if (!formData.dropLocation.trim()) {
      toast.error('Please enter the drop location address');
      return;
    }

    const effectiveImage = formData.image || formData.imageUrl;
    if (!effectiveImage) {
      toast.error('Please upload an image or provide an image URL');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: formData.title.trim(),
        label: formData.label.trim(),
        code: formData.code.trim().toUpperCase(),
        dropLocation: formData.dropLocation.trim(),
        image: effectiveImage,
        description: formData.description.trim(),
        order: Number(formData.order) || 0,
        active: formData.active,
        isFeatured: formData.isFeatured,
      };

      const isEdit = Boolean(editingDestination?._id || editingDestination?.id);
      const targetId = editingDestination?._id || editingDestination?.id;
      const url = isEdit
        ? `${baseUrl}/explore-destinations/${targetId}`
        : `${baseUrl}/explore-destinations`;

      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(isEdit ? 'Destination updated successfully!' : 'Destination added successfully!');
        handleCloseModal();
        fetchDestinations();
      } else {
        toast.error(data.message || 'Failed to save destination');
      }
    } catch (error) {
      console.error('Error saving destination:', error);
      toast.error('An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (dest) => {
    const id = dest._id || dest.id;
    setTogglingId(id);
    try {
      const res = await fetch(`${baseUrl}/explore-destinations/${id}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(
          data.data?.active ? `"${dest.title}" is now Active` : `"${dest.title}" is now Inactive`
        );
        setDestinations((prev) =>
          prev.map((item) => ((item._id || item.id) === id ? { ...item, active: data.data.active } : item))
        );
      } else {
        toast.error(data.message || 'Failed to toggle status');
      }
    } catch (error) {
      console.error('Error toggling destination status:', error);
      toast.error('Failed to change status');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      const res = await fetch(`${baseUrl}/explore-destinations/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Destination deleted successfully');
        setDestinations((prev) => prev.filter((item) => (item._id || item.id) !== id));
        setDeleteConfirmId(null);
      } else {
        toast.error(data.message || 'Failed to delete destination');
      }
    } catch (error) {
      console.error('Error deleting destination:', error);
      toast.error('Failed to delete destination');
    } finally {
      setDeletingId(null);
    }
  };

  // Filter and search destinations
  const filteredDestinations = useMemo(() => {
    return destinations.filter((item) => {
      const matchesSearch =
        searchQuery === '' ||
        item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.label?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.dropLocation?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && item.active !== false) ||
        (statusFilter === 'inactive' && item.active === false);

      return matchesSearch && matchesStatus;
    });
  }, [destinations, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const total = destinations.length;
    const active = destinations.filter((d) => d.active !== false).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [destinations]);

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">
            <Globe2 size={16} />
            <span>Taxi App Management</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Explore India Destinations</h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            Manage tourist destinations displayed dynamically in the Taxi User app's "Explore India" section.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchDestinations}
            disabled={loading}
            className="p-2.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
            title="Refresh Data"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all text-sm"
          >
            <Plus size={18} strokeWidth={2.5} />
            <span>Add Destination</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Destinations</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.total}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
            <Globe2 size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Active on App</p>
            <h3 className="text-2xl font-black text-emerald-700 mt-1">{stats.active}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Inactive / Hidden</p>
            <h3 className="text-2xl font-black text-slate-500 mt-1">{stats.inactive}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <EyeOff size={22} />
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, city, code, drop address..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          {/* Status Filter */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'active'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active ({stats.active})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'inactive'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Inactive ({stats.inactive})
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Grid View"
            >
              <LayoutGrid size={18} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Table View"
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Content Section */}
      {loading ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 size={32} className="animate-spin text-emerald-600" />
          <p className="text-sm font-semibold">Loading destinations...</p>
        </div>
      ) : filteredDestinations.length === 0 ? (
        <div className="bg-white p-16 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
            <Globe2 size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No destinations found</h3>
          <p className="text-sm text-slate-500 max-w-md mt-1 mb-6">
            {searchQuery
              ? `No destinations matched "${searchQuery}". Try changing your search query or status filter.`
              : 'You have not added any Explore India destinations yet. Add your first destination to display it in the user taxi app!'}
          </p>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all text-sm"
          >
            <Plus size={18} strokeWidth={2.5} />
            <span>Add Destination Now</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <AnimatePresence>
            {filteredDestinations.map((dest) => {
              const id = dest._id || dest.id;
              const isToggling = togglingId === id;
              const isDeleting = deletingId === id;

              return (
                <Motion.div
                  key={id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className={`group bg-white rounded-2xl border transition-all duration-300 overflow-hidden flex flex-col justify-between ${
                    dest.active !== false
                      ? 'border-slate-200/90 shadow-[0_4px_20px_rgba(15,23,42,0.04)] hover:shadow-[0_12px_32px_rgba(15,23,42,0.1)]'
                      : 'border-slate-200/60 bg-slate-50/50 opacity-75'
                  }`}
                >
                  <div>
                    {/* Image Preview & Badges */}
                    <div className="relative h-44 w-full overflow-hidden bg-slate-100">
                      <img
                        src={dest.image}
                        alt={dest.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=600&q=80';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-black/20" />

                      {/* Top Badges */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black tracking-widest bg-white/95 text-emerald-800 shadow-sm border border-white/60">
                          {dest.code || 'LOC'}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {dest.order !== undefined && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/60 text-white backdrop-blur-md">
                              #{dest.order}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(dest)}
                            disabled={isToggling}
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 shadow-sm transition-all ${
                              dest.active !== false
                                ? 'bg-emerald-500 text-white'
                                : 'bg-slate-700 text-slate-200'
                            }`}
                            title="Click to toggle status"
                          >
                            {isToggling ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : dest.active !== false ? (
                              <>
                                <Check size={12} strokeWidth={3} />
                                <span>Active</span>
                              </>
                            ) : (
                              <>
                                <EyeOff size={12} />
                                <span>Hidden</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Bottom Info on Image */}
                      <div className="absolute bottom-3 left-3 right-3 text-white">
                        <h4 className="text-base font-black leading-tight drop-shadow-sm">{dest.title}</h4>
                        <p className="text-xs text-white/90 font-semibold flex items-center gap-1 mt-0.5">
                          <MapPin size={12} className="text-emerald-400 flex-shrink-0" />
                          <span>{dest.label}</span>
                        </p>
                      </div>
                    </div>

                    {/* Card Body Details */}
                    <div className="p-4 space-y-3">
                      <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Drop Location</p>
                        <p className="text-xs font-semibold text-slate-700 line-clamp-2 mt-0.5" title={dest.dropLocation || dest.drop}>
                          {dest.dropLocation || dest.drop || 'Address not set'}
                        </p>
                      </div>

                      {dest.description && (
                        <div>
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Note</p>
                          <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{dest.description}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="p-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(dest)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200/80 transition-all"
                    >
                      <Pencil size={13} />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(id)}
                      disabled={isDeleting}
                      className="flex items-center justify-center p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                      title="Delete Destination"
                    >
                      {isDeleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                    </button>
                  </div>
                </Motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-black uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3.5 px-4">Order</th>
                  <th className="py-3.5 px-4">Destination</th>
                  <th className="py-3.5 px-4">City / State</th>
                  <th className="py-3.5 px-4">Code</th>
                  <th className="py-3.5 px-4">Drop Location</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDestinations.map((dest) => {
                  const id = dest._id || dest.id;
                  const isToggling = togglingId === id;
                  const isDeleting = deletingId === id;

                  return (
                    <tr key={id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-500">
                        <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-xs">
                          {dest.order ?? 0}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={dest.image}
                            alt={dest.title}
                            className="w-12 h-12 rounded-xl object-cover border border-slate-200/60 shadow-sm"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=200&q=80';
                            }}
                          />
                          <div>
                            <p className="font-black text-slate-900 text-sm leading-tight">{dest.title}</p>
                            {dest.description && (
                              <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{dest.description}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-700">{dest.label}</td>

                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                          {dest.code}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-xs font-medium text-slate-600 max-w-xs truncate" title={dest.dropLocation || dest.drop}>
                        {dest.dropLocation || dest.drop}
                      </td>

                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(dest)}
                          disabled={isToggling}
                          className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 transition-all ${
                            dest.active !== false
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200'
                          }`}
                        >
                          {isToggling ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <span className={`w-2 h-2 rounded-full ${dest.active !== false ? 'bg-emerald-600' : 'bg-slate-400'}`} />
                          )}
                          <span>{dest.active !== false ? 'Active' : 'Inactive'}</span>
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(dest)}
                            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
                            title="Edit"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(id)}
                            disabled={isDeleting}
                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                            title="Delete"
                          >
                            {isDeleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Destination Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <Motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModal}
              className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm"
            />

            <Motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 my-8"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    {editingDestination ? 'Edit Destination' : 'Add New Tourist Destination'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Fill in destination details for the Explore India section in the Taxi app.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Place / Title */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Destination Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g. Taj Mahal"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>

                  {/* City / State Label */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      City / State <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.label}
                      onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                      placeholder="e.g. Agra"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* 3-letter Code */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Badge Code <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={5}
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="e.g. AGR"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                    <p className="text-[10px] text-slate-400">Short airport or city abbreviation</p>
                  </div>

                  {/* Display Order */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Display Order</label>
                    <input
                      type="number"
                      min={0}
                      value={formData.order}
                      onChange={(e) => setFormData({ ...formData, order: e.target.value })}
                      placeholder="1, 2, 3..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                    <p className="text-[10px] text-slate-400">Lower numbers appear first</p>
                  </div>
                </div>

                {/* Drop Location */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Drop Location / Landmark <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={formData.dropLocation}
                      onChange={(e) => setFormData({ ...formData, dropLocation: e.target.value })}
                      placeholder="e.g. Taj Mahal, Dharmapuri, Forest Colony, Agra, UP"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Auto-selected as destination when user taps this destination card in the app
                  </p>
                </div>

                {/* Image Upload / URL Input */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">
                      Destination Image <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, useUrl: false })}
                        className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                          !formData.useUrl ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        File Upload
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, useUrl: true })}
                        className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                          formData.useUrl ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Image URL
                      </button>
                    </div>
                  </div>

                  {!formData.useUrl ? (
                    <label className="border-2 border-dashed border-slate-200 hover:border-emerald-500/50 bg-slate-50/50 hover:bg-emerald-50/20 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                        <Upload size={18} />
                      </div>
                      <p className="text-xs font-bold text-slate-700">Click to upload or drag & drop</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, WEBP up to 5MB</p>
                    </label>
                  ) : (
                    <input
                      type="url"
                      value={formData.imageUrl}
                      onChange={handleUrlChange}
                      placeholder="https://images.unsplash.com/photo-..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  )}

                  {/* Image Live Preview */}
                  {imagePreview && (
                    <div className="relative rounded-2xl overflow-hidden h-36 bg-slate-100 border border-slate-200">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview(null);
                          setFormData({ ...formData, image: null, imageUrl: '' });
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-all"
                        title="Remove Image"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Description / Highlights (Optional)</label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Short description of this tourist destination..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                  />
                </div>

                {/* Active and Featured Toggles */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 border-slate-300"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-800">Active on App</p>
                      <p className="text-[10px] text-slate-400">Destination will be visible in user app</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isFeatured}
                      onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 border-slate-300"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-800">Featured</p>
                      <p className="text-[10px] text-slate-400">Highlighted destination</p>
                    </div>
                  </label>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-sm transition-all"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl shadow-sm transition-all text-sm"
                  >
                    {saving && <Loader2 size={16} className="animate-spin" />}
                    <span>{saving ? 'Saving...' : editingDestination ? 'Update Destination' : 'Add Destination'}</span>
                  </button>
                </div>
              </form>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <Motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirmId(null)}
              className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm"
            />

            <Motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 border border-slate-200 z-10 text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={26} />
              </div>
              <h3 className="text-lg font-black text-slate-900">Delete Destination?</h3>
              <p className="text-sm text-slate-500 mt-1 mb-6">
                Are you sure you want to remove this destination from Explore India? This action cannot be undone.
              </p>

              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-sm transition-all flex-1"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(deleteConfirmId)}
                  disabled={deletingId === deleteConfirmId}
                  className="flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2.5 rounded-xl transition-all text-sm flex-1 shadow-sm"
                >
                  {deletingId === deleteConfirmId && <Loader2 size={16} className="animate-spin" />}
                  <span>Delete</span>
                </button>
              </div>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExploreIndia;
