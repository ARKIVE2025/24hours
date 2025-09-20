// Set a new cache name to ensure a fresh cache on activation
const CACHE_NAME = '24-hours-v2';
const urlsToCache = [
    './',
    'index.html',
    'manifest.json',
    'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rubik:wght@300;400;500&display=swap',
    'https://upload.wikimedia.org/wikipedia/commons/e/ec/Timeless_PWA_Icon.svg'
];

// Installation: Cache core app shell files
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Caching app shell');
                return cache.addAll(urlsToCache);
            })
            .catch(err => console.error('Service Worker: Failed to cache on install', err))
    );
});

// Activation: Clean up old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.filter((cacheName) => cacheName !== CACHE_NAME)
                    .map((cacheName) => {
                        console.log('Service Worker: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch: Serve from cache first, then fall back to network
self.addEventListener('fetch', (event) => {
    // Only intercept requests for the app's files
    const url = new URL(event.request.url);
    if (urlsToCache.includes(url.pathname) || event.request.url.startsWith('https://fonts.googleapis.com')) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) {
                    console.log('Service Worker: Serving from cache:', event.request.url);
                    return cachedResponse;
                }
                console.log('Service Worker: Fetching from network:', event.request.url);
                return fetch(event.request).then((networkResponse) => {
                    return caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                }).catch(() => {
                    // Handle offline case for requests not in cache
                    console.log('Service Worker: Fetch failed, serving offline page if available.');
                    // You can serve a custom offline page here
                    // return caches.match('/offline.html');
                });
            })
        );
    }
});

// Push Notifications (Optional, but good practice for PWAs)
self.addEventListener('push', (event) => {
    const data = event.data.json();
    console.log('Service Worker: Push received:', data);
    const options = {
        body: data.body,
        icon: data.icon,
        badge: data.badge || 'https://upload.wikimedia.org/wikipedia/commons/e/ec/Timeless_PWA_Icon.svg'
    };
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    console.log('Service Worker: Notification clicked');
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                if (clientList.length > 0) {
                    let client = clientList[0];
                    for (let i = 0; i < clientList.length; i++) {
                        if (clientList[i].focused) {
                            client = clientList[i];
                        }
                    }
                    return client.focus();
                }
                return clients.openWindow('/index.html');
            })
    );
});

// New feature: Background Sync for offline data submission
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-data') {
        console.log('Service Worker: Performing background sync...');
        event.waitUntil(
            // In a real application, this is where you would send saved data to your server.
            // For this example, we'll just log a success message.
            new Promise((resolve, reject) => {
                console.log('Service Worker: Data submitted successfully.');
                resolve();
            })
        );
    }
});
