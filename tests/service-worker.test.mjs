import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");
const origin = "https://triage.test";
function setup(fetcher, entries = new Map()) {
  const key = (request) => new URL(typeof request === "string" ? request : request.url, origin).href;
  const cache = {
    match: async (request) => entries.get(key(request))?.clone(),
    put: async (request, response) => entries.set(key(request), response.clone()),
    addAll: async () => {},
  };
  const context = vm.createContext({
    Request, Response, URL, fetch: fetcher,
    caches: { open: async () => cache, match: cache.match },
    self: { location: { origin }, addEventListener() {}, skipWaiting() {}, clients: { claim() {} } },
  });
  vm.runInContext(source, context);
  return { context, entries };
}
test("a missing JS file never gets replaced with an unrelated cached chunk", async () => {
  const { context } = setup(async () => { throw new Error("offline"); }, new Map([
    [origin + "/assets/other.js", new Response("wrong chunk")],
  ]));
  const result = await context.cachedAssetResponse(new Request(origin + "/assets/missing.js"));
  assert.equal(result.status, 503);
});
test("an incomplete release preserves the last offline document", async () => {
  const { context, entries } = setup(async (request) => {
    if (request.url.endsWith("/")) return new Response('<script src="/assets/new.js"></script>');
    return new Response("missing", { status: 404 });
  }, new Map([[origin + "/", new Response("previous working document")]]));
  await context.navigationResponse(new Request(origin));
  assert.equal(await entries.get(origin + "/").text(), "previous working document");
});
test("HTML returned for JS is not cached", async () => {
  const { context, entries } = setup(async () => new Response("<html>error</html>", {
    headers: { "Content-Type": "text/html" },
  }));
  await context.cachedAssetResponse(new Request(origin + "/assets/new.js"));
  assert.equal(entries.size, 0);
});

test("complete offline shell opens without a network request", async () => {
  let requests = 0;
  const { context } = setup(async () => { requests++; throw new Error("offline"); }, new Map([
    [origin + "/", new Response('<script src="/assets/app.js"></script>')],
    [origin + "/assets/app.js", new Response("app", { headers: { "Content-Type": "application/javascript" } })],
  ]));
  assert.equal(await context.offlineShellReady(), true);
  const response = await context.navigationResponse(new Request(origin));
  assert.equal(response.status, 200);
  assert.match(await response.text(), /app.js/);
  assert.equal(requests, 0);
});

test("offline ready stays false when a required asset is missing", async () => {
  const { context } = setup(async () => { throw new Error("offline"); }, new Map([
    [origin + "/", new Response('<script src="/assets/app.js"></script>')],
  ]));
  assert.equal(await context.offlineShellReady(), false);
});
