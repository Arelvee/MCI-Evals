type ApiRequest = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
};

type ApiResponse = {
  setHeader: (name: string, value: string) => void;
  status: (statusCode: number) => ApiResponse;
  json: (body: unknown) => void;
  end: (body?: string) => void;
};

type TriageSessionPayload = {
  id?: unknown;
  day?: unknown;
  evaluationDate?: unknown;
  evaluatorName?: unknown;
  teamName?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

type TriageSessionRow = {
  id: string;
  day: string;
  evaluation_date: string | null;
  evaluator_name: string;
  team_name: string;
  payload: TriageSessionPayload;
  created_at: string;
  updated_at: string;
  synced_at: string;
};

const SCOREBOOK_STATE_KEY = "scorebook_overrides";

function envValue(name: string) {
  return process.env[name]?.trim() ?? "";
}

function requiredConfig() {
  return ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "TRIAGE_SYNC_TOKEN"].filter(
    (name) => !envValue(name),
  );
}

function headerValue(request: ApiRequest, name: string) {
  const value = request.headers[name] ?? request.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value ?? "";
}

function bearerToken(request: ApiRequest) {
  return headerValue(request, "authorization").replace(/^Bearer\s+/i, "").trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseBody(body: unknown) {
  if (typeof body !== "string") {
    return isRecord(body) ? body : {};
  }

  try {
    const parsed = JSON.parse(body) as unknown;
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function validDateString(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : value;
}

function isoTimestamp(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

function sessionRow(value: unknown): TriageSessionRow | null {
  if (!isRecord(value) || typeof value.id !== "string" || !Array.isArray(value.members)) {
    return null;
  }

  const now = new Date().toISOString();
  const payload = value as TriageSessionPayload;
  const updatedAt = isoTimestamp(payload.updatedAt, now);
  const createdAt = isoTimestamp(payload.createdAt, updatedAt);

  return {
    id: value.id,
    day: typeof payload.day === "string" ? payload.day : "day1",
    evaluation_date: validDateString(payload.evaluationDate),
    evaluator_name: typeof payload.evaluatorName === "string" ? payload.evaluatorName : "",
    team_name: typeof payload.teamName === "string" ? payload.teamName : "",
    payload,
    created_at: createdAt,
    updated_at: updatedAt,
    synced_at: now,
  };
}

function supabaseUrl(path: string) {
  return `${envValue("SUPABASE_URL").replace(/\/$/, "")}/rest/v1/${path}`;
}

async function supabaseFetch(path: string, init: RequestInit = {}) {
  const key = envValue("SUPABASE_SERVICE_ROLE_KEY");
  const response = await fetch(supabaseUrl(path), {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || `Supabase request failed with ${response.status}`);
  }

  return response;
}

async function readCloudData() {
  const [sessionsResponse, scorebookResponse] = await Promise.all([
    supabaseFetch("triage_sessions?select=payload&order=updated_at.desc"),
    supabaseFetch(
      `triage_app_state?key=eq.${SCOREBOOK_STATE_KEY}&select=payload&limit=1`,
    ),
  ]);
  const sessionRows = (await sessionsResponse.json()) as Array<{ payload?: unknown }>;
  const scorebookRows = (await scorebookResponse.json()) as Array<{ payload?: unknown }>;

  return {
    sessions: sessionRows.map((row) => row.payload).filter(Boolean),
    scorebookOverrides: isRecord(scorebookRows[0]?.payload)
      ? scorebookRows[0].payload
      : {},
  };
}

async function upsertSessions(sessions: unknown[]) {
  const rows = sessions.map(sessionRow).filter((row): row is TriageSessionRow => Boolean(row));
  if (!rows.length) {
    return 0;
  }

  await supabaseFetch("triage_sessions?on_conflict=id", {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  });

  return rows.length;
}

async function upsertScorebook(scorebookOverrides: unknown) {
  if (!isRecord(scorebookOverrides)) {
    return false;
  }

  await supabaseFetch("triage_app_state?on_conflict=key", {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({
      key: SCOREBOOK_STATE_KEY,
      payload: scorebookOverrides,
      updated_at: new Date().toISOString(),
    }),
  });

  return true;
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader("Cache-Control", "no-store");

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  const missing = requiredConfig();
  if (missing.length) {
    response.status(503).json({
      enabled: false,
      message: "Supabase cloud sync is not configured on the server yet.",
      missing,
    });
    return;
  }

  if (bearerToken(request) !== envValue("TRIAGE_SYNC_TOKEN")) {
    response.status(401).json({ message: "Cloud sync key did not match." });
    return;
  }

  try {
    if (request.method === "GET") {
      response.status(200).json({ enabled: true, ...(await readCloudData()) });
      return;
    }

    if (request.method === "POST") {
      const body = parseBody(request.body);
      const sessions = Array.isArray(body.sessions) ? body.sessions : [];
      const saved = await upsertSessions(sessions);
      const scorebookSaved = await upsertScorebook(body.scorebookOverrides);
      response.status(200).json({
        enabled: true,
        saved,
        scorebookSaved,
      });
      return;
    }

    response.status(405).json({ message: "Method not allowed." });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Cloud sync failed.",
    });
  }
}
