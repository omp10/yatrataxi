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
  if (module?.path) return module.path;
  const transportType = normalizeValue(module.transport_type);
  const serviceType = normalizeValue(module.service_type);
  const iconType = normalizeValue(module.icon_type);
  const name = normalizeValue(module.name);
  const identity = `${transportType} ${serviceType} ${iconType} ${name}`;

  if (identity.includes('delivery') || identity.includes('parcel')) return '/taxi/user/parcel/type';
  if (serviceType === 'rental' || identity.includes('rental')) return '/taxi/user/rental';
  if (serviceType === 'outstation' || identity.includes('outstation') || identity.includes('intercity')) return '/taxi/user/intercity';
  if (serviceType === 'pooling' || identity.includes('pooling')) return '/taxi/user/pooling';
  if (identity.includes('sharing') || identity.includes('shared')) return '/taxi/user/cab-sharing';
  if (serviceType === 'bus' || identity.includes('bus')) return '/taxi/user/bus';
  if (
    serviceType === 'spiritual' ||
    iconType === 'spiritual' ||
    identity.includes('spiritual') ||
    identity.includes('spritual') ||
    identity.includes('pilgrimage') ||
    identity.includes('darshan') ||
    identity.includes('temple')
  ) {
    return '/taxi/user/cab/spiritual';
  }
  if (identity.includes('tour')) return '/taxi/user/tours';

  // Only open the multi-service packages hub if explicitly defined as a hub or special package
  if (name.includes('cab hub') || name.includes('special cab') || name.includes('taxi packages') || name.includes('auto & cab')) {
    return '/taxi/user/cab';
  }

  // Normal rides (e.g., "Book cab", "Taxi", "Auto", "Bike Taxi") open direct location selection
  return '/taxi/user/ride/select-location';
};

export const getServiceModuleButtonText = (module = {}) => {
  const identity = `${normalizeValue(module.transport_type)} ${normalizeValue(module.service_type)} ${normalizeValue(module.icon_type)} ${normalizeValue(module.name)}`;
  if (identity.includes('delivery') || identity.includes('parcel')) return 'Send Now';
  if (identity.includes('rental')) return 'Rent Now';
  if (identity.includes('bus')) return 'Book Bus';
  if (
    identity.includes('spiritual') ||
    identity.includes('spritual') ||
    identity.includes('pilgrimage') ||
    identity.includes('darshan') ||
    identity.includes('temple')
  ) {
    return 'Book Pilgrimage';
  }
  return 'Book Now';
};

export const getServiceModuleDescription = (module = {}) => (
  String(module.short_description || module.description || '').trim()
  || `Book ${String(module.name || 'this service').trim()} quickly.`
);

export const isEligibleSpiritualVehicle = (v) => {
  if (!v) return false;
  const icon = String(v.icon_types || v.iconType || v.icon_types_for || v.icon || '').toLowerCase();
  const name = String(v.name || '').toLowerCase();
  const transport = String(v.transport_type || v.transportType || '').toLowerCase();
  const dispatch = String(v.dispatch_type || v.dispatchType || '').toLowerCase();
  const deliveryCat = String(v.delivery_category || '').toLowerCase();
  const desc = String(v.description || v.short_description || v.desc || '').toLowerCase();

  // 1. Exclude two-wheelers and three-wheelers (Auto rickshaws, e-rickshaws, bikes)
  if (
    icon === 'auto' ||
    icon === 'bike' ||
    name.includes('auto') ||
    name.includes('rickshaw') ||
    name.includes('bike') ||
    name.includes('scooter') ||
    desc.includes('rickshaw')
  ) {
    return false;
  }

  // 2. Exclude delivery / cargo / goods vehicles
  if (
    transport === 'delivery' ||
    dispatch === 'delivery' ||
    deliveryCat ||
    name.includes('delivery') ||
    name.includes('cargo') ||
    name.includes('truck') ||
    desc.includes('delivery') ||
    desc.includes('cargo')
  ) {
    return false;
  }

  // 3. Passenger vehicles must have at least 4 seats
  const cap = Number(v.capacity || v.maxSeats || 0);
  if (cap > 0 && cap < 4) {
    return false;
  }

  return true;
};

