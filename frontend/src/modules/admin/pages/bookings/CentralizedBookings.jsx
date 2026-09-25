import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  RefreshCw,
  Eye,
  FileSpreadsheet,
  Printer,
  ChevronRight,
  ChevronLeft,
  Calendar,
  IndianRupee,
  Layers,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Briefcase,
  User,
  Phone,
  Mail,
  MapPin,
  Car,
  Bus,
  Share2,
  Navigation,
  ShieldCheck,
  CreditCard,
  Building2,
  X,
  ExternalLink,
  ArrowRight,
  TrendingUp,
  Percent,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminService } from '../../services/adminService';

// Service categorization tabs
const SERVICE_TABS = [
  { id: 'all', label: 'All Services', icon: Layers, badgeColor: 'bg-slate-100 text-slate-800' },
  { id: 'taxi', label: 'City Cabs', icon: Car, badgeColor: 'bg-blue-50 text-blue-700' },
  { id: 'pooling', label: 'Shared Taxi', icon: Share2, badgeColor: 'bg-emerald-50 text-emerald-700' },
  { id: 'bus', label: 'Intercity Bus', icon: Bus, badgeColor: 'bg-purple-50 text-purple-700' },
  { id: 'rental', label: 'Rentals', icon: Navigation, badgeColor: 'bg-amber-50 text-amber-700' },
  { id: 'spiritual', label: 'Spiritual Yatra', icon: Building2, badgeColor: 'bg-orange-50 text-orange-700' },
  { id: 'airport', label: 'Airport Cabs', icon: Navigation, badgeColor: 'bg-cyan-50 text-cyan-700' },
  { id: 'oneway', label: 'One-Way Outstation', icon: ArrowRight, badgeColor: 'bg-indigo-50 text-indigo-700' },
  { id: 'parcel', label: 'Parcel Delivery', icon: Briefcase, badgeColor: 'bg-rose-50 text-rose-700' },
];

const STATUS_FILTERS = [
  { id: 'all', label: 'All Statuses' },
  { id: 'ongoing', label: 'Ongoing', color: 'bg-blue-500' },
  { id: 'confirmed', label: 'Confirmed', color: 'bg-emerald-500' },
  { id: 'completed', label: 'Completed', color: 'bg-teal-600' },
  { id: 'cancelled', label: 'Cancelled', color: 'bg-rose-500' },
  { id: 'pending', label: 'Pending', color: 'bg-amber-500' },
];

const SOURCE_FILTERS = [
  { id: 'all', label: 'All Sources' },
  { id: 'user', label: 'Direct App' },
  { id: 'agent', label: 'Agent Desk' },
];

const DATE_PRESETS = [
  { id: 'all', label: 'All Time' },
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
];

