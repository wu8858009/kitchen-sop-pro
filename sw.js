// 廚房 SOP Pro — Service Worker
// 版本控制：更新此號碼以強制刷新快取
const VERSION = 'ksop-v2.3.0';

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon.svg',
];

// ── 安裝：預先快取核心資源 ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => {
      return cache.addAll(CORE_ASSETS);
    })
  );
  self.skipWaiting();
});

// ── 啟動：清除舊版快取 ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== VERSION)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── 攔截請求：Cache-First 策略 ──
self.addEventListener('fetch', (event) => {
  // 只處理 GET 請求
  if (event.request.method !== 'GET') return;

  // 跳過瀏覽器擴充功能請求
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        // 背景更新快取（Stale-While-Revalidate）
        const fetchPromise = fetch(event.request)
          .then((network) => {
            if (network && network.status === 200) {
              caches.open(VERSION).then((cache) => cache.put(event.request, network.clone()));
            }
            return network;
          })
          .catch(() => cached);

        return cached;
      }

      // 快取未命中：從網路取得並快取
      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type === 'opaque') {
            return response;
          }
          const clone = response.clone();
          caches.open(VERSION).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          // 離線時返回主頁（App Shell 模式）
          return caches.match('./index.html');
        });
    })
  );
});

// ── 接收主頁訊息 ──
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
