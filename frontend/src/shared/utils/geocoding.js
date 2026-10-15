// Address <-> coordinate helpers on top of the Google Maps JS API. The calling
// component must have loaded the API (useAppGoogleMapsLoader) first.

const getGeocoder = () => {
  const maps = window.google?.maps;
  if (!maps?.Geocoder) {
    throw new Error('Maps is still loading. Please try again in a moment.');
  }
  return new maps.Geocoder();
};

// Resolves to [lng, lat], the order the booking APIs expect.
export const geocodeAddress = (address) => new Promise((resolve, reject) => {
  const query = String(address || '').trim();
  if (!query) {
    reject(new Error('Address is required'));
    return;
  }

  let geocoder;
  try {
    geocoder = getGeocoder();
  } catch (error) {
    reject(error);
    return;
  }

  geocoder.geocode({ address: query, region: 'in' }, (results, status) => {
    const location = status === 'OK' ? results?.[0]?.geometry?.location : null;
    if (!location) {
      reject(new Error(`Could not find "${query}" on the map. Please check the address.`));
      return;
    }
    resolve([location.lng(), location.lat()]);
  });
});

export const reverseGeocode = ([lng, lat]) => new Promise((resolve) => {
  try {
    getGeocoder().geocode({ location: { lat, lng } }, (results, status) => {
      resolve(status === 'OK' ? results?.[0]?.formatted_address || '' : '');
    });
  } catch {
    resolve('');
  }
});

export const getCurrentPositionCoords = () => new Promise((resolve, reject) => {
  if (!navigator.geolocation) {
    reject(new Error('Location is not available on this device'));
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => resolve([position.coords.longitude, position.coords.latitude]),
    () => reject(new Error('Allow location access or type your pickup address')),
    { enableHighAccuracy: true, timeout: 15000 },
  );
});
