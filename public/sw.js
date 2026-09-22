const CACHE_NAME = "mci-triage-pwa-v23";
const APP_SHELL_ASSETS = [
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

    const assetUrls = [...new Set(buildAssetUrlsFromHtml(await response.clone().text()))];
    await Promise.all(
      assetUrls.map(async (assetUrl) => {
        const assetResponse = await fetch(assetUrl, { cache: "no-store" });
        if (!isValidAsset(new Request(new URL(assetUrl, self.location.origin)), assetResponse)) {
          throw new Error("App asset unavailable");
        }
        await cache.put(assetUrl, assetResponse);
      }),
    );
    await cache.put("/", response);
  } catch {
    // The app shell can still be filled by runtime caching after first load.
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(precacheAppShell().catch(() => undefined));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Existing tabs may still need exact hashed assets from the previous release.
  event.waitUntil(self.clients.claim());
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

async function offlineShellReady() {
  const cache = await caches.open(CACHE_NAME);
  const shell = await cache.match("/");
  if (!shell) return false;
  const assets = buildAssetUrlsFromHtml(await shell.text());
  if (!assets.length) return false;
  const available = await Promise.all(assets.map(async (url) => {
    const response = await cache.match(url);
    return response && isValidAsset(new Request(new URL(url, self.location.origin)), response);
  }));
  return available.every(Boolean);
}

self.addEventListener("message", (event) => {
  if (event.data?.type !== "CHECK_OFFLINE_READY") return;
  event.waitUntil((async () => {
    if (!(await offlineShellReady())) await precacheAppShell().catch(() => undefined);
    event.ports[0]?.postMessage({ ready: await offlineShellReady() });
  })());
});

async function navigationResponse(request, event) {
  if (await offlineShellReady()) {
    const cache = await caches.open(CACHE_NAME);
    // Refresh without delaying a usable offline score sheet.
    if (event) event.waitUntil(refreshNavigation(request));
    return cache.match("/");
  }
  return refreshNavigation(request);
}

async function refreshNavigation(request) {
  try {
    const response = await fetch(request, { cache: "no-store" });
    if (!response.ok) throw new Error("Navigation unavailable");
    // Publish the offline document only after its matching assets are available.
    const assets = buildAssetUrlsFromHtml(await response.clone().text());
    try {
      await Promise.all(assets.map(async (url) => {
        const asset = new Request(new URL(url, self.location.origin));
        const result = await fetch(asset);
        if (!isValidAsset(asset, result)) throw new Error("Asset unavailable");
        await putInCache(asset, result);
      }));
      await putInCache(request, response);
      await putInCache(new Request(new URL("/", self.location.origin)), response);
    } catch { /* Preserve the last usable offline document. */ }
    return response;
  } catch {
    const cache = await caches.open(CACHE_NAME);
    return (
      (await cache.match(request)) ||
      (await cache.match("/")) ||
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

  if (cached && isValidAsset(request, cached)) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (!isValidAsset(request, response)) return response;

    await putInCache(request, response);
    return response;
  } catch {
    return new Response("Offline asset unavailable.", {
      headers: { "Content-Type": "text/plain" },
      status: 503,
    });
  }
}

function isValidAsset(request, response) {
  const pathname = new URL(request.url).pathname;
  const type = response.headers.get("content-type") || "";
  return canCache(response) &&
    (!pathname.endsWith(".js") || /javascript/.test(type)) &&
    (!pathname.endsWith(".css") || /text\/css/.test(type));
}

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(navigationResponse(request, event));
    return;
  }

  if (isSameOrigin(request) && !isApiRequest(request)) {
    event.respondWith(cachedAssetResponse(request));
  }
});
