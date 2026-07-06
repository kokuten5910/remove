// 背景透過ツール用 Service Worker
// アプリの画面（HTML/CSS/JS）をキャッシュし、オフラインでも起動できるようにします。
// AIモデル本体は @huggingface/transformers が独自にCache Storageへキャッシュするため、
// ここでは扱いません（モデルを一度読み込めばオフラインでも推論可能です）。

const CACHE_NAME = "bg-remove-app-shell-v1";
const APP_SHELL = ["/", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Hugging FaceのモデルダウンロードはSWでは横取りせず、ブラウザ標準の挙動に任せる
  if (request.url.includes("huggingface.co") || request.url.includes("hf.co")) {
    return;
  }

  if (request.method !== "GET") return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response.ok && request.url.startsWith(self.location.origin)) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match("/"));
    })
  );
});
