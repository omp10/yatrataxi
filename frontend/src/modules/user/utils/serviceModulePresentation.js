const normalizeValue = (value) => String(value || '').trim().toLowerCase();

export const isServiceModuleActive = (module) => {
  const value = module?.active;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  return ['1', 'true', 'yes', 'on', 'enabled'].includes(normalizeValue(value));
};

export const getActiveServiceModules = (modules = []) => (
  (Array.isArray(modules) ? modules : [])
    .filter(isServiceModuleActive)
    .sort((first, second) => Number(first?.order_by || 0) - Number(second?.order_by || 0))
);

export const getServiceModulePath = (module = {}) => {
  const transportType = normalizeValue(module.transport_type);
  const serviceType = normalizeValue(module.service_type);
  const name = normalizeValue(module.name);
  const identity = `${transportType} ${serviceType} ${name}`;

  if (identity.includes('delivery') || identity.includes('parcel')) return '/taxi/user/parcel/type';
  if (identity.includes('rental')) return '/taxi/user/rental';
  if (identity.includes('outstation') || identity.includes('intercity')) return '/taxi/user/intercity';
  if (identity.includes('pooling')) return '/taxi/user/pooling';
  if (identity.includes('sharing') || identity.includes('shared')) return '/taxi/user/cab-sharing';
  if (identity.includes('bus')) return '/taxi/user/bus';
  if (identity.includes('tour')) return '/taxi/user/tours';
  if (name.includes('cab') || name.includes('taxi')) return '/taxi/user/cab';

  return '/taxi/user/ride/select-location';
};

export const getServiceModuleButtonText = (module = {}) => {
  const identity = `${normalizeValue(module.transport_type)} ${normalizeValue(module.service_type)} ${normalizeValue(module.name)}`;
  if (identity.includes('delivery') || identity.includes('parcel')) return 'Send Now';
  if (identity.includes('rental')) return 'Rent Now';
  return 'Book Now';
};

export const getServiceModuleDescription = (module = {}) => (
  String(module.short_description || module.description || '').trim()
  || `Book ${String(module.name || 'this service').trim()} quickly.`
);
