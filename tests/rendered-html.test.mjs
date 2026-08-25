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
  const [app, layout, api, manifest, serviceWorker, packageJson] = await Promise.all([
    readFile(new URL("../app/TriageApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../api/triage-sync.ts", import.meta.url), "utf8"),
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
  assert.match(app, /label: "Day 3 E-Set"/);
  assert.match(app, /Grand Simulation E-Set/);
  assert.match(app, /id: "E1"/);
  assert.match(app, /id: "E18"/);
  assert.doesNotMatch(app, /const DAY_THREE_VICTIMS[\s\S]*id: "T18"[\s\S]*const DAY_CONFIGS/);
  assert.match(app, /const victimIds = Array\.from/);
  assert.match(app, /migrateDayThreeLegacyAnswers/);
  assert.match(app, /Day 3 E-Set Quiz/);
  assert.match(app, /mci-triage-current-draft-v2/);
  assert.match(app, /score sheet ready with 0 scores/);
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
  assert.match(app, /Export Sheet/);
  assert.match(app, /Clear All/);
  assert.match(app, /clearActiveMember/);
  assert.match(app, /bottom-quick-actions/);
  assert.match(app, /Clear all selected tags and timers/);
  assert.match(app, /\{summary\.label\} Score/);
  assert.match(app, /Current sheet/);
  assert.match(app, /Latest saved sheet/);
  assert.match(app, /day-score-summary/);
  assert.match(app, /Scoring menu/);
  assert.match(app, /method-tabs/);
  assert.match(app, /victim-range-menu/);
  assert.match(app, /victim-groups/);
  assert.match(app, /tagged/);
  assert.match(app, /workspace-layout/);
  assert.match(app, /control-panel/);
  assert.match(app, /member-picker-grid/);
  assert.match(app, /1 point each correct triage tag/);
  assert.match(app, /removeMember/);
  assert.match(app, /Install this app/);
  assert.match(app, /MciTriageLogo/);
  assert.match(app, /Install App/);
  assert.match(app, /Live online/);
  assert.match(app, /manifest\.webmanifest\?live=/);
  assert.match(app, /const isOpen = event\.currentTarget\.open/);
  assert.match(app, /parseStoredJson/);
  assert.match(app, /isSessionLike/);
  assert.match(app, /LEGACY_DRAFT_KEYS/);
  assert.match(app, /mci-triage-current-draft-v1/);
  assert.match(app, /sessionHasData/);
  assert.match(app, /freezeRunningTimers/);
  assert.match(app, /Check Admin saved records/);
  assert.match(app, /Supabase Cloud Sync/);
  assert.match(app, /Sync Key/);
  assert.match(app, /Pull Records/);
  assert.match(app, /syncCloudNow/);
  assert.match(app, /CLOUD_SYNC_KEY/);
  assert.match(app, /Training Calendar/);
  assert.match(app, /calendarCells/);
  assert.match(app, /selectedTrainingDate/);
  assert.match(app, /Fast Score Entry/);
  assert.match(app, /ScoreStepper/);
  assert.match(app, /score-preset-button/);
  assert.match(app, /Full Score Table/);
  assert.match(app, /Offline mode/);
  assert.match(app, /Saved sheets and analytics stay private/);
  assert.match(app, /Export CSV/);
  assert.match(layout, /manifest: "\/manifest.webmanifest"/);
  assert.match(manifest, /Offline-ready Day 1 to Day 3 MCI triage score sheets/);
  assert.match(manifest, /"display": "standalone"/);
  assert.match(manifest, /"src": "\/icons\/icon-192\.png"/);
  assert.match(serviceWorker, /CACHE_NAME = "mci-triage-pwa-v15"/);
  assert.match(serviceWorker, /isApiRequest/);
  assert.match(serviceWorker, /!isApiRequest\(request\)/);
  assert.match(serviceWorker, /precacheAppShell/);
  assert.match(serviceWorker, /cachedBuildAssetFallback/);
  assert.match(serviceWorker, /APP_SHELL_ASSETS/);
  assert.match(serviceWorker, /navigationResponse/);
  assert.match(api, /SUPABASE_URL/);
  assert.match(api, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(api, /TRIAGE_SYNC_TOKEN/);
  assert.match(api, /triage_sessions\?on_conflict=id/);
  assert.match(api, /triage_app_state\?on_conflict=key/);
  assert.match(api, /resolution=merge-duplicates/);
  assert.match(api, /Cloud sync key did not match/);
  assert.match(packageJson, /"lucide-react"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.doesNotMatch(app, /_sites-preview|codex-preview/);
  assert.ok(root);
});
