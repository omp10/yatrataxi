/* eslint-disable no-undef */

const searchParams = new URL(self.location.href).searchParams;
const firebaseConfig = {
  apiKey: searchParams.get('apiKey') || '',
  authDomain: searchParams.get('authDomain') || '',
  projectId: searchParams.get('projectId') || '',
  storageBucket: searchParams.get('storageBucket') || '',
  messagingSenderId: searchParams.get('messagingSenderId') || '',
  appId: searchParams.get('appId') || '',
};

const hasFirebaseConfig = Object.values(firebaseConfig).every((value) => String(value || '').trim());

if (hasFirebaseConfig) {
  importScripts('https://www.gstatic.com/firebasejs/11.0.1/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/11.0.1/firebase-messaging-compat.js');

  firebase.initializeApp(firebaseConfig);

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const messageData = payload?.data || {};
    const notificationTitle = payload?.notification?.title || 'New ride request';
    const isRideRequest = messageData.type === 'ride_request';
    const clickUrl = isRideRequest && messageData.rideId
      ? `/taxi/driver/home?incomingRideId=${messageData.rideId}`
      : (messageData.url || '/taxi/driver/home');

    const notificationOptions = {
      body: payload?.notification?.body || (isRideRequest ? 'A new booking is waiting for your response.' : ''),
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      image: payload?.notification?.image || '',
      tag: isRideRequest && messageData.rideId ? `ride_request_${messageData.rideId}` : 'general',
      renotify: isRideRequest,
      requireInteraction: isRideRequest,
      vibrate: isRideRequest ? [300, 100, 300, 100, 500] : [200, 100, 200],
      data: {
        ...messageData,
        url: clickUrl,
      },
    };

    if (isRideRequest) {
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        clientList.forEach((client) => client.postMessage({
          type: 'driver_ride_request',
          payload: messageData,
        }));
      });
    }

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const messageData = event.notification?.data || {};
  const isRideRequest = messageData.type === 'ride_request';
  const targetUrl = messageData.url || (isRideRequest && messageData.rideId ? `/taxi/driver/home?incomingRideId=${messageData.rideId}` : '/taxi/driver/home');

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if (isRideRequest) {
            client.postMessage({
              type: 'driver_ride_request',
              payload: messageData,
            });
          }
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }

      return undefined;
    }),
  );
});
