"use client";

import {
  BarChart3,
  CalendarDays,
  Download,
  FileDown,
  Lock,
  Play,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  Square,
  TimerReset,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Method = "START" | "SIEVE";
type Tag = "GREEN" | "YELLOW" | "RED" | "BLACK";
type Answer = Tag | "";
type DayKey = "day1" | "day2" | "day3";

type TimerState = {
  elapsedMs: number;
  startedAt: number | null;
};

type MethodRecord = {
  answers: Record<string, Answer>;
  timer: TimerState;
};

type MemberRecord = {
  id: string;
  name: string;
  START: MethodRecord;
  SIEVE: MethodRecord;
};

type EvaluationSession = {
  id: string;
  day: DayKey;
  evaluatorName: string;
  evaluationDate: string;
  teamName: string;
  members: MemberRecord[];
  createdAt: string;
  updatedAt: string;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const METHODS: Method[] = ["START", "SIEVE"];
const TAGS: Tag[] = ["GREEN", "YELLOW", "RED", "BLACK"];
const SESSION_KEY = "mci-triage-sessions-v1";
const DRAFT_KEY = "mci-triage-current-draft-v1";
const ADMIN_KEY = "mci-triage-admin-passcode-v1";

const TAG_LABELS: Record<Tag, string> = {
  GREEN: "Green",
  YELLOW: "Yellow",
  RED: "Red",
  BLACK: "Black",
};

const DAYS: { key: DayKey; label: string; ready: boolean }[] = [
  { key: "day1", label: "Day 1", ready: true },
  { key: "day2", label: "Day 2", ready: false },
  { key: "day3", label: "Day 3", ready: false },
];

const DAY_ONE_VICTIMS: {
  id: string;
  correct: Record<Method, { tags: Tag[]; note?: string }>;
}[] = [
  { id: "T1", correct: { START: { tags: ["GREEN"] }, SIEVE: { tags: ["GREEN"] } } },
  { id: "T2", correct: { START: { tags: ["YELLOW"] }, SIEVE: { tags: ["YELLOW"] } } },
  { id: "T3", correct: { START: { tags: ["GREEN"] }, SIEVE: { tags: ["GREEN"] } } },
  { id: "T4", correct: { START: { tags: ["YELLOW"] }, SIEVE: { tags: ["YELLOW"] } } },
  { id: "T5", correct: { START: { tags: ["GREEN"] }, SIEVE: { tags: ["GREEN"] } } },
  { id: "T6", correct: { START: { tags: ["GREEN"] }, SIEVE: { tags: ["GREEN"] } } },
  { id: "T7", correct: { START: { tags: ["RED"] }, SIEVE: { tags: ["RED"] } } },
  { id: "T8", correct: { START: { tags: ["YELLOW"] }, SIEVE: { tags: ["YELLOW"] } } },
  { id: "T9", correct: { START: { tags: ["RED"] }, SIEVE: { tags: ["RED"] } } },
  { id: "T10", correct: { START: { tags: ["GREEN"] }, SIEVE: { tags: ["GREEN"] } } },
  { id: "T11", correct: { START: { tags: ["YELLOW"] }, SIEVE: { tags: ["YELLOW"] } } },
  { id: "T12", correct: { START: { tags: ["RED"] }, SIEVE: { tags: ["RED"] } } },
  { id: "T13", correct: { START: { tags: ["GREEN"] }, SIEVE: { tags: ["GREEN"] } } },
  { id: "T14", correct: { START: { tags: ["GREEN"] }, SIEVE: { tags: ["GREEN"] } } },
  { id: "T15", correct: { START: { tags: ["RED"] }, SIEVE: { tags: ["RED"] } } },
  { id: "T16", correct: { START: { tags: ["YELLOW"] }, SIEVE: { tags: ["YELLOW"] } } },
  { id: "T17", correct: { START: { tags: ["GREEN"] }, SIEVE: { tags: ["GREEN"] } } },
  { id: "T18", correct: { START: { tags: ["GREEN"] }, SIEVE: { tags: ["GREEN"] } } },
  { id: "T19", correct: { START: { tags: ["GREEN"] }, SIEVE: { tags: ["GREEN"] } } },
  {
    id: "T20",
    correct: {
      START: {
        tags: ["RED", "BLACK"],
        note: "RED if airway opened; BLACK if not attempted",
      },
      SIEVE: {
        tags: ["RED", "BLACK"],
        note: "RED or BLACK if not breathing",
      },
    },
  },
];

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `session-${Date.now()}`;
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function emptyAnswers() {
  return Object.fromEntries(DAY_ONE_VICTIMS.map((victim) => [victim.id, ""])) as Record<
    string,
    Answer
  >;
}

function createMember(index: number): MemberRecord {
  return {
    id: `member-${index + 1}`,
    name: "",
    START: { answers: emptyAnswers(), timer: { elapsedMs: 0, startedAt: null } },
    SIEVE: { answers: emptyAnswers(), timer: { elapsedMs: 0, startedAt: null } },
  };
}

function createSession(): EvaluationSession {
  const now = new Date().toISOString();
  return {
    id: newId(),
    day: "day1",
    evaluatorName: "",
    evaluationDate: todayInputValue(),
    teamName: "",
    members: Array.from({ length: 6 }, (_, index) => createMember(index)),
    createdAt: now,
    updatedAt: now,
  };
}

function timerMs(timer: TimerState, now = Date.now()) {
  if (!timer.startedAt) {
    return timer.elapsedMs;
  }

  return timer.elapsedMs + Math.max(0, now - timer.startedAt);
}

function formatClock(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function normalizeTimers(session: EvaluationSession): EvaluationSession {
  const now = Date.now();
  return {
    ...session,
    members: session.members.map((member) => {
      const normalized = { ...member };
      METHODS.forEach((method) => {
        normalized[method] = {
          ...member[method],
          timer: { elapsedMs: timerMs(member[method].timer, now), startedAt: null },
        };
      });
      return normalized;
    }),
    updatedAt: new Date().toISOString(),
  };
}

function scoreMember(member: MemberRecord, method: Method, now = Date.now()) {
  const correct = DAY_ONE_VICTIMS.reduce((total, victim) => {
    const answer = member[method].answers[victim.id];
    return answer && victim.correct[method].tags.includes(answer) ? total + 1 : total;
  }, 0);
  const attempted = DAY_ONE_VICTIMS.reduce((total, victim) => {
    return member[method].answers[victim.id] ? total + 1 : total;
  }, 0);
  const total = DAY_ONE_VICTIMS.length;
  const elapsedMs = timerMs(member[method].timer, now);

  return {
    attempted,
    correct,
    total,
    accuracy: total ? correct / total : 0,
    timeSeconds: Math.round(elapsedMs / 1000),
  };
}

function memberHasData(member: MemberRecord) {
  return (
    member.name.trim().length > 0 ||
    METHODS.some((method) => {
      const record = member[method];
      return (
        timerMs(record.timer) > 0 ||
        Object.values(record.answers).some((answer) => answer.length > 0)
      );
    })
  );
}

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function buildCsv(sessions: EvaluationSession[]) {
  const victimHeaders = DAY_ONE_VICTIMS.flatMap((victim) => [
    `${victim.id}_answer`,
    `${victim.id}_correct`,
  ]);
  const rows: (string | number)[][] = [
    [
      "session_id",
      "day",
      "evaluation_date",
      "evaluator",
      "team",
      "member",
      "method",
      "correct",
      "total",
      "accuracy_percent",
      "time_seconds",
      ...victimHeaders,
    ],
  ];

  sessions.forEach((session) => {
    session.members.filter(memberHasData).forEach((member, memberIndex) => {
      METHODS.forEach((method) => {
        const score = scoreMember(member, method);
        rows.push([
          session.id,
          "Day 1",
          session.evaluationDate,
          session.evaluatorName,
          session.teamName,
          member.name || `Member ${memberIndex + 1}`,
          method,
          score.correct,
          score.total,
          Math.round(score.accuracy * 100),
          score.timeSeconds,
          ...DAY_ONE_VICTIMS.flatMap((victim) => {
            const answer = member[method].answers[victim.id];
            const isCorrect = answer && victim.correct[method].tags.includes(answer);
            return [answer || "", isCorrect ? "yes" : "no"];
          }),
        ]);
      });
    });
  });

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function downloadFile(filename: string, body: string, type: string) {
  const blob = new Blob([body], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function hashPasscode(passcode: string) {
  const data = new TextEncoder().encode(passcode);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function average(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function tagClass(tag: Answer) {
  return tag ? `tag-${tag.toLowerCase()}` : "";
}

export function TriageApp() {
  const [hydrated, setHydrated] = useState(false);
  const [session, setSession] = useState<EvaluationSession | null>(null);
  const [sessions, setSessions] = useState<EvaluationSession[]>([]);
  const [activeMemberIndex, setActiveMemberIndex] = useState(0);
  const [view, setView] = useState<"evaluation" | "admin">("evaluation");
  const [now, setNow] = useState(0);
  const [status, setStatus] = useState("");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminPasscodeExists, setAdminPasscodeExists] = useState(false);
  const [adminPasscode, setAdminPasscode] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) {
        return;
      }

      const savedSessions = localStorage.getItem(SESSION_KEY);
      const savedDraft = localStorage.getItem(DRAFT_KEY);
      setSessions(savedSessions ? JSON.parse(savedSessions) : []);
      setSession(savedDraft ? JSON.parse(savedDraft) : createSession());
      setAdminPasscodeExists(Boolean(localStorage.getItem(ADMIN_KEY)));
      setHydrated(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    if (hydrated && session) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(session));
    }
  }, [hydrated, session]);

  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessions));
    }
  }, [hydrated, sessions]);

  const activeMember = session?.members[activeMemberIndex] ?? null;
  const activeStats = useMemo(() => {
    if (!activeMember) {
      return null;
    }

    return {
      START: scoreMember(activeMember, "START", now),
      SIEVE: scoreMember(activeMember, "SIEVE", now),
    };
  }, [activeMember, now]);

  const analytics = useMemo(() => {
    const rows = sessions.flatMap((savedSession) =>
      savedSession.members.filter(memberHasData).flatMap((member, memberIndex) =>
        METHODS.map((method) => ({
          session: savedSession,
          member,
          memberName: member.name || `Member ${memberIndex + 1}`,
          method,
          score: scoreMember(member, method, now),
        })),
      ),
    );
    const participants = new Set(
      rows.map((row) => `${row.session.id}:${row.member.id}`),
    ).size;
    const startRows = rows.filter((row) => row.method === "START");
    const sieveRows = rows.filter((row) => row.method === "SIEVE");

    return {
      rows,
      participants,
      averageAccuracy: average(rows.map((row) => row.score.accuracy)),
      averageTime: average(rows.map((row) => row.score.timeSeconds)),
      START: {
        accuracy: average(startRows.map((row) => row.score.accuracy)),
        time: average(startRows.map((row) => row.score.timeSeconds)),
      },
      SIEVE: {
        accuracy: average(sieveRows.map((row) => row.score.accuracy)),
        time: average(sieveRows.map((row) => row.score.timeSeconds)),
      },
    };
  }, [sessions, now]);

  function updateSession(updater: (current: EvaluationSession) => EvaluationSession) {
    setSession((current) => {
      if (!current) {
        return current;
      }

      return { ...updater(current), updatedAt: new Date().toISOString() };
    });
  }

  function updateMember(
    memberId: string,
    updater: (member: MemberRecord) => MemberRecord,
  ) {
    updateSession((current) => ({
      ...current,
      members: current.members.map((member) =>
        member.id === memberId ? updater(member) : member,
      ),
    }));
  }

  function setAnswer(memberId: string, method: Method, victimId: string, answer: Answer) {
    updateMember(memberId, (member) => ({
      ...member,
      [method]: {
        ...member[method],
        answers: { ...member[method].answers, [victimId]: answer },
      },
    }));
  }

  function toggleTimer(memberId: string, method: Method) {
    updateMember(memberId, (member) => {
      const timer = member[method].timer;
      const nextTimer: TimerState = timer.startedAt
        ? { elapsedMs: timerMs(timer), startedAt: null }
        : { ...timer, startedAt: Date.now() };

      return {
        ...member,
        [method]: { ...member[method], timer: nextTimer },
      };
    });
  }

  function resetTimer(memberId: string, method: Method) {
    updateMember(memberId, (member) => ({
      ...member,
      [method]: {
        ...member[method],
        timer: { elapsedMs: 0, startedAt: null },
      },
    }));
  }

  function setManualSeconds(memberId: string, method: Method, value: string) {
    const seconds = Math.max(0, Number(value) || 0);
    updateMember(memberId, (member) => ({
      ...member,
      [method]: {
        ...member[method],
        timer: { elapsedMs: seconds * 1000, startedAt: null },
      },
    }));
  }

  function saveCurrent() {
    if (!session) {
      return;
    }

    const frozen = normalizeTimers(session);
    setSession(frozen);
    setSessions((current) => [
      frozen,
      ...current.filter((savedSession) => savedSession.id !== frozen.id),
    ]);
    setStatus("Saved Day 1 score sheet.");
  }

  function createNewSheet() {
    const hasDraft = session?.members.some(memberHasData) || session?.evaluatorName;
    if (
      hasDraft &&
      !window.confirm("Start a new score sheet? Unsaved changes stay only in exports.")
    ) {
      return;
    }

    setSession(createSession());
    setActiveMemberIndex(0);
    setStatus("New Day 1 sheet ready.");
  }

  function exportCurrent(format: "csv" | "json") {
    if (!session) {
      return;
    }

    const frozen = normalizeTimers(session);
    if (format === "csv") {
      downloadFile("day-1-triage-current.csv", buildCsv([frozen]), "text/csv");
      return;
    }

    downloadFile(
      "day-1-triage-current.json",
      JSON.stringify({ exportedAt: new Date().toISOString(), sessions: [frozen] }, null, 2),
      "application/json",
    );
  }

  function exportAll(format: "csv" | "json") {
    const frozenSessions = sessions.map(normalizeTimers);
    if (format === "csv") {
      downloadFile("mci-triage-admin-export.csv", buildCsv(frozenSessions), "text/csv");
      return;
    }

    downloadFile(
      "mci-triage-admin-export.json",
      JSON.stringify({ exportedAt: new Date().toISOString(), sessions: frozenSessions }, null, 2),
      "application/json",
    );
  }

  async function unlockAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (adminPasscode.trim().length < 4) {
      setAdminMessage("Use at least 4 characters.");
      return;
    }

    const hash = await hashPasscode(adminPasscode);
    const savedHash = localStorage.getItem(ADMIN_KEY);
    if (!savedHash) {
      localStorage.setItem(ADMIN_KEY, hash);
      setAdminPasscodeExists(true);
      setAdminUnlocked(true);
      setAdminMessage("Admin passcode created.");
      setAdminPasscode("");
      return;
    }

    if (hash === savedHash) {
      setAdminUnlocked(true);
      setAdminMessage("Admin unlocked.");
      setAdminPasscode("");
      return;
    }

    setAdminMessage("Passcode did not match.");
  }

  async function importJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as { sessions?: EvaluationSession[] } | EvaluationSession[];
      const incoming = Array.isArray(parsed) ? parsed : parsed.sessions ?? [];
      const validSessions = incoming.filter((item) => item?.id && Array.isArray(item.members));
      setSessions((current) => {
        const merged = new Map(current.map((item) => [item.id, item]));
        validSessions.forEach((item) => merged.set(item.id, item));
        return Array.from(merged.values()).sort((a, b) =>
          b.updatedAt.localeCompare(a.updatedAt),
        );
      });
      setAdminMessage(`Imported ${validSessions.length} saved sheet(s).`);
    } catch {
      setAdminMessage("Could not read that JSON export.");
    } finally {
      event.target.value = "";
    }
  }

  async function installApp() {
    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  if (!hydrated || !session || !activeMember || !activeStats) {
    return (
      <main className="app-shell loading-shell">
        <div className="brand-mark">T</div>
        <p>Loading score sheet...</p>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            T
          </div>
          <div>
            <p className="eyebrow">Primary Triage-T Set</p>
            <h1>MCI Triage Evaluation</h1>
          </div>
        </div>
        {installPrompt ? (
          <button className="ghost-button" type="button" onClick={installApp}>
            <Download size={18} aria-hidden="true" />
            Install
          </button>
        ) : null}
      </header>

      <section className="day-switcher" aria-label="Training day">
        {DAYS.map((day) => (
          <button
            key={day.key}
            className={day.key === session.day ? "day-pill active" : "day-pill"}
            type="button"
            disabled={!day.ready}
            onClick={() => updateSession((current) => ({ ...current, day: day.key }))}
          >
            <CalendarDays size={18} aria-hidden="true" />
            <span>{day.label}</span>
            <small>{day.ready ? "Ready" : "Pending"}</small>
          </button>
        ))}
      </section>

      <nav className="view-switcher" aria-label="Application area">
        <button
          className={view === "evaluation" ? "active" : ""}
          type="button"
          onClick={() => setView("evaluation")}
        >
          <Users size={18} aria-hidden="true" />
          Evaluation
        </button>
        <button
          className={view === "admin" ? "active" : ""}
          type="button"
          onClick={() => setView("admin")}
        >
          <ShieldCheck size={18} aria-hidden="true" />
          Admin
        </button>
      </nav>

      {view === "evaluation" ? (
        <>
          <section className="identity-grid" aria-label="Evaluation details">
            <label>
              Evaluator Name
              <input
                value={session.evaluatorName}
                onChange={(event) =>
                  updateSession((current) => ({
                    ...current,
                    evaluatorName: event.target.value,
                  }))
                }
                placeholder="Name"
              />
            </label>
            <label>
              Date
              <input
                type="date"
                value={session.evaluationDate}
                onChange={(event) =>
                  updateSession((current) => ({
                    ...current,
                    evaluationDate: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Group or Batch
              <input
                value={session.teamName}
                onChange={(event) =>
                  updateSession((current) => ({ ...current, teamName: event.target.value }))
                }
                placeholder="Optional"
              />
            </label>
          </section>

          <section className="member-panel">
            <div className="section-title">
              <Users size={20} aria-hidden="true" />
              <h2>Group Members</h2>
            </div>
            <div className="member-name-grid">
              {session.members.map((member, index) => (
                <label key={member.id}>
                  {`Member ${index + 1}`}
                  <input
                    value={member.name}
                    onFocus={() => setActiveMemberIndex(index)}
                    onChange={(event) =>
                      updateMember(member.id, (current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Surname"
                  />
                </label>
              ))}
            </div>
          </section>

          <section className="workbench">
            <aside className="member-rail" aria-label="Select member">
              {session.members.map((member, index) => {
                const start = scoreMember(member, "START", now);
                const sieve = scoreMember(member, "SIEVE", now);
                return (
                  <button
                    key={member.id}
                    className={index === activeMemberIndex ? "active" : ""}
                    type="button"
                    onClick={() => setActiveMemberIndex(index)}
                  >
                    <strong>{member.name || `Member ${index + 1}`}</strong>
                    <span>
                      START {start.correct}/{start.total} - SIEVE {sieve.correct}/
                      {sieve.total}
                    </span>
                  </button>
                );
              })}
            </aside>

            <section className="score-sheet" aria-label="Day 1 score sheet">
              <div className="score-header">
                <div>
                  <p className="eyebrow">Scoring</p>
                  <h2>{activeMember.name || `Member ${activeMemberIndex + 1}`}</h2>
                </div>
                <div className="score-totals">
                  {METHODS.map((method) => (
                    <span key={method}>
                      {method}: {activeStats[method].correct}/{activeStats[method].total}
                    </span>
                  ))}
                </div>
              </div>

              <div className="timer-grid">
                {METHODS.map((method) => {
                  const timer = activeMember[method].timer;
                  const running = Boolean(timer.startedAt);
                  const seconds = Math.round(timerMs(timer, now) / 1000);
                  return (
                    <article className="timer-card" key={method}>
                      <div>
                        <p>{method}</p>
                        <strong>{formatClock(timerMs(timer, now))}</strong>
                      </div>
                      <div className="timer-actions">
                        <button
                          className={running ? "danger-button" : "primary-button"}
                          type="button"
                          onClick={() => toggleTimer(activeMember.id, method)}
                        >
                          {running ? (
                            <Square size={17} aria-hidden="true" />
                          ) : (
                            <Play size={17} aria-hidden="true" />
                          )}
                          {running ? "Stop" : "Start"}
                        </button>
                        <button
                          className="icon-button"
                          type="button"
                          onClick={() => resetTimer(activeMember.id, method)}
                          title={`Reset ${method} timer`}
                          aria-label={`Reset ${method} timer`}
                        >
                          <RotateCcw size={18} aria-hidden="true" />
                        </button>
                      </div>
                      <label className="seconds-field">
                        Seconds
                        <input
                          inputMode="numeric"
                          min="0"
                          type="number"
                          value={seconds}
                          onChange={(event) =>
                            setManualSeconds(activeMember.id, method, event.target.value)
                          }
                        />
                      </label>
                    </article>
                  );
                })}
              </div>

              <div className="victim-list">
                {DAY_ONE_VICTIMS.map((victim) => (
                  <article className="victim-card" key={victim.id}>
                    <div className="victim-key">
                      <strong>{victim.id}</strong>
                      <div>
                        {METHODS.map((method) => (
                          <span key={method}>
                            {method}{" "}
                            {victim.correct[method].tags.map((tag) => (
                              <b className={`tag-chip ${tagClass(tag)}`} key={tag}>
                                {TAG_LABELS[tag]}
                              </b>
                            ))}
                          </span>
                        ))}
                      </div>
                      {METHODS.map((method) =>
                        victim.correct[method].note ? (
                          <small key={method}>{`${method}: ${victim.correct[method].note}`}</small>
                        ) : null,
                      )}
                    </div>

                    {METHODS.map((method) => {
                      const selected = activeMember[method].answers[victim.id];
                      const isCorrect =
                        selected && victim.correct[method].tags.includes(selected);
                      return (
                        <div className="answer-block" key={method}>
                          <div className="answer-heading">
                            <span>{method}</span>
                            <strong className={isCorrect ? "correct" : selected ? "wrong" : ""}>
                              {selected ? (isCorrect ? "Correct" : "Review") : "No tag"}
                            </strong>
                          </div>
                          <div className="tag-options">
                            {TAGS.map((tag) => (
                              <button
                                key={tag}
                                className={
                                  selected === tag
                                    ? `tag-option selected ${tagClass(tag)}`
                                    : "tag-option"
                                }
                                type="button"
                                aria-pressed={selected === tag}
                                onClick={() => setAnswer(activeMember.id, method, victim.id, tag)}
                              >
                                {TAG_LABELS[tag]}
                              </button>
                            ))}
                            <button
                              className="clear-tag"
                              type="button"
                              onClick={() => setAnswer(activeMember.id, method, victim.id, "")}
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </article>
                ))}
              </div>
            </section>
          </section>

          <section className="action-bar" aria-live="polite">
            <button className="primary-button" type="button" onClick={saveCurrent}>
              <Save size={18} aria-hidden="true" />
              Save Sheet
            </button>
            <button className="ghost-button" type="button" onClick={() => exportCurrent("csv")}>
              <FileDown size={18} aria-hidden="true" />
              Export CSV
            </button>
            <button className="ghost-button" type="button" onClick={() => exportCurrent("json")}>
              <Download size={18} aria-hidden="true" />
              Export JSON
            </button>
            <button className="ghost-button" type="button" onClick={createNewSheet}>
              <Plus size={18} aria-hidden="true" />
              New Sheet
            </button>
            {status ? <span>{status}</span> : null}
          </section>
        </>
      ) : (
        <section className="admin-area">
          {!adminUnlocked ? (
            <form className="admin-lock" onSubmit={unlockAdmin}>
              <div className="lock-icon">
                {adminPasscodeExists ? (
                  <Lock size={28} aria-hidden="true" />
                ) : (
                  <ShieldCheck size={28} aria-hidden="true" />
                )}
              </div>
              <h2>{adminPasscodeExists ? "Admin Analytics Locked" : "Create Admin Passcode"}</h2>
              <p>
                Saved sheets and analytics stay private on this device. Import JSON
                exports from evaluator devices to combine results.
              </p>
              <label>
                Passcode
                <input
                  type="password"
                  value={adminPasscode}
                  onChange={(event) => setAdminPasscode(event.target.value)}
                  placeholder="At least 4 characters"
                />
              </label>
              <button className="primary-button" type="submit">
                <ShieldCheck size={18} aria-hidden="true" />
                {adminPasscodeExists ? "Unlock Analytics" : "Create Passcode"}
              </button>
              {adminMessage ? <span className="form-message">{adminMessage}</span> : null}
            </form>
          ) : (
            <>
              <div className="admin-header">
                <div>
                  <p className="eyebrow">Admin Analytics</p>
                  <h2>Day 1 Results</h2>
                </div>
                <div className="admin-actions">
                  <input
                    ref={fileInputRef}
                    className="sr-only"
                    type="file"
                    accept="application/json"
                    onChange={importJson}
                  />
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={18} aria-hidden="true" />
                    Import JSON
                  </button>
                  <button className="ghost-button" type="button" onClick={() => exportAll("csv")}>
                    <FileDown size={18} aria-hidden="true" />
                    Export CSV
                  </button>
                  <button className="ghost-button" type="button" onClick={() => exportAll("json")}>
                    <Download size={18} aria-hidden="true" />
                    Export JSON
                  </button>
                </div>
              </div>

              <div className="metric-grid">
                <article>
                  <span>Saved Sheets</span>
                  <strong>{sessions.length}</strong>
                </article>
                <article>
                  <span>Participants</span>
                  <strong>{analytics.participants}</strong>
                </article>
                <article>
                  <span>Avg Accuracy</span>
                  <strong>{Math.round(analytics.averageAccuracy * 100)}%</strong>
                </article>
                <article>
                  <span>Avg Speed</span>
                  <strong>{Math.round(analytics.averageTime)}s</strong>
                </article>
              </div>

              <div className="analytics-grid">
                {METHODS.map((method) => (
                  <article className="chart-card" key={method}>
                    <div className="section-title">
                      <BarChart3 size={20} aria-hidden="true" />
                      <h3>{method}</h3>
                    </div>
                    <div className="bar-row">
                      <span>Accuracy</span>
                      <div>
                        <i style={{ width: `${Math.round(analytics[method].accuracy * 100)}%` }} />
                      </div>
                      <strong>{Math.round(analytics[method].accuracy * 100)}%</strong>
                    </div>
                    <div className="bar-row speed">
                      <span>Speed</span>
                      <div>
                        <i
                          style={{
                            width: `${Math.min(100, Math.round(analytics[method].time / 3))}%`,
                          }}
                        />
                      </div>
                      <strong>{Math.round(analytics[method].time)}s</strong>
                    </div>
                  </article>
                ))}
              </div>

              <div className="sessions-table">
                <div className="section-title">
                  <TimerReset size={20} aria-hidden="true" />
                  <h3>Saved Score Sheets</h3>
                </div>
                {adminMessage ? <p className="form-message">{adminMessage}</p> : null}
                {sessions.length ? (
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Evaluator</th>
                          <th>Group</th>
                          <th>Members</th>
                          <th>Average Accuracy</th>
                          <th>Average Speed</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessions.map((savedSession) => {
                          const members = savedSession.members.filter(memberHasData);
                          const scores = members.flatMap((member) =>
                            METHODS.map((method) => scoreMember(member, method)),
                          );
                          return (
                            <tr key={savedSession.id}>
                              <td>{savedSession.evaluationDate}</td>
                              <td>{savedSession.evaluatorName || "Not set"}</td>
                              <td>{savedSession.teamName || "Not set"}</td>
                              <td>{members.length}</td>
                              <td>
                                {Math.round(average(scores.map((item) => item.accuracy)) * 100)}%
                              </td>
                              <td>
                                {Math.round(average(scores.map((item) => item.timeSeconds)))}s
                              </td>
                              <td>
                                <button
                                  className="icon-button danger-icon"
                                  type="button"
                                  title="Delete saved sheet"
                                  aria-label="Delete saved sheet"
                                  onClick={() => {
                                    if (window.confirm("Delete this saved score sheet?")) {
                                      setSessions((current) =>
                                        current.filter((item) => item.id !== savedSession.id),
                                      );
                                    }
                                  }}
                                >
                                  <Trash2 size={17} aria-hidden="true" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="empty-state">No saved score sheets yet.</p>
                )}
              </div>
            </>
          )}
        </section>
      )}
    </main>
  );
}
