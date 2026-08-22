const APP_CACHE_PREFIX = 'scout-trainer-';
const DEVELOPMENT_RELOAD_KEY = 'scout-trainer:pwa-cleanup-reload';

async function clearDevelopmentPwa(): Promise<void> {
  const wasControlled = navigator.serviceWorker.controller !== null;
  const registrations = await navigator.serviceWorker.getRegistrations();

  await Promise.all(registrations.map((registration) => registration.unregister()));

  if ('caches' in window) {
    const cacheNames = await window.caches.keys();
    await Promise.all(
      cacheNames
        .filter((cacheName) => cacheName.startsWith(APP_CACHE_PREFIX))
        .map((cacheName) => window.caches.delete(cacheName)),
    );
  }

  if (wasControlled && sessionStorage.getItem(DEVELOPMENT_RELOAD_KEY) !== 'done') {
    sessionStorage.setItem(DEVELOPMENT_RELOAD_KEY, 'done');
    window.location.reload();
    return;
  }

  sessionStorage.removeItem(DEVELOPMENT_RELOAD_KEY);
}

export function registerServiceWorker(): void {
  if (window.location.protocol === 'file:') return;
  if (!('serviceWorker' in navigator)) return;

  if (import.meta.env.DEV) {
    void clearDevelopmentPwa().catch((error: unknown) => {
      console.warn('Não foi possível limpar o cache PWA de desenvolvimento.', error);
    });
    return;
  }

  sessionStorage.removeItem(DEVELOPMENT_RELOAD_KEY);
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
  });
}
