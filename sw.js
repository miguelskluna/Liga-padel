
                        <!DOCTYPE html>
                        <html lang="en">
                        <head>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body {
                  background-color: white; /* Ensure the iframe has a white background */
                }

                
              </style>
                        </head>
                        <body>
                            

              <script>
                              // Service Worker para Liga Padel Pro PWA
// sw.js - Service Worker File

const CACHE_NAME = 'padel-pro-v1';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';
const OFFLINE_PAGE = '/offline.html';

// Recursos estáticos para caché
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png'
];

// Recursos dinámicos para caché
const DYNAMIC_ASSETS = [
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
  'https://image.qwenlm.ai'
];

// ============================================
// INSTALACIÓN DEL SERVICE WORKER
// ============================================
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Cacheando recursos estáticos');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Instalación completada');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Error en instalación:', error);
      })
  );
});

// ============================================
// ACTIVACIÓN DEL SERVICE WORKER
// ============================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando Service Worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('[SW] Eliminando caché antigua:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Activación completada');
        return self.clients.claim();
      })
  );
});

// ============================================
// ESTRATEGIA DE FETCH: CACHE FIRST, NETWORK FALLBACK
// ============================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar solicitudes que no sean GET
  if (request.method !== 'GET') {
    return;
  }

  // Ignorar solicitudes de extensiones, etc.
  if (!url.protocol.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Actualización en segundo plano
          event.waitUntil(updateCache(request));
          return cachedResponse;
        }

        // Si no está en caché, hacer fetch de red
        return fetchAndCache(request);
      })
      .catch(() => {
        // Si falla todo, mostrar página offline para navegación
        if (request.mode === 'navigate') {
          return caches.match(OFFLINE_PAGE);
        }
      })
  );
});

// ============================================
// FUNCIÓN PARA ACTUALIZAR CACHÉ EN SEGUNDO PLANO
// ============================================
async function updateCache(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(DYNAMIC_CACHE);
    
    // Solo cachear respuestas exitosas
    if (response.ok) {
      cache.put(request, response.clone());
    }
  } catch (error) {
    console.log('[SW] Error actualizando caché:', error);
  }
}

// ============================================
// FUNCIÓN PARA HACER FETCH Y CACHEAR
// ============================================
async function fetchAndCache(request) {
  try {
    const response = await fetch(request);
    
    // Solo cachear respuestas exitosas
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Error en fetch:', error);
    throw error;
  }
}

// ============================================
// MANEJO DE MENSAJES DESDE LA APLICACIÓN
// ============================================
self.addEventListener('message', (event) => {
  // Skip waiting para actualizar el SW
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Cache URLs específicas
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(DYNAMIC_CACHE)
        .then((cache) => cache.addAll(event.data.urls))
    );
  }
  
  // Limpiar caché completa
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys()
        .then((cacheNames) => Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        ))
        .then(() => self.clients.matchAll())
        .then((clients) => {
          clients.forEach((client) => client.navigate(client.url));
        })
    );
  }
});

// ============================================
// NOTIFICACIONES PUSH
// ============================================
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  
  const options = {
    body: data.body || 'Nueva notificación de Liga Padel Pro',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
     {
      dateOfArrival: Date.now(),
      primaryKey: data.primaryKey || 1
    },
    actions: [
      { action: 'view', title: 'Ver', icon: '/icons/icon-96x96.png' },
      { action: 'close', title: 'Cerrar', icon: '/icons/icon-96x96.png' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Liga Padel Pro', options)
  );
});

// ============================================
// MANEJO DE CLICS EN NOTIFICACIONES
// ============================================
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// ============================================
// BACKGROUND SYNC PARA ACCIONES OFFLINE
// ============================================
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-match-data') {
    event.waitUntil(syncMatchData());
  }
  
  if (event.tag === 'sync-player-stats') {
    event.waitUntil(syncPlayerStats());
  }
});

async function syncMatchData() {
  console.log('[SW] Sincronizando datos de partidos...');
  // Lógica para sincronizar datos de partidos cuando hay conexión
  const pendingMatches = await getPendingMatches();
  for (const match of pendingMatches) {
    try {
      await fetch('/api/matches', {
        method: 'POST',
        body: JSON.stringify(match)
      });
    } catch (error) {
      console.log('[SW] Error sincronizando partido:', error);
    }
  }
}

async function syncPlayerStats() {
  console.log('[SW] Sincronizando estadísticas de jugadores...');
  // Lógica para sincronizar estadísticas cuando hay conexión
}

async function getPendingMatches() {
  // Implementar lógica para obtener partidos pendientes de IndexedDB
  return [];
}

// ============================================
// PERIODIC BACKGROUND SYNC (SI ESTÁ DISPONIBLE)
// ============================================
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-stats') {
    event.waitUntil(updateStats());
  }
  
  if (event.tag === 'update-leaderboard') {
    event.waitUntil(updateLeaderboard());
  }
});

async function updateStats() {
  console.log('[SW] Actualizando estadísticas...');
  // Actualizar estadísticas en segundo plano
}

async function updateLeaderboard() {
  console.log('[SW] Actualizando clasificación...');
  // Actualizar tabla de posiciones en segundo plano
}

// ============================================
// MANEJO DE INSTALACIÓN DE LA PWA
// ============================================
self.addEventListener('beforeinstallprompt', (event) => {
  console.log('[SW] Evento beforeinstallprompt disparado');
  // El evento se maneja desde la aplicación principal
});

// ============================================
// LIMPIEZA DE CACHÉ AUTOMÁTICA
// ============================================
async function cleanupCache() {
  const cacheNames = await caches.keys();
  const currentCaches = [STATIC_CACHE, DYNAMIC_CACHE];
  
  for (const cacheName of cacheNames) {
    if (!currentCaches.includes(cacheName)) {
      await caches.delete(cacheName);
      console.log('[SW] Caché eliminada:', cacheName);
    }
  }
}

// ============================================
// VERIFICACIÓN DE CONEXIÓN
// ============================================
self.addEventListener('online', (event) => {
  console.log('[SW] Conexión restaurada');
  // Trigger sync cuando se restaura la conexión
  if ('sync' in self.registration) {
    self.registration.sync.register('sync-match-data');
  }
});

self.addEventListener('offline', (event) => {
  console.log('[SW] Sin conexión - Modo offline activado');
});

// ============================================
// MENSAJE DE INICIO PARA CLIENTES
// ============================================
self.clients.matchAll().then((clients) => {
  clients.forEach((client) => {
    client.postMessage({
      type: 'SW_ACTIVE',
      message: 'Service Worker activo y listo'
    });
  });
});

console.log('[SW] Service Worker cargado correctamente');


              </script>
                        </body>
                        </html>
                    
