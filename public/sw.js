const CACHE_NAME = "mci-triage-pwa-v4";
const APP_SHELL_ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL_ASSETS))
      .catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      ),
  );
  self.clients.claim();
});

function isSameOrigin(request) {
  return new URL(request.url).origin === self.location.origin;
}

function canCache(response) {
  return (
    response &&
    response.status === 200 &&
    (response.type === "basic" || response.type === "default")
  );
}

async function putInCache(request, response) {
  if (!isSameOrigin(request) || !canCache(response)) {
    return;
  }

  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response.clone());
}

async function navigationResponse(request) {
  try {
    const response = await fetch(request);
    await putInCache(request, response);
    await putInCache(new Request("/"), response);
    return response;
  } catch {
    return (
      (await caches.match(request)) ||
      (await caches.match("/")) ||
      new Response("MCI Triage is offline and the app shell is not cached yet.", {
        headers: { "Content-Type": "text/plain" },
        status: 503,
      })
    );
  }
}

async function cachedAssetResponse(request) {
  const cached = await caches.match(request);

  if (cached) {
    fetch(request)
      .then((response) => putInCache(request, response))
      .catch(() => undefined);
    return cached;
  }

  try {
    const response = await fetch(request);
    await putInCache(request, response);
    return response;
  } catch {
    return new Response("Offline asset unavailable.", {
      headers: { "Content-Type": "text/plain" },
      status: 503,
    });
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(navigationResponse(request));
    return;
  }

  if (isSameOrigin(request)) {
    event.respondWith(cachedAssetResponse(request));
  }
});
