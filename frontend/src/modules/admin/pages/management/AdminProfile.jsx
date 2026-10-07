import React, { useMemo } from 'react';
import { Mail, Phone, Shield, UserRound } from 'lucide-react';
import AdminPageHeader from '../../components/ui/AdminPageHeader';

const readAdminInfo = () => {
  try {
    return JSON.parse(window.localStorage.getItem('adminInfo') || 'null') || {};
  } catch {
    return {};
  }
};

const Row = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4">
    <div className="rounded-xl bg-slate-100 p-3 text-slate-600">
      <Icon size={18} />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
      <p className="truncate text-sm font-semibold text-gray-900">{value || '--'}</p>
    </div>
  </div>
);

const AdminProfile = () => {
  const admin = useMemo(readAdminInfo, []);
  const isSubadmin = admin.admin_type === 'subadmin';
  const permissions = Array.isArray(admin.permissions) ? admin.permissions : [];

  return (
    <div className="p-6">
      <AdminPageHeader module="Account" page="Profile" title="My Profile" showGuide={false} />
      <div className="mb-6 flex items-center gap-4 rounded-3xl bg-slate-900 p-6 text-white">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-2xl font-black">
          {(admin.name || 'A').charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-lg font-black">{admin.name || 'Admin'}</p>
          <p className="text-xs font-semibold uppercase tracking-widest text-white/60">
            {isSubadmin ? admin.role || 'Sub Admin' : 'Master Authority'}
          </p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Row icon={UserRound} label="Name" value={admin.name} />
        <Row icon={Mail} label="Email" value={admin.email} />
        <Row icon={Phone} label="Phone" value={admin.phone || admin.mobile} />
        <Row icon={Shield} label="Access" value={isSubadmin ? `${permissions.length} permissions` : 'Full access'} />
      </div>
    </div>
  );
};

export default AdminProfile;
