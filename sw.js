// StudyLeague service worker - build 8.33 (offline app shell)
const CACHE = 'studyleague-v52';
const ASSETS = ['./', './newindex.html', './newversion.json', './manifest.webmanifest', './icon-192.png', './icon-512.png', './studyleague-logo.png'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return; // never cache Firebase
  if (url.pathname.indexOf('version.json') >= 0) { e.respondWith(fetch(e.request)); return; } // always fresh
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then((r) => {
      const copy = r.clone();
      caches.open(CACHE).then((c) => c.put('./newindex.html', copy));
      return r;
    }).catch(() => caches.match('./newindex.html')));
    return;
  }
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((r) => {
    const copy = r.clone();
    caches.open(CACHE).then((c) => c.put(e.request, copy));
    return r;
  })));
});
