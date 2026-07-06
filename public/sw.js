// 背景透過ツール用 Service Worker
// アプリの画面（HTML/CSS/JS）をキャッシュし、オフラインでも起動できるようにします。
// AIモデル本体は @huggingface/transformers が独自にCache Storageへキャッシュするため、
// ここでは扱いません（モデルを一度読み込めばオフラインでも推論可能です）。
//
// 方針: 「オンライン時は常に最新版を取得し、オフライン時のみキャッシュを使う」
// （network-first）。これによりコードを更新した際に、古い画面のまま
// 固定されてしまう問題を防ぎます。
//
// ※ コードを更新するたびに、このCACHE_NAMEの末尾の数字を1つ増やしてください。
//    そうすることでService Worker自体の更新が確実にブラウザへ伝わります。
const CACHE_NAME = "bg-remove-app-shell-v2";
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
  if (!request.url.startsWith(self.location.origin)) return;

  // network-first: まずネットワークから最新を取得し、取れた場合はキャッシュも更新
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() =>
        // オフライン時のみキャッシュを使う
        caches.match(request).then((cached) => cached || caches.match("/"))
      )
  );
});
