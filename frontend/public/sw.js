const CACHE_NAME = 'karaoke-processor-v1.0.0';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/favicon.ico'
];

// Install service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version if found
        if (response) {
          return response;
        }

        // Clone the request
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then((response) => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              // Only cache GET requests and avoid caching API calls
              if (event.request.method === 'GET' && !event.request.url.includes('/api/')) {
                cache.put(event.request, responseToCache);
              }
            });

          return response;
        }).catch(() => {
          // If network fails, try to serve from cache
          return caches.match('/');
        });
      })
  );
});

// Activate service worker and clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Handle background sync for file processing
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-process') {
    event.waitUntil(
      // Process pending audio files
      processBackgroundTasks()
    );
  }
});

// Handle push notifications (for future features)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Audio processing completed!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Library',
        icon: '/icons/library-96x96.png'
      },
      {
        action: 'close',
        title: 'Close notification',
        icon: '/icons/close-96x96.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Karaoke Processor', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/library')
    );
  } else if (event.action === 'close') {
    // Just close the notification
  } else {
    // Default action - open app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message handling from main app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background processing function
async function processBackgroundTasks() {
  try {
    // Check IndexedDB for pending processing tasks
    const db = await openDatabase();
    const pendingTasks = await getPendingTasks(db);
    
    for (const task of pendingTasks) {
      // Process each pending task
      await processTask(task);
    }
  } catch (error) {
    console.error('Background processing error:', error);
  }
}

// Helper functions for IndexedDB operations in service worker
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('KaraokeProcessorDB', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function getPendingTasks(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['processingQueue'], 'readonly');
    const store = transaction.objectStore('processingQueue');
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function processTask(task) {
  // Implement background task processing logic here
  console.log('Processing task:', task);
}