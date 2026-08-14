import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the triage app shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>MCI Triage Evaluation<\/title>/i);
  assert.match(html, /Loading score sheet/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|SkeletonPreview/);
  assert.doesNotMatch(html, /react-loading-skeleton/);
});

test("ships Day 1, Day 2, and Day 3 scoring with PWA assets", async () => {
  const [app, layout, manifest, serviceWorker, packageJson] = await Promise.all([
    readFile(new URL("../app/TriageApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"),
    readFile(new URL("../public/sw.js", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(app, /DAY_ONE_VICTIMS/);
  assert.match(app, /DAY_TWO_VICTIMS/);
  assert.match(app, /DAY_THREE_VICTIMS/);
  assert.match(app, /T20/);
  assert.match(app, /RED if airway opened; BLACK if not attempted/);
  assert.match(app, /Secondary Triage-T Set/);
  assert.match(app, /Grand Simulation E-Set/);
  assert.match(app, /methods: \["START", "SAVE", "SIEVE", "SORT"\]/);
  assert.match(app, /YELLOW at 10 min arrival/);
  assert.match(app, /GREEN at 10 min arrival/);
  assert.match(app, /SCOREBOOK_KEY/);
  assert.match(app, /Quiz and Simulation Scorebook/);
  assert.match(app, /Export Scorebook/);
  assert.match(app, /Top 1-3 Scorers/);
  assert.match(app, /Monthly Analytics/);
  assert.match(app, /Mean Final Score/);
  assert.match(app, /SAVE/);
  assert.match(app, /SORT/);
  assert.match(app, /Add Member/);
  assert.match(app, /workspace-layout/);
  assert.match(app, /control-panel/);
  assert.match(app, /member-picker-grid/);
  assert.match(app, /1 point each correct triage tag/);
  assert.match(app, /removeMember/);
  assert.match(app, /Install this app/);
  assert.match(app, /MciTriageLogo/);
  assert.match(app, /Install App/);
  assert.match(app, /Offline ready/);
  assert.match(app, /Offline mode/);
  assert.match(app, /Saved sheets and analytics stay private/);
  assert.match(app, /Export CSV/);
  assert.match(layout, /manifest: "\/manifest.webmanifest"/);
  assert.match(manifest, /Offline-ready Day 1 to Day 3 MCI triage score sheets/);
  assert.match(manifest, /"display": "standalone"/);
  assert.match(manifest, /"src": "\/icons\/icon-192\.png"/);
  assert.match(serviceWorker, /CACHE_NAME = "mci-triage-pwa-v6"/);
  assert.match(serviceWorker, /APP_SHELL_ASSETS/);
  assert.match(serviceWorker, /navigationResponse/);
  assert.match(packageJson, /"lucide-react"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.doesNotMatch(app, /_sites-preview|codex-preview/);
  assert.ok(root);
});
