// Versão do cache — aumente o número sempre que publicar uma nova versão do app
const CACHE = 'etiquetafacil-v6';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/libs/quagga.min.js',
  '/libs/html5-qrcode.min.js'
];

// Só guarda respostas que deram certo (200). Antes, um erro 404 também era guardado
// e continuava aparecendo no celular mesmo depois de o arquivo ser enviado.
function guardar(request, response) {
  if (response && response.ok && response.type === 'basic') {
    const copia = response.clone();
    caches.open(CACHE).then(c => c.put(request, copia));
  }
  return response;
}

self.addEventListener('install', (e) => {
  e.waitUntil(
    // Cada arquivo é guardado separadamente: se um faltar, o app continua instalando
    caches.open(CACHE).then(c => Promise.all(ASSETS.map(a =>
      fetch(a, { cache: 'reload' }).then(r => { if (r.ok) return c.put(a, r); }).catch(() => {})
    ))).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  // Apaga caches de versões antigas
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // Endereços de outros sites (ex.: biblioteca pela internet): o navegador cuida sozinho
  if (url.origin !== self.location.origin) return;

  // Servidor de formulários e instalador do Windows: nunca vão para o cache
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/.netlify/') || url.pathname.startsWith('/downloads/')) return;

  // Página do app (HTML): tenta a rede primeiro para sempre pegar a versão mais nova;
  // se estiver sem internet, usa a cópia guardada
  const ehPagina = e.request.mode === 'navigate' ||
    url.pathname === '/' || url.pathname.endsWith('.html');
  if (ehPagina) {
    e.respondWith(
      fetch(e.request).then(r => guardar(e.request, r))
        .catch(() => caches.match(e.request).then(c => c || caches.match('/index.html')))
    );
    return;
  }

  // Demais arquivos (ícones, manifest, bibliotecas de leitura): cache primeiro
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(r => guardar(e.request, r)))
  );
});
