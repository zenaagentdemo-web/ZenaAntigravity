/**
 * Register service worker for PWA offline support
 * Uses custom service worker with advanced caching strategies
 */
export function registerServiceWorker() {
  // Unregister service worker in development to prevent caching issues with HMR
  if (import.meta.env.DEV) {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
          console.log('[SW] Unregistered service worker for development');
        }
      });
    }
    return;
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw-custom.js')
        .then((registration) => {
          console.log('[SW] Service Worker registered:', registration.scope);

          // Check for updates periodically
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000); // Check every hour

          // Handle updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New service worker available
                  console.log('[SW] New service worker available');

                  // Notify user about update
                  if (confirm('A new version of Zena is available. Reload to update?')) {
                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                    window.location.reload();
                  }
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('[SW] Service Worker registration failed:', error);
        });

      // Handle controller change (new service worker activated)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[SW] Service Worker controller changed');
        window.location.reload();
      });
    });
  }
}

/**
 * Unregister service worker (useful for development/testing)
 */
export async function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
    }
  }
}

/**
 * Send message to service worker
 */
export async function sendMessageToSW(message: any): Promise<void> {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage(message);
  }
}

/**
 * Request immediate cache of specific URLs
 */
export async function cacheUrls(urls: string[]): Promise<void> {
  await sendMessageToSW({
    type: 'CACHE_URLS',
    urls,
  });
}

/**
 * Clear all caches
 */
export async function clearAllCaches(): Promise<void> {
  await sendMessageToSW({
    type: 'CLEAR_CACHE',
  });
}
