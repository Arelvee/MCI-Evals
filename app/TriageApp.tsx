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
  X,
} from "lucide-react";
import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Method = "START" | "SIEVE" | "SAVE" | "SORT";
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
} & Record<Method, MethodRecord>;

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

type VictimRecord = {
  id: string;
  correct: Partial<Record<Method, { tags: Tag[]; note?: string }>>;
};

type DayConfig = {
  key: DayKey;
  label: string;
  ready: boolean;
  setTitle: string;
  methods: Method[];
  victims: VictimRecord[];
};

const ALL_METHODS: Method[] = ["START", "SIEVE", "SAVE", "SORT"];
const TAGS: Tag[] = ["GREEN", "YELLOW", "RED", "BLACK"];
const ALL_VICTIM_IDS = Array.from({ length: 20 }, (_, index) => `T${index + 1}`);
const SESSION_KEY = "mci-triage-sessions-v1";
const DRAFT_KEY = "mci-triage-current-draft-v1";
const ADMIN_KEY = "mci-triage-admin-passcode-v1";

const TAG_LABELS: Record<Tag, string> = {
  GREEN: "Green",
  YELLOW: "Yellow",
  RED: "Red",
  BLACK: "Black",
};

const DAY_ONE_VICTIMS: VictimRecord[] = [
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

const DAY_TWO_VICTIMS: VictimRecord[] = [
  {
    id: "T1",
    correct: {
      SAVE: {
        tags: ["RED", "YELLOW", "BLACK"],
        note: "RED=head injury; YELLOW=intoxication; BLACK if no NSS",
      },
      SORT: { tags: ["YELLOW"] },
    },
  },
  { id: "T2", correct: { SAVE: { tags: ["RED"] }, SORT: { tags: ["YELLOW"] } } },
  { id: "T3", correct: { SAVE: { tags: ["YELLOW"] }, SORT: { tags: ["GREEN"] } } },
  {
    id: "T4",
    correct: {
      SAVE: {
        tags: ["GREEN", "RED"],
        note: "RED if wound not packed in 5 mins of being seen",
      },
      SORT: { tags: ["GREEN"] },
    },
  },
  { id: "T5", correct: { SAVE: { tags: ["RED"] }, SORT: { tags: ["GREEN"] } } },
  { id: "T6", correct: { SAVE: { tags: ["RED"] }, SORT: { tags: ["GREEN"] } } },
  { id: "T7", correct: { SAVE: { tags: ["RED"] }, SORT: { tags: ["RED"] } } },
  { id: "T8", correct: { SAVE: { tags: ["YELLOW"] }, SORT: { tags: ["GREEN"] } } },
  { id: "T9", correct: { SAVE: { tags: ["BLACK"] }, SORT: { tags: ["RED"] } } },
  { id: "T10", correct: { SAVE: { tags: ["RED"] }, SORT: { tags: ["YELLOW"] } } },
  { id: "T11", correct: { SAVE: { tags: ["GREEN"] }, SORT: { tags: ["GREEN"] } } },
  {
    id: "T12",
    correct: {
      SAVE: { tags: ["RED"] },
      SORT: { tags: ["YELLOW", "RED"], note: "RED if TP develops" },
    },
  },
  { id: "T13", correct: { SAVE: { tags: ["RED"] }, SORT: { tags: ["RED"] } } },
  { id: "T14", correct: { SAVE: { tags: ["RED"] }, SORT: { tags: ["YELLOW"] } } },
  { id: "T15", correct: { SAVE: { tags: ["BLACK"] }, SORT: { tags: ["BLACK"] } } },
  { id: "T16", correct: { SAVE: { tags: ["YELLOW"] }, SORT: { tags: ["GREEN"] } } },
  { id: "T17", correct: { SAVE: { tags: ["RED"] }, SORT: { tags: ["RED"] } } },
  { id: "T18", correct: { SAVE: { tags: ["RED"] }, SORT: { tags: ["YELLOW"] } } },
  { id: "T19", correct: { SAVE: { tags: ["GREEN"] }, SORT: { tags: ["GREEN"] } } },
  {
    id: "T20",
    correct: {
      SAVE: { tags: ["GREEN"] },
      SORT: {
        tags: ["BLACK", "RED"],
        note: "BLACK if not revived; RED if revived",
      },
    },
  },
];

const DAY_CONFIGS: Record<DayKey, DayConfig> = {
  day1: {
    key: "day1",
    label: "Day 1",
    ready: true,
    setTitle: "Primary Triage-T Set",
    methods: ["START", "SIEVE"],
    victims: DAY_ONE_VICTIMS,
  },
  day2: {
    key: "day2",
    label: "Day 2",
    ready: true,
    setTitle: "Secondary Triage-T Set",
    methods: ["SAVE", "SORT"],
    victims: DAY_TWO_VICTIMS,
  },
  day3: {
    key: "day3",
    label: "Day 3",
    ready: false,
    setTitle: "Pending Triage-T Set",
    methods: ["SAVE", "SORT"],
    victims: DAY_TWO_VICTIMS,
  },
};

const DAYS = Object.values(DAY_CONFIGS).map(({ key, label, ready }) => ({
  key,
  label,
  ready,
}));

function getDayConfig(day: DayKey) {
  return DAY_CONFIGS[day] ?? DAY_CONFIGS.day1;
}

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `session-${Date.now()}`;
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function emptyAnswers() {
  return Object.fromEntries(ALL_VICTIM_IDS.map((victimId) => [victimId, ""])) as Record<
    string,
    Answer
  >;
}

function createMethodRecord(existing?: MethodRecord): MethodRecord {
  return {
    answers: { ...emptyAnswers(), ...(existing?.answers ?? {}) },
    timer: existing?.timer ?? { elapsedMs: 0, startedAt: null },
  };
}

function ensureMemberShape(member: Partial<MemberRecord> & { id: string }): MemberRecord {
  const shaped = {
    id: member.id,
    name: member.name ?? "",
  } as MemberRecord;

  ALL_METHODS.forEach((method) => {
    shaped[method] = createMethodRecord(member[method]);
  });

  return shaped;
}

function createMember(index: number): MemberRecord {
  return ensureMemberShape({
    id: `member-${index + 1}`,
    name: "",
  });
}

function createSession(day: DayKey = "day1"): EvaluationSession {
  const now = new Date().toISOString();
  return {
    id: newId(),
    day,
    evaluatorName: "",
    evaluationDate: todayInputValue(),
    teamName: "",
    members: Array.from({ length: 6 }, (_, index) => createMember(index)),
    createdAt: now,
    updatedAt: now,
  };
}

function ensureSessionShape(session: EvaluationSession): EvaluationSession {
  return {
    ...session,
    day: DAY_CONFIGS[session.day] ? session.day : "day1",
    members: session.members.map(ensureMemberShape),
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
  const shapedSession = ensureSessionShape(session);
  return {
    ...shapedSession,
    members: shapedSession.members.map((member) => {
      const normalized = { ...member } as MemberRecord;
      ALL_METHODS.forEach((method) => {
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

function scoreMember(
  member: MemberRecord,
  config: DayConfig,
  method: Method,
  now = Date.now(),
) {
  const correct = config.victims.reduce((total, victim) => {
    const answer = member[method].answers[victim.id];
    const correctTags = victim.correct[method]?.tags ?? [];
    return answer && correctTags.includes(answer) ? total + 1 : total;
  }, 0);
  const attempted = config.victims.reduce((total, victim) => {
    return member[method].answers[victim.id] ? total + 1 : total;
  }, 0);
  const total = config.victims.length;
  const elapsedMs = timerMs(member[method].timer, now);

  return {
    attempted,
    correct,
    total,
    accuracy: total ? correct / total : 0,
    timeSeconds: Math.round(elapsedMs / 1000),
  };
}

function memberHasData(member: MemberRecord, methods = ALL_METHODS) {
  return (
    member.name.trim().length > 0 ||
    methods.some((method) => {
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
  const victimHeaders = ALL_VICTIM_IDS.flatMap((victimId) => [
    `${victimId}_answer`,
    `${victimId}_correct`,
  ]);
  const rows: (string | number)[][] = [
    [
      "session_id",
      "day",
      "evaluation_date",
      "evaluator",
      "team",
      "member_full_name",
      "method",
      "correct",
      "total",
      "accuracy_percent",
      "time_seconds",
      ...victimHeaders,
    ],
  ];

  sessions.map(ensureSessionShape).forEach((session) => {
    const config = getDayConfig(session.day);
    session.members
      .filter((member) => memberHasData(member, config.methods))
      .forEach((member, memberIndex) => {
      config.methods.forEach((method) => {
        const score = scoreMember(member, config, method);
        rows.push([
          session.id,
          config.label,
          session.evaluationDate,
          session.evaluatorName,
          session.teamName,
          member.name || `Member ${memberIndex + 1}`,
          method,
          score.correct,
          score.total,
          Math.round(score.accuracy * 100),
          score.timeSeconds,
          ...ALL_VICTIM_IDS.flatMap((victimId) => {
            const victim = config.victims.find((item) => item.id === victimId);
            const answer = member[method].answers[victimId];
            const isCorrect =
              answer && (victim?.correct[method]?.tags ?? []).includes(answer);
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

function appIsStandalone() {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true
  );
}

function MciTriageLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "mci-logo compact" : "mci-logo"} aria-hidden="true">
      <span className="mci-logo-mark">
        <span className="mci-logo-cross" />
        <span className="mci-logo-dot green" />
        <span className="mci-logo-dot yellow" />
        <span className="mci-logo-dot red" />
        <span className="mci-logo-dot black" />
      </span>
      <span className="mci-logo-type">
        <strong>MCI</strong>
        <small>Triage</small>
      </span>
    </div>
  );
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
  const [installBannerOpen, setInstallBannerOpen] = useState(true);
  const [standalone, setStandalone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) {
        return;
      }

      const savedSessions = localStorage.getItem(SESSION_KEY);
      const savedDraft = localStorage.getItem(DRAFT_KEY);
      setSessions(
        savedSessions
          ? (JSON.parse(savedSessions) as EvaluationSession[]).map(ensureSessionShape)
          : [],
      );
      setSession(savedDraft ? ensureSessionShape(JSON.parse(savedDraft)) : createSession());
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
      setInstallBannerOpen(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    const displayMode = window.matchMedia("(display-mode: standalone)");
    const updateStandalone = () => setStandalone(appIsStandalone());
    const onAppInstalled = () => {
      setStandalone(true);
      setInstallPrompt(null);
      setInstallBannerOpen(false);
    };

    updateStandalone();
    displayMode.addEventListener("change", updateStandalone);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      displayMode.removeEventListener("change", updateStandalone);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
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

  const dayConfig = getDayConfig(session?.day ?? "day1");
  const activeMember = session?.members[activeMemberIndex] ?? null;
  const activeStats = useMemo(() => {
    if (!activeMember) {
      return null;
    }

    return Object.fromEntries(
      dayConfig.methods.map((method) => [
        method,
        scoreMember(activeMember, dayConfig, method, now),
      ]),
    ) as Record<Method, ReturnType<typeof scoreMember>>;
  }, [activeMember, dayConfig, now]);

  const analytics = useMemo(() => {
    const rows = sessions.map(ensureSessionShape).flatMap((savedSession) => {
      const config = getDayConfig(savedSession.day);
      return savedSession.members
        .filter((member) => memberHasData(member, config.methods))
        .flatMap((member, memberIndex) =>
        config.methods.map((method) => ({
          session: savedSession,
          config,
          member,
          memberName: member.name || `Member ${memberIndex + 1}`,
          method,
          score: scoreMember(member, config, method, now),
        })),
      );
    });
    const participants = new Set(
      rows.map((row) => `${row.session.id}:${row.member.id}`),
    ).size;
    const methods = Object.fromEntries(
      ALL_METHODS.map((method) => {
        const methodRows = rows.filter((row) => row.method === method);
        return [
          method,
          {
            count: methodRows.length,
            accuracy: average(methodRows.map((row) => row.score.accuracy)),
            time: average(methodRows.map((row) => row.score.timeSeconds)),
          },
        ];
      }),
    ) as Record<Method, { count: number; accuracy: number; time: number }>;

    return {
      rows,
      participants,
      averageAccuracy: average(rows.map((row) => row.score.accuracy)),
      averageTime: average(rows.map((row) => row.score.timeSeconds)),
      methods,
    };
  }, [sessions, now]);

  function updateSession(updater: (current: EvaluationSession) => EvaluationSession) {
    setSession((current) => {
      if (!current) {
        return current;
      }

      const updated = updater(ensureSessionShape(current));
      return ensureSessionShape({ ...updated, updatedAt: new Date().toISOString() });
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

  function switchDay(day: DayKey) {
    updateSession((current) => ({ ...current, day }));
    setActiveMemberIndex(0);
    setStatus(`${getDayConfig(day).label} score sheet ready.`);
  }

  function addMember() {
    if (!session) {
      return;
    }

    const nextIndex = session.members.length;
    updateSession((current) => ({
      ...current,
      members: [...current.members, createMember(current.members.length)],
    }));
    setActiveMemberIndex(nextIndex);
    setStatus(`Added Member ${nextIndex + 1}.`);
  }

  function removeMember(memberId: string, memberIndex: number) {
    if (!session || memberIndex < 6) {
      return;
    }

    updateSession((current) => ({
      ...current,
      members: current.members.filter((member) => member.id !== memberId),
    }));
    setActiveMemberIndex((current) => Math.max(0, Math.min(current, session.members.length - 2)));
    setStatus(`Removed Member ${memberIndex + 1}.`);
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
    setStatus(`Saved ${getDayConfig(frozen.day).label} score sheet.`);
  }

  function createNewSheet() {
    const hasDraft =
      session?.members.some((member) => memberHasData(member, dayConfig.methods)) ||
      session?.evaluatorName;
    if (
      hasDraft &&
      !window.confirm("Start a new score sheet? Unsaved changes stay only in exports.")
    ) {
      return;
    }

    setSession(createSession(session?.day ?? "day1"));
    setActiveMemberIndex(0);
    setStatus(`New ${dayConfig.label} sheet ready.`);
  }

  function exportCurrent(format: "csv" | "json") {
    if (!session) {
      return;
    }

    const frozen = normalizeTimers(session);
    const config = getDayConfig(frozen.day);
    if (format === "csv") {
      downloadFile(`${config.label.toLowerCase().replace(" ", "-")}-triage-current.csv`, buildCsv([frozen]), "text/csv");
      return;
    }

    downloadFile(
      `${config.label.toLowerCase().replace(" ", "-")}-triage-current.json`,
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
      const validSessions = incoming
        .filter((item) => item?.id && Array.isArray(item.members))
        .map(ensureSessionShape);
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
      setStatus("Use the browser install menu, or Share > Add to Home Screen on iPhone/iPad.");
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    if (choice.outcome === "accepted") {
      setInstallBannerOpen(false);
      setStatus("App installation started.");
      return;
    }

    setStatus("Install prompt dismissed. You can still install from the browser menu.");
  }

  if (!hydrated || !session || !activeMember || !activeStats) {
    return (
      <main className="app-shell loading-shell">
        <MciTriageLogo compact />
        <p>Loading score sheet...</p>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <MciTriageLogo />
          <div>
            <p className="eyebrow">{dayConfig.setTitle}</p>
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

      {installBannerOpen && !standalone ? (
        <aside className="install-popout" aria-label="Install app reminder" aria-live="polite">
          <button
            className="icon-button install-close"
            type="button"
            title="Dismiss install reminder"
            aria-label="Dismiss install reminder"
            onClick={() => setInstallBannerOpen(false)}
          >
            <X size={16} aria-hidden="true" />
          </button>
          <div className="install-popout-head">
            <MciTriageLogo compact />
            <div>
              <p className="eyebrow">PWA Ready</p>
              <h2>Install this app</h2>
            </div>
          </div>
          <p>
            Save MCI Triage to this device for faster access and offline score-sheet use.
          </p>
          <div className="install-actions">
            <button className="primary-button" type="button" onClick={installApp}>
              <Download size={18} aria-hidden="true" />
              {installPrompt ? "Install App" : "How to Install"}
            </button>
            {!installPrompt ? (
              <span className="install-tip">
                iPhone/iPad: Share, then Add to Home Screen.
              </span>
            ) : null}
          </div>
        </aside>
      ) : null}

      <section className="day-switcher" aria-label="Training day">
        {DAYS.map((day) => (
          <button
            key={day.key}
            className={day.key === session.day ? "day-pill active" : "day-pill"}
            type="button"
            disabled={!day.ready}
            onClick={() => switchDay(day.key)}
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
            <div className="member-panel-header">
              <div className="section-title">
                <Users size={20} aria-hidden="true" />
                <h2>Members</h2>
              </div>
              <button className="ghost-button add-member-button" type="button" onClick={addMember}>
                <Plus size={18} aria-hidden="true" />
                Add Member
              </button>
            </div>
            <div className="member-picker-grid" aria-label="Select member">
              {session.members.map((member, index) => {
                const scoreTotal = dayConfig.methods.reduce(
                  (total, method) => total + scoreMember(member, dayConfig, method, now).correct,
                  0,
                );
                return (
                  <button
                    key={member.id}
                    className={`member-chip${index === activeMemberIndex ? " active" : ""}`}
                    type="button"
                    aria-pressed={index === activeMemberIndex}
                    onClick={() => setActiveMemberIndex(index)}
                  >
                    <span>{`Member ${index + 1}`}</span>
                    <strong>{scoreTotal} pts</strong>
                    <small>{member.name ? "Name saved" : "No name"}</small>
                  </button>
                );
              })}
            </div>
            <div className="active-member-card">
              <div className="active-member-label">
                <span>Active Member</span>
                <strong>{`Member ${activeMemberIndex + 1}`}</strong>
              </div>
              <label>
                Full Name
                <input
                  value={activeMember.name}
                  onChange={(event) =>
                    updateMember(activeMember.id, (current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Type full name"
                />
              </label>
              {activeMemberIndex >= 6 ? (
                <button
                  className="icon-button danger-icon member-remove"
                  type="button"
                  title={`Remove Member ${activeMemberIndex + 1}`}
                  aria-label={`Remove Member ${activeMemberIndex + 1}`}
                  onClick={() => removeMember(activeMember.id, activeMemberIndex)}
                >
                  <Trash2 size={17} aria-hidden="true" />
                </button>
              ) : null}
            </div>
          </section>

          <section className="workbench">
            <section className="score-sheet" aria-label={`${dayConfig.label} score sheet`}>
              <div className="score-header">
                <div>
                  <p className="eyebrow">Scoring</p>
                  <h2>{activeMember.name || `Member ${activeMemberIndex + 1}`}</h2>
                  <p className="score-rule">1 point each correct triage tag</p>
                </div>
                <div className="score-totals">
                  {dayConfig.methods.map((method) => (
                    <span key={method}>
                      {method}: {activeStats[method].correct} pts / {activeStats[method].total}
                    </span>
                  ))}
                </div>
              </div>

              <div className="timer-grid">
                {dayConfig.methods.map((method) => {
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

              <div className="progress-strip" aria-label="Active member progress">
                {dayConfig.methods.map((method) => {
                  const score = activeStats[method];
                  const attemptedPercent = Math.round((score.attempted / score.total) * 100);
                  return (
                    <article className="progress-card" key={method}>
                      <div className="progress-meta">
                        <span>{method}</span>
                        <strong>{attemptedPercent}% complete</strong>
                      </div>
                      <div className="progress-track" aria-hidden="true">
                        <i style={{ width: `${attemptedPercent}%` }} />
                      </div>
                      <div className="progress-meta compact">
                        <span>
                          {score.correct}/{score.total} pts
                        </span>
                        <span>{score.timeSeconds}s</span>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="victim-list">
                {dayConfig.victims.map((victim) => (
                  <article className="victim-card" key={victim.id}>
                    <div className="victim-key">
                      <strong>{victim.id}</strong>
                      <div>
                        {dayConfig.methods.map((method) => (
                          <span key={method}>
                            {method}{" "}
                            {(victim.correct[method]?.tags ?? []).map((tag) => (
                              <b className={`tag-chip ${tagClass(tag)}`} key={tag}>
                                {TAG_LABELS[tag]}
                              </b>
                            ))}
                          </span>
                        ))}
                      </div>
                      {dayConfig.methods.map((method) =>
                        victim.correct[method]?.note ? (
                          <small key={method}>{`${method}: ${victim.correct[method]?.note}`}</small>
                        ) : null,
                      )}
                    </div>

                    {dayConfig.methods.map((method) => {
                      const selected = activeMember[method].answers[victim.id];
                      const isCorrect =
                        selected && (victim.correct[method]?.tags ?? []).includes(selected);
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
                                className={`tag-option ${tagClass(tag)}${
                                  selected === tag ? " selected" : ""
                                }`}
                                type="button"
                                aria-pressed={selected === tag}
                                aria-label={`${method} ${victim.id} ${TAG_LABELS[tag]}`}
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
                  <h2>Training Results</h2>
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
                {(ALL_METHODS.some((method) => analytics.methods[method].count > 0)
                  ? ALL_METHODS.filter((method) => analytics.methods[method].count > 0)
                  : dayConfig.methods
                ).map((method) => (
                  <article className="chart-card" key={method}>
                    <div className="section-title">
                      <BarChart3 size={20} aria-hidden="true" />
                      <h3>{method}</h3>
                    </div>
                    <div className="bar-row">
                      <span>Accuracy</span>
                      <div>
                        <i
                          style={{
                            width: `${Math.round(analytics.methods[method].accuracy * 100)}%`,
                          }}
                        />
                      </div>
                      <strong>{Math.round(analytics.methods[method].accuracy * 100)}%</strong>
                    </div>
                    <div className="bar-row speed">
                      <span>Speed</span>
                      <div>
                        <i
                          style={{
                            width: `${Math.min(100, Math.round(analytics.methods[method].time / 3))}%`,
                          }}
                        />
                      </div>
                      <strong>{Math.round(analytics.methods[method].time)}s</strong>
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
                          <th>Day</th>
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
                          const shapedSession = ensureSessionShape(savedSession);
                          const config = getDayConfig(shapedSession.day);
                          const members = shapedSession.members.filter((member) =>
                            memberHasData(member, config.methods),
                          );
                          const scores = members.flatMap((member) =>
                            config.methods.map((method) => scoreMember(member, config, method)),
                          );
                          return (
                            <tr key={shapedSession.id}>
                              <td>{config.label}</td>
                              <td>{shapedSession.evaluationDate}</td>
                              <td>{shapedSession.evaluatorName || "Not set"}</td>
                              <td>{shapedSession.teamName || "Not set"}</td>
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
                                        current.filter((item) => item.id !== shapedSession.id),
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
