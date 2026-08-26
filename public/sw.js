const CACHE_NAME = "mci-triage-pwa-v20";
const APP_SHELL_ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/brand/upm-drrmh-logo.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

function buildAssetUrlsFromHtml(html) {
  return Array.from(html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))[^"]*"/g))
    .map((match) => new URL(match[1], self.location.origin).pathname)
    .filter((asset) => asset.startsWith("/assets/"));
}

async function precacheAppShell() {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(APP_SHELL_ASSETS);

  try {
    const response = await fetch("/", { cache: "no-store" });
    if (!canCache(response)) {
      return;
    }

    await cache.put("/", response.clone());
    const assetUrls = [...new Set(buildAssetUrlsFromHtml(await response.text()))];
    await Promise.all(
      assetUrls.map(async (assetUrl) => {
        const assetResponse = await fetch(assetUrl, { cache: "no-store" });
        if (canCache(assetResponse)) {
          await cache.put(assetUrl, assetResponse);
        }
      }),
    );
  } catch {
    // The app shell can still be filled by runtime caching after first load.
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(precacheAppShell().catch(() => undefined));
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

function isApiRequest(request) {
  return new URL(request.url).pathname.startsWith("/api/");
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
    if (!canCache(response)) {
      return (await cachedBuildAssetFallback(request)) || response;
    }

    await putInCache(request, response);
    return response;
  } catch {
    return (await cachedBuildAssetFallback(request)) || new Response("Offline asset unavailable.", {
      headers: { "Content-Type": "text/plain" },
      status: 503,
    });
  }
}

async function cachedBuildAssetFallback(request) {
  const pathname = new URL(request.url).pathname;
  const extension = pathname.endsWith(".js") ? ".js" : pathname.endsWith(".css") ? ".css" : "";
  if (!pathname.startsWith("/assets/") || !extension) {
    return null;
  }

  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  const replacement = keys.find((key) => {
    const cachedPathname = new URL(key.url).pathname;
    return cachedPathname.startsWith("/assets/") && cachedPathname.endsWith(extension);
  });
  return replacement ? cache.match(replacement) : null;
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

  if (isSameOrigin(request) && !isApiRequest(request)) {
    event.respondWith(cachedAssetResponse(request));
  }
});
