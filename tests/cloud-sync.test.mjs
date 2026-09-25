import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import ts from "typescript";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../api/triage-sync.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function server(fetcher, configured = true) {
  const context = vm.createContext({ exports: {}, fetch: fetcher, AbortSignal,
    process: { env: configured ? { SUPABASE_URL: "https://example.test", SUPABASE_SERVICE_ROLE_KEY: "server-secret", TRIAGE_SYNC_TOKEN: "device-key" } : {} },
  });
  vm.runInContext(compiled, context);
  return async (method, body, token = "device-key") => {
    const result = {};
    const response = {
      setHeader() {}, status(code) { result.status = code; return this; },
      json(body) { result.body = body; }, end() {},
    };
    await context.exports.default({ method, headers: { authorization: `Bearer ${token}` }, body }, response);
    return result;
  };
}
test("unconfigured sync reports failure instead of claiming records were uploaded", async () => {
  const request = server(() => { throw new Error("must not call database"); }, false);
  const result = await request("POST", { sessions: [] });
  assert.equal(result.status, 503);
  assert.equal(result.body.enabled, false);
});
test("invalid device key cannot read training records", async () => {
  const request = server(() => { throw new Error("must not call database"); });
  assert.equal((await request("GET", undefined, "wrong")).status, 401);
});
test("pull reads every page rather than silently truncating training records", async () => {
  const request = server(async (url) => {
    if (url.includes("triage_app_state")) return Response.json([]);
    const offset = Number(new URL(url).searchParams.get("offset"));
    return Response.json(Array.from({ length: offset === 0 ? 500 : 3 }, (_, index) => ({ payload: { id: `${offset + index}` } })));
  });
  const result = await request("GET");
  assert.equal(result.status, 200);
  assert.equal(result.body.sessions.length, 503);
});
test("upload deduplicates sheets and preserves their edit timestamps", async () => {
  let uploaded;
  const request = server(async (_, init) => { uploaded = JSON.parse(init.body); return new Response(null, { status: 201 }); });
  const result = await request("POST", { sessions: [
    { id: "sheet", members: [], updatedAt: "2026-09-20T00:00:00.000Z" },
    { id: "sheet", members: [], updatedAt: "2026-09-21T00:00:00.000Z" },
  ] });
  assert.equal(result.status, 200);
  assert.equal(uploaded.length, 1);
  assert.equal(uploaded[0].updated_at, "2026-09-21T00:00:00.000Z");
});
