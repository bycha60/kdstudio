const V = 'kd-sr-v3';
const ASSETS = ['./', './index.html', './manifest.json', './icon-180.png', './icon-192.png', './icon-512.png'];
const LAME = 'https://cdnjs.cloudflare.com/ajax/libs/lamejs/1.2.1/lame.all.min.js';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(V).then(async c => {
      // Tek tek ekle: bir dosya eksik olsa bile service worker kurulur
      for (const a of [...ASSETS, LAME]) { try { await c.add(a); } catch (err) {} }
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== V).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin && e.request.url !== LAME) return;

  // Sayfa: önce ağ (güncellemeler hemen görünsün), internet yoksa önbellek
  if (e.request.mode === 'navigate' || /\/(index\.html)?$/.test(url.pathname)) {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res && res.ok) { const copy = res.clone(); caches.open(V).then(c => c.put(e.request, copy)); }
        return res;
      }).catch(() => caches.match(e.request).then(h => h || caches.match('./index.html')))
    );
    return;
  }

  // Diğer dosyalar: önce önbellek
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(V).then(c => c.put(e.request, copy)); }
      else if (e.request.url === LAME) { caches.open(V).then(c => c.add(LAME)).catch(() => {}); }
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