const STATUS_BADGES = {
  ongoing: { bg: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500', text: 'On Trip' },
  confirmed: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', text: 'Confirmed' },
  completed: { bg: 'bg-teal-50 text-teal-700 border-teal-200', dot: 'bg-teal-600', text: 'Completed' },
  cancelled: { bg: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500', text: 'Cancelled' },
  pending: { bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', text: 'Pending' },
};

const formatDate = (isoString) => {
  if (!isoString) return '--';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '--';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatCurrency = (val) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
};

export default function CentralizedBookings() {
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState({
    totalBookings: 0,
    todayBookings: 0,
    totalRevenue: 0,
    totalAgentCommission: 0,
    activeOngoing: 0,
    completedCount: 0,
    cancelledCount: 0,
    breakdown: {},
  });

  // Filters
  const [serviceType, setServiceType] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [datePreset, setDatePreset] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [total, setTotal] = useState(0);

  // Selected Booking Drawer & Status Modal
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState('confirmed');
  const [adminNote, setAdminNote] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Printable receipt state
  const [receiptBooking, setReceiptBooking] = useState(null);
  const receiptRef = useRef(null);

  // Fetch KPI Stats
  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await adminService.getCentralizedBookingStats();
      const payload = res?.data || res;
      if (payload && (payload.totalBookings !== undefined || payload.breakdown)) {
        setStats(payload);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Fetch Bookings
  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);

      let startDate = null;
      let endDate = null;
      const now = new Date();

      if (datePreset === 'today') {
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        startDate = todayStart.toISOString();
      } else if (datePreset === 'week') {
        const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        startDate = weekStart.toISOString();
      } else if (datePreset === 'month') {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate = monthStart.toISOString();
      }

      const params = {
        serviceType,
        status: statusFilter,
        source: sourceFilter,
        search,
        page,
        limit,
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
      };

      const res = await adminService.getCentralizedBookings(params);
      const payload = res?.data || res;
      if (payload) {
        setBookings(Array.isArray(payload.results) ? payload.results : []);
        setTotal(typeof payload.total === 'number' ? payload.total : 0);
      }
    } catch (err) {
      console.error('Failed to load centralized bookings:', err);
      toast.error(err?.response?.data?.message || err?.message || 'Failed to fetch bookings');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [serviceType, statusFilter, sourceFilter, datePreset, search, page, limit]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Handle status update
  const handleUpdateStatus = async () => {
    if (!selectedBooking) return;
    try {
      setUpdatingStatus(true);
      const res = await adminService.updateCentralizedBookingStatus(
        selectedBooking.serviceType,
        selectedBooking.rawId || selectedBooking.id,
        targetStatus,
        adminNote
      );

      const isSuccess = res?.success || res?.data?.success;
      if (isSuccess) {
        toast.success(res?.message || res?.data?.message || 'Status updated successfully');
        setStatusModalOpen(false);
        setAdminNote('');
        fetchBookings();
        fetchStats();
        // Update currently inspected booking
        setSelectedBooking((prev) => (prev ? { ...prev, status: targetStatus } : null));
      }
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error(err?.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!bookings.length) {
      toast.error('No bookings to export');
      return;
    }

    const headers = [
      'Booking Code',
      'Service Type',
      'Source',
      'Customer Name',
      'Customer Phone',
      'Driver/Provider',
      'Pickup Route',
      'Drop Route',
      'Fare (INR)',
      'Payment Status',
      'Booking Status',
      'Agent Name',
      'Agent Commission',
      'Created At',
    ];

    const rows = bookings.map((b) => [
      `"${b.bookingCode}"`,
      `"${b.serviceLabel}"`,
      `"${b.source === 'agent' ? 'Travel Agent' : 'Direct User'}"`,
      `"${b.customer?.name || ''}"`,
      `"${b.customer?.phone || ''}"`,
      `"${b.driverOrProvider?.name || ''}"`,
      `"${(b.route?.pickup || '').replace(/"/g, '""')}"`,
      `"${(b.route?.drop || '').replace(/"/g, '""')}"`,
      b.fare || 0,
      `"${b.paymentStatus || ''}"`,
      `"${b.status || ''}"`,
      `"${b.agentMeta?.agentName || ''}"`,
      b.agentMeta?.commissionAmount || 0,
      `"${formatDate(b.createdAt)}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Centralized_Bookings_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Bookings exported to CSV');
  };

  // Print slip handler
  const handlePrintSlip = (booking) => {
    setReceiptBooking(booking);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-6 lg:p-8 font-sans space-y-6">
      {/* 1. Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            <span>Admin</span>
            <ChevronRight size={13} className="text-slate-300" />
            <span>Operations</span>
            <ChevronRight size={13} className="text-slate-300" />
            <span className="text-indigo-600">Centralized Bookings</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Layers size={22} />
            </span>
            All Platform Bookings
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Centralized management hub for all 9 transport services, trip dispatches, and travel agent commissions.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => {
              fetchBookings();
              fetchStats();
              toast.success('Data refreshed');
            }}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            <FileSpreadsheet size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {/* 2. Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Bookings */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Bookings</span>
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Layers size={18} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">
              {statsLoading ? '...' : Number(stats.totalBookings || 0).toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <span className="font-semibold text-emerald-600">+{stats.todayBookings || 0} today</span> across all services
            </div>
          </div>
        </div>

        {/* Card 2: Active / Ongoing */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active & On-Trip</span>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Clock size={18} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-blue-600">
              {statsLoading ? '...' : Number(stats.activeOngoing || 0).toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Live active rides & assigned trips</div>
          </div>
        </div>

        {/* Card 3: Completed */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-teal-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Completed Trips</span>
            <span className="p-2 bg-teal-50 text-teal-600 rounded-xl">
              <CheckCircle2 size={18} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-teal-600">
              {statsLoading ? '...' : Number(stats.completedCount || 0).toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Successfully fulfilled bookings</div>
          </div>
        </div>

        {/* Card 4: Gross Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gross Booking Value</span>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <IndianRupee size={18} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">
              {statsLoading ? '...' : formatCurrency(stats.totalRevenue)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Total revenue collected & billed</div>
          </div>
        </div>

        {/* Card 5: Agent Commission */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-purple-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Agent Commission</span>
            <span className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <Percent size={18} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-purple-600">
              {statsLoading ? '...' : formatCurrency(stats.totalAgentCommission)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Earned by partner travel agents</div>
          </div>
        </div>
      </div>

      {/* 3. Main Data Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Service Type Tab Bar */}
        <div className="border-b border-slate-100 px-4 pt-3 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-2 min-w-max pb-3">
            {SERVICE_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = serviceType === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setServiceType(tab.id);
                    setPage(1);
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon size={14} className={isActive ? 'text-indigo-400' : 'text-slate-400'} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/40 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Left search */}
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search code, customer name, phone, driver, route..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Right Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status selector */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              {STATUS_FILTERS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>

            {/* Source selector */}
            <select
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              {SOURCE_FILTERS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>

            {/* Date range selector */}
            <select
              value={datePreset}
              onChange={(e) => {
                setDatePreset(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              {DATE_PRESETS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>

            {/* Page size limit */}
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value={10}>10 per page</option>
              <option value={15}>15 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Booking Info</th>
                <th className="py-3.5 px-4">Service</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Driver / Fleet</th>
                <th className="py-3.5 px-4">Route & Schedule</th>
                <th className="py-3.5 px-4">Fare & Commission</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw size={24} className="animate-spin text-indigo-500" />
                      <span className="text-xs font-semibold text-slate-500">Loading bookings across services...</span>
                    </div>
                  </td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <Layers size={24} />
                      </div>
                      <span className="text-sm font-bold text-slate-700">No bookings found</span>
                      <span className="text-xs text-slate-400 text-center">
                        Try modifying your filters, selecting a different service type, or clearing search criteria.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                bookings.map((booking) => {
                  const statusConfig = STATUS_BADGES[booking.status] || {
                    bg: 'bg-slate-100 text-slate-700',
                    dot: 'bg-slate-400',
                    text: booking.status,
                  };
                  const isAgent = booking.source === 'agent';

                  return (
                    <tr
                      key={booking.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-default"
                    >
                      {/* Booking Info */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                          <span>{booking.serviceIcon}</span>
                          <span>{booking.bookingCode}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {formatDate(booking.createdAt)}
                        </div>
                        <div className="mt-1">
                          {isAgent ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              <Briefcase size={10} /> Agent Desk
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                              <User size={10} /> Direct App
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Service Category */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{booking.serviceLabel}</div>
                        {booking.vehicleType && (
                          <div className="text-[11px] text-slate-500 capitalize">{booking.vehicleType}</div>
                        )}
                        {booking.seatsBooked && (
                          <div className="text-[10px] text-slate-400">{booking.seatsBooked} Seat(s) Booked</div>
                        )}
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 flex items-center gap-1">
                          <span>{booking.customer?.name || 'Customer'}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                          <Phone size={11} className="text-slate-400" />
                          <span>{booking.customer?.phone || '--'}</span>
                        </div>
                      </td>

                      {/* Driver / Fleet */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">
                          {booking.driverOrProvider?.name || 'Unassigned / Operator'}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {booking.driverOrProvider?.vehicle || booking.driverOrProvider?.type || '--'}
                        </div>
                        {booking.driverOrProvider?.phone && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {booking.driverOrProvider.phone}
                          </div>
                        )}
                      </td>

                      {/* Route & Schedule */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="text-slate-800 font-medium truncate" title={booking.route?.pickup}>
                          <span className="text-emerald-600 font-bold mr-1">●</span>
                          {booking.route?.pickup || 'Pickup'}
                        </div>
                        <div className="text-slate-500 text-[11px] truncate mt-0.5" title={booking.route?.drop}>
                          <span className="text-rose-500 font-bold mr-1">▼</span>
                          {booking.route?.drop || 'Destination'}
                        </div>
                        {booking.route?.distance && (
                          <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
                            {booking.route.distance}
                          </div>
                        )}
                      </td>

                      {/* Fare & Commission */}
                      <td className="py-3.5 px-4">
                        <div className="font-black text-slate-900 text-sm">
                          {formatCurrency(booking.fare)}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 mt-0.5">
                          <span className="uppercase">{booking.paymentMethod}</span>
                          <span>•</span>
                          <span
                            className={
                              booking.paymentStatus === 'PAID'
                                ? 'text-emerald-600'
                                : booking.paymentStatus === 'REFUNDED'
                                ? 'text-rose-500'
                                : 'text-amber-500'
                            }
                          >
                            {booking.paymentStatus}
                          </span>
                        </div>
                        {isAgent && booking.agentMeta?.commissionAmount > 0 && (
                          <div className="text-[10px] font-bold text-purple-600 mt-1 flex items-center gap-0.5">
                            <span>Comm: {formatCurrency(booking.agentMeta.commissionAmount)}</span>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusConfig.bg}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                          {statusConfig.text}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedBooking(booking)}
                            title="Inspect Details"
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handlePrintSlip(booking)}
                            title="Print Receipt"
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Printer size={16} />
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

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing <span className="font-bold text-slate-800">{bookings.length}</span> of{' '}
            <span className="font-bold text-slate-800">{total}</span> total bookings
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-3 py-1 font-bold text-slate-800 bg-slate-100 rounded-lg">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Slide-Over Inspection Drawer */}
      <AnimatePresence>
        {selectedBooking && (
          <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedBooking(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            />

            {/* Slide-over panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-xl bg-white shadow-2xl z-10 h-full flex flex-col overflow-y-auto"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur z-20">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{selectedBooking.serviceIcon}</span>
                  <div>
                    <h2 className="text-lg font-black text-slate-900">{selectedBooking.bookingCode}</h2>
                    <p className="text-xs text-slate-500">{selectedBooking.serviceLabel}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6 flex-1">
                {/* Status Bar with Quick Actions */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Current Status</div>
                    <div className="text-sm font-black text-slate-800 capitalize mt-0.5">
                      {selectedBooking.status}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setTargetStatus(selectedBooking.status);
                        setStatusModalOpen(true);
                      }}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm cursor-pointer"
                    >
                      Update Status
                    </button>
                    <button
                      onClick={() => handlePrintSlip(selectedBooking)}
                      className="p-1.5 border border-slate-200 hover:bg-white text-slate-700 rounded-xl transition-colors cursor-pointer"
                      title="Print Slip"
                    >
                      <Printer size={16} />
                    </button>
                  </div>
                </div>

                {/* Customer Details Card */}
                <div className="p-4 bg-white rounded-2xl border border-slate-200/80 space-y-3">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <User size={14} className="text-indigo-600" /> Customer Information
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="text-slate-400">Name</div>
                      <div className="font-bold text-slate-800 mt-0.5">
                        {selectedBooking.customer?.name || 'Customer'}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">Phone</div>
                      <div className="font-mono font-bold text-slate-800 mt-0.5">
                        {selectedBooking.customer?.phone || '--'}
                      </div>
                    </div>
                    {selectedBooking.customer?.email && (
                      <div className="col-span-2">
                        <div className="text-slate-400">Email</div>
                        <div className="text-slate-800 mt-0.5">{selectedBooking.customer.email}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Driver / Fleet Operator Card */}
                <div className="p-4 bg-white rounded-2xl border border-slate-200/80 space-y-3">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Car size={14} className="text-emerald-600" /> Driver / Fleet Provider
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="text-slate-400">Provider / Driver Name</div>
                      <div className="font-bold text-slate-800 mt-0.5">
                        {selectedBooking.driverOrProvider?.name || 'Unassigned / Platform Operator'}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">Vehicle / Model</div>
                      <div className="font-bold text-slate-800 mt-0.5">
                        {selectedBooking.driverOrProvider?.vehicle || selectedBooking.driverOrProvider?.type || '--'}
                      </div>
                    </div>
                    {selectedBooking.driverOrProvider?.phone && (
                      <div>
                        <div className="text-slate-400">Contact Number</div>
                        <div className="font-mono font-bold text-slate-800 mt-0.5">
                          {selectedBooking.driverOrProvider.phone}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Route & Journey Card */}
                <div className="p-4 bg-white rounded-2xl border border-slate-200/80 space-y-3">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Navigation size={14} className="text-blue-600" /> Route & Schedule
                  </div>
                  <div className="space-y-3 text-xs">
                    <div>
                      <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                        <span>●</span> Pickup Location
                      </div>
                      <div className="text-slate-800 font-semibold mt-0.5 pl-3">
                        {selectedBooking.route?.pickup || '--'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-rose-500 flex items-center gap-1">
                        <span>▼</span> Destination / Drop Location
                      </div>
                      <div className="text-slate-800 font-semibold mt-0.5 pl-3">
                        {selectedBooking.route?.drop || '--'}
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-slate-500 text-[11px]">
                      <span>Distance: <strong>{selectedBooking.route?.distance || '--'}</strong></span>
                      <span>Scheduled: <strong>{formatDate(selectedBooking.scheduledAt)}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Agent Desk Meta (if booked through agent) */}
                {selectedBooking.source === 'agent' && (
                  <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-200 space-y-3">
                    <div className="text-xs font-bold text-purple-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Briefcase size={14} /> Travel Agent Desk Booking
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <div className="text-purple-600/80">Agent Name</div>
                        <div className="font-bold text-purple-950 mt-0.5">
                          {selectedBooking.agentMeta?.agentName || 'Agent'}
                        </div>
                      </div>
                      <div>
                        <div className="text-purple-600/80">Commission Earned</div>
                        <div className="font-bold text-purple-950 text-sm mt-0.5">
                          {formatCurrency(selectedBooking.agentMeta?.commissionAmount || 0)}
                        </div>
                      </div>
                      <div>
                        <div className="text-purple-600/80">Commission Status</div>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {selectedBooking.agentMeta?.commissionStatus || 'CREDITED'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Financial Breakdown Card */}
                <div className="p-4 bg-white rounded-2xl border border-slate-200/80 space-y-2">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard size={14} className="text-amber-500" /> Fare Breakdown
                  </div>
                  <div className="flex justify-between items-center text-xs py-1 border-b border-slate-100">
                    <span className="text-slate-500">Gross Trip Fare</span>
                    <span className="font-bold text-slate-800">{formatCurrency(selectedBooking.fare)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs py-1 border-b border-slate-100">
                    <span className="text-slate-500">Payment Method</span>
                    <span className="font-bold text-slate-800 uppercase">{selectedBooking.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs py-1 border-b border-slate-100">
                    <span className="text-slate-500">Payment Status</span>
                    <span className="font-bold text-emerald-600">{selectedBooking.paymentStatus}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm pt-2 font-black text-slate-900">
                    <span>Total Amount</span>
                    <span className="text-base text-indigo-600">{formatCurrency(selectedBooking.fare)}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. Status Update Dialog Modal */}
      {statusModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200"
          >
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-base">Update Booking Status</h3>
              <button
                onClick={() => setStatusModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Select New Status
                </label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="confirmed">Confirmed</option>
                  <option value="ongoing">Ongoing (On-Trip)</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Admin Note / Reason (Optional)
                </label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Enter remarks or update reason for audit trail..."
                  rows={3}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
              <button
                onClick={() => setStatusModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateStatus}
                disabled={updatingStatus}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                {updatingStatus && <RefreshCw size={13} className="animate-spin" />}
                Confirm Update
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* 6. Hidden Printable Receipt Slip */}
      {receiptBooking && (
        <div className="hidden print:block fixed inset-0 bg-white p-8 font-mono text-black text-xs z-[9999]" ref={receiptRef}>
          <div className="text-center pb-4 border-b border-black">
            <h2 className="text-xl font-bold uppercase">YATRADESK TRANSPORT</h2>
            <p className="text-[10px]">Official Booking Receipt & Invoice</p>
          </div>

          <div className="py-4 space-y-2 border-b border-black">
            <div className="flex justify-between">
              <span>Booking Code:</span>
              <span className="font-bold">{receiptBooking.bookingCode}</span>
            </div>
            <div className="flex justify-between">
              <span>Service:</span>
              <span>{receiptBooking.serviceLabel}</span>
            </div>
            <div className="flex justify-between">
              <span>Date:</span>
              <span>{formatDate(receiptBooking.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span>Booking Source:</span>
              <span>{receiptBooking.source === 'agent' ? 'Travel Agent Desk' : 'Direct Customer'}</span>
            </div>
          </div>

          <div className="py-4 space-y-2 border-b border-black">
            <div>
              <span className="font-bold">Customer:</span> {receiptBooking.customer?.name} ({receiptBooking.customer?.phone})
            </div>
            <div>
              <span className="font-bold">Driver/Fleet:</span> {receiptBooking.driverOrProvider?.name || 'Unassigned'}
            </div>
            <div>
              <span className="font-bold">Pickup:</span> {receiptBooking.route?.pickup}
            </div>
            <div>
              <span className="font-bold">Drop:</span> {receiptBooking.route?.drop}
            </div>
          </div>

          <div className="py-4 space-y-1 text-sm border-b border-black">
            <div className="flex justify-between font-bold">
              <span>Total Fare:</span>
              <span>INR {receiptBooking.fare}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Payment Mode:</span>
              <span>{receiptBooking.paymentMethod} ({receiptBooking.paymentStatus})</span>
            </div>
          </div>

          <div className="pt-4 text-center text-[10px] text-gray-500">
            Thank you for choosing YatraDesk. Safe Travels!
          </div>
        </div>
      )}
    </div>
  );
}
