"use client";

import {
  Award,
  BarChart3,
  Calculator,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Download,
  FileDown,
  Lock,
  Medal,
  Minus,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  Square,
  TimerReset,
  Trash2,
  Upload,
  Users,
  Wifi,
  WifiOff,
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
type QuizKey = "startQuiz" | "jumpstartQuiz" | "day2Quiz" | "day3Quiz" | "postTest";
type ScoreValue = number | "";

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

type ScorebookOverride = {
  participantName?: string;
  trainingName?: string;
  trainingDate?: string;
  quizScores?: Partial<Record<QuizKey, ScoreValue>>;
  simulationScores?: Partial<Record<Method, ScoreValue>>;
  comments?: string;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type CloudSyncState = "local" | "ready" | "syncing" | "synced" | "error";

type CloudSyncResponse = {
  enabled?: boolean;
  message?: string;
  missing?: string[];
  saved?: number;
  sessions?: unknown[];
  scorebookOverrides?: unknown;
};

type CalendarDateStats = {
  date: string;
  participants: number;
  sessions: number;
  meanFinal: number;
  trainings: string[];
};

type CalendarCell = {
  key: string;
  date: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  stats?: CalendarDateStats;
};

type ScoreStepperProps = {
  label: string;
  max: number;
  value: ScoreValue | undefined;
  onChange: (value: string) => void;
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

type VictimGroup = {
  key: string;
  label: string;
  victims: VictimRecord[];
};

const ALL_METHODS: Method[] = ["START", "SIEVE", "SAVE", "SORT"];
const TAGS: Tag[] = ["GREEN", "YELLOW", "RED", "BLACK"];
const SESSION_KEY = "mci-triage-sessions-v1";
const DRAFT_KEY = "mci-triage-current-draft-v2";
const LEGACY_DRAFT_KEYS = ["mci-triage-current-draft-v1"];
const ADMIN_KEY = "mci-triage-admin-passcode-v1";
const SCOREBOOK_KEY = "mci-triage-scorebook-v1";
const CLOUD_SYNC_KEY = "mci-triage-cloud-sync-key-v1";
const CLOUD_LAST_SYNC_KEY = "mci-triage-cloud-last-sync-v1";
const QUIZ_CONFIGS: { key: QuizKey; label: string; max: number; weight: number }[] = [
  { key: "startQuiz", label: "START Quiz", max: 10, weight: 0.05 },
  { key: "jumpstartQuiz", label: "JumpSTART Quiz", max: 18, weight: 0.05 },
  { key: "day2Quiz", label: "Day 2 Quiz", max: 30, weight: 0.15 },
  { key: "day3Quiz", label: "Day 3 E-Set Quiz", max: 10, weight: 0.15 },
  { key: "postTest", label: "Post Test", max: 15, weight: 0.6 },
];
const GRADE_LABELS = ["Excellent", "Very Good", "Passed", "Needs Review", "Remedial"];
const CLOUD_STATUS_LABELS: Record<CloudSyncState, string> = {
  local: "Local only",
  ready: "Ready",
  syncing: "Syncing",
  synced: "Synced",
  error: "Needs setup",
};

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

const DAY_THREE_VICTIMS: VictimRecord[] = [
  {
    id: "E1",
    correct: {
      START: { tags: ["GREEN"] },
      SAVE: { tags: ["GREEN"] },
      SIEVE: { tags: ["GREEN"] },
      SORT: { tags: ["GREEN"] },
    },
  },
  {
    id: "E2",
    correct: {
      START: { tags: ["YELLOW"] },
      SAVE: {
        tags: ["YELLOW", "RED"],
        note: "YELLOW at 10 min arrival (120/min PR); RED at 5 mins of arrival (90/60)",
      },
      SIEVE: { tags: ["YELLOW"] },
      SORT: {
        tags: ["GREEN", "RED"],
        note: "GREEN at 10 min arrival (120/min PR); RED at 5 mins of arrival (90/60)",
      },
    },
  },
  {
    id: "E3",
    correct: {
      START: { tags: ["GREEN"] },
      SAVE: { tags: ["GREEN"] },
      SIEVE: { tags: ["GREEN"] },
      SORT: { tags: ["GREEN"] },
    },
  },
  {
    id: "E4",
    correct: {
      START: { tags: ["GREEN"] },
      SAVE: { tags: ["GREEN"] },
      SIEVE: { tags: ["GREEN"] },
      SORT: { tags: ["GREEN"] },
    },
  },
  {
    id: "E5",
    correct: {
      START: { tags: ["GREEN"] },
      SAVE: { tags: ["RED"] },
      SIEVE: { tags: ["GREEN"] },
      SORT: { tags: ["GREEN"] },
    },
  },
  {
    id: "E6",
    correct: {
      START: { tags: ["GREEN"] },
      SAVE: { tags: ["RED"] },
      SIEVE: { tags: ["GREEN"] },
      SORT: { tags: ["GREEN"] },
    },
  },
  {
    id: "E7",
    correct: {
      START: { tags: ["RED"] },
      SAVE: { tags: ["RED"] },
      SIEVE: { tags: ["YELLOW"] },
      SORT: { tags: ["GREEN"] },
    },
  },
  {
    id: "E8",
    correct: {
      START: { tags: ["RED"] },
      SAVE: { tags: ["RED"] },
      SIEVE: { tags: ["YELLOW"] },
      SORT: { tags: ["GREEN"] },
    },
  },
  {
    id: "E9",
    correct: {
      START: { tags: ["RED"] },
      SAVE: { tags: ["BLACK"] },
      SIEVE: { tags: ["RED"] },
      SORT: { tags: ["RED"] },
    },
  },
  {
    id: "E10",
    correct: {
      START: { tags: ["BLACK"] },
      SAVE: { tags: ["BLACK"] },
      SIEVE: { tags: ["BLACK"] },
      SORT: { tags: ["BLACK"] },
    },
  },
  {
    id: "E11",
    correct: {
      START: { tags: ["GREEN"] },
      SAVE: { tags: ["RED"] },
      SIEVE: { tags: ["GREEN"] },
      SORT: { tags: ["YELLOW"] },
    },
  },
  {
    id: "E12",
    correct: {
      START: { tags: ["YELLOW"] },
      SAVE: { tags: ["GREEN"] },
      SIEVE: { tags: ["YELLOW"] },
      SORT: { tags: ["GREEN"] },
    },
  },
  {
    id: "E13",
    correct: {
      START: { tags: ["RED"] },
      SAVE: { tags: ["RED"] },
      SIEVE: { tags: ["RED"] },
      SORT: { tags: ["YELLOW"] },
    },
  },
  {
    id: "E14",
    correct: {
      START: { tags: ["GREEN"] },
      SAVE: { tags: ["RED"] },
      SIEVE: { tags: ["GREEN"] },
      SORT: { tags: ["YELLOW"] },
    },
  },
  {
    id: "E15",
    correct: {
      START: { tags: ["RED"] },
      SAVE: { tags: ["RED"] },
      SIEVE: { tags: ["RED"] },
      SORT: { tags: ["RED"] },
    },
  },
  {
    id: "E16",
    correct: {
      START: { tags: ["GREEN"] },
      SAVE: { tags: ["RED"] },
      SIEVE: { tags: ["GREEN"] },
      SORT: { tags: ["YELLOW"] },
    },
  },
  {
    id: "E17",
    correct: {
      START: { tags: ["RED"] },
      SAVE: { tags: ["BLACK"] },
      SIEVE: { tags: ["RED"] },
      SORT: { tags: ["RED"] },
    },
  },
  {
    id: "E18",
    correct: {
      START: { tags: ["BLACK"] },
      SAVE: { tags: ["BLACK"] },
      SIEVE: { tags: ["BLACK"] },
      SORT: { tags: ["BLACK"] },
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
    label: "Day 3 E-Set",
    ready: true,
    setTitle: "Grand Simulation E-Set",
    methods: ["START", "SAVE", "SIEVE", "SORT"],
    victims: DAY_THREE_VICTIMS,
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

function allConfiguredVictimIds() {
  return Array.from(
    new Set(
      Object.values(DAY_CONFIGS).flatMap((config) =>
        config.victims.map((victim) => victim.id),
      ),
    ),
  );
}

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `session-${Date.now()}`;
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function dateKeyFromParts(year: number, monthIndex: number, day: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseMonthKey(value: string) {
  const [yearText, monthText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    const today = new Date();
    return { year: today.getFullYear(), monthIndex: today.getMonth() };
  }

  return { year, monthIndex: month - 1 };
}

function normalizedDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return "";
  }

  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const day = Number(dayText);
  const date = new Date(year, monthIndex, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== monthIndex ||
    date.getDate() !== day
  ) {
    return "";
  }

  return dateKeyFromParts(year, monthIndex, day);
}

function addMonths(month: string, amount: number) {
  const { year, monthIndex } = parseMonthKey(month);
  const date = new Date(year, monthIndex + amount, 1);
  return dateKeyFromParts(date.getFullYear(), date.getMonth(), 1).slice(0, 7);
}

function monthLabel(month: string) {
  const { year, monthIndex } = parseMonthKey(month);
  return new Date(year, monthIndex, 1).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function calendarCells(month: string, statsByDate: Map<string, CalendarDateStats>) {
  const { year, monthIndex } = parseMonthKey(month);
  const firstDay = new Date(year, monthIndex, 1);
  const start = new Date(year, monthIndex, 1 - firstDay.getDay());
  const todayKey = todayInputValue();

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = dateKeyFromParts(date.getFullYear(), date.getMonth(), date.getDate());

    return {
      key,
      date: key,
      day: date.getDate(),
      inMonth: date.getMonth() === monthIndex,
      isToday: key === todayKey,
      stats: statsByDate.get(key),
    };
  }) as CalendarCell[];
}

function parseStoredJson<T>(value: string | null, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function isSessionLike(value: unknown): value is EvaluationSession {
  return (
    value !== null &&
    typeof value === "object" &&
    "id" in value &&
    Array.isArray((value as { members?: unknown }).members)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function emptyAnswers() {
  return Object.fromEntries(allConfiguredVictimIds().map((victimId) => [victimId, ""])) as Record<
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
  const fallback = createSession();
  const day = DAY_CONFIGS[session.day] ? session.day : "day1";
  const members = Array.isArray(session.members)
    ? session.members.map(ensureMemberShape)
    : fallback.members;
  return {
    ...fallback,
    ...session,
    day,
    evaluatorName: session.evaluatorName ?? "",
    evaluationDate: session.evaluationDate || fallback.evaluationDate,
    teamName: session.teamName ?? "",
    members: day === "day3" ? members.map(migrateDayThreeLegacyAnswers) : members,
    createdAt: session.createdAt ?? fallback.createdAt,
    updatedAt: session.updatedAt ?? session.createdAt ?? fallback.updatedAt,
  };
}

function migrateDayThreeLegacyAnswers(member: MemberRecord) {
  const migrated = { ...member } as MemberRecord;
  DAY_THREE_VICTIMS.forEach((victim, index) => {
    const legacyId = `T${index + 1}`;
    ALL_METHODS.forEach((method) => {
      const legacyAnswer = migrated[method].answers[legacyId];
      if (!migrated[method].answers[victim.id] && legacyAnswer) {
        migrated[method] = {
          ...migrated[method],
          answers: { ...migrated[method].answers, [victim.id]: legacyAnswer },
        };
      }
    });
  });
  return migrated;
}

function createCleanSessionForDay(
  day: DayKey,
  current?: EvaluationSession | null,
): EvaluationSession {
  const next = createSession(day);
  if (!current) {
    return next;
  }

  const shaped = ensureSessionShape(current);
  return {
    ...next,
    evaluatorName: shaped.evaluatorName,
    evaluationDate: shaped.evaluationDate || next.evaluationDate,
    teamName: shaped.teamName,
    members: shaped.members.map((member, index) => ({
      ...createMember(index),
      name: member.name,
    })),
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

function sessionHasData(session: EvaluationSession) {
  const shapedSession = ensureSessionShape(session);
  const methods = getDayConfig(shapedSession.day).methods;
  return (
    shapedSession.evaluatorName.trim().length > 0 ||
    shapedSession.teamName.trim().length > 0 ||
    shapedSession.members.some((member) => memberHasData(member, methods))
  );
}

function freezeRunningTimers(session: EvaluationSession): EvaluationSession {
  const shapedSession = ensureSessionShape(session);
  return {
    ...shapedSession,
    members: shapedSession.members.map((member) => {
      const frozen = { ...member } as MemberRecord;
      ALL_METHODS.forEach((method) => {
        frozen[method] = {
          ...member[method],
          timer: { elapsedMs: member[method].timer.elapsedMs, startedAt: null },
        };
      });
      return frozen;
    }),
  };
}

function mergeSessionsByUpdatedAt(
  localSessions: EvaluationSession[],
  incomingSessions: EvaluationSession[],
) {
  const merged = new Map<string, EvaluationSession>();

  [...localSessions, ...incomingSessions].forEach((session) => {
    const shapedSession = ensureSessionShape(session);
    const current = merged.get(shapedSession.id);
    if (
      !current ||
      new Date(shapedSession.updatedAt).getTime() >= new Date(current.updatedAt).getTime()
    ) {
      merged.set(shapedSession.id, shapedSession);
    }
  });

  return Array.from(merged.values()).sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
}

function sessionsSignature(sessions: EvaluationSession[]) {
  return sessions
    .map((session) => `${session.id}:${session.updatedAt}`)
    .sort()
    .join("|");
}

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function buildCsv(sessions: EvaluationSession[]) {
  const shapedSessions = sessions.map(ensureSessionShape);
  const victimIds = Array.from(
    new Set(
      shapedSessions.length
        ? shapedSessions.flatMap((session) =>
            getDayConfig(session.day).victims.map((victim) => victim.id),
          )
        : allConfiguredVictimIds(),
    ),
  );
  const victimHeaders = victimIds.flatMap((victimId) => [
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

  shapedSessions.forEach((session) => {
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
            ...victimIds.flatMap((victimId) => {
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

function chunkVictims(victims: VictimRecord[], size = 5): VictimGroup[] {
  const groups: VictimGroup[] = [];
  for (let index = 0; index < victims.length; index += size) {
    const group = victims.slice(index, index + size);
    const first = group[0]?.id ?? "";
    const last = group[group.length - 1]?.id ?? "";
    groups.push({
      key: `${first}-${last}`,
      label: first === last ? first : `${first}-${last}`,
      victims: group,
    });
  }
  return groups;
}

function scoreValue(value: ScoreValue | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function clampScore(value: string, max: number): ScoreValue {
  if (value.trim() === "") {
    return "";
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "";
  }

  return Math.min(max, Math.max(0, numeric));
}

function percentLabel(value: number) {
  return `${Math.round(value * 100)}%`;
}

function gradeFor(percent: number) {
  if (percent >= 0.9) {
    return "Excellent";
  }
  if (percent >= 0.8) {
    return "Very Good";
  }
  if (percent >= 0.75) {
    return "Passed";
  }
  if (percent >= 0.6) {
    return "Needs Review";
  }
  return "Remedial";
}

function monthKey(date: string) {
  return date ? date.slice(0, 7) : "No date";
}

function yearKey(date: string) {
  return date ? date.slice(0, 4) : "No date";
}

function dateTimeLabel(value: string) {
  if (!value) {
    return "Never";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Never";
  }

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function ScoreStepper({ label, max, value, onChange }: ScoreStepperProps) {
  const numericValue = scoreValue(value);
  const displayValue = value ?? "";

  return (
    <div className="score-stepper">
      <div className="score-stepper-label">
        <span>{label}</span>
        <strong>
          {numericValue}/{max}
        </strong>
      </div>
      <div className="score-stepper-controls">
        <button
          className="icon-button score-step-button"
          type="button"
          title={`Decrease ${label}`}
          aria-label={`Decrease ${label}`}
          onClick={() => onChange(String(Math.max(0, numericValue - 1)))}
          disabled={numericValue <= 0}
        >
          <Minus size={16} aria-hidden="true" />
        </button>
        <input
          inputMode="decimal"
          min="0"
          max={max}
          type="number"
          value={displayValue}
          onChange={(event) => onChange(event.target.value)}
          placeholder={`/${max}`}
          aria-label={label}
        />
        <button
          className="icon-button score-step-button"
          type="button"
          title={`Increase ${label}`}
          aria-label={`Increase ${label}`}
          onClick={() => onChange(String(Math.min(max, numericValue + 1)))}
          disabled={numericValue >= max}
        >
          <Plus size={16} aria-hidden="true" />
        </button>
        <button
          className="score-preset-button"
          type="button"
          onClick={() => onChange("0")}
        >
          0
        </button>
        <button
          className="score-preset-button"
          type="button"
          onClick={() => onChange(String(max))}
        >
          Max
        </button>
      </div>
    </div>
  );
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
  const [cloudSyncKey, setCloudSyncKey] = useState("");
  const [cloudStatus, setCloudStatus] = useState<CloudSyncState>("local");
  const [cloudMessage, setCloudMessage] = useState("Local-only storage is active.");
  const [lastCloudSync, setLastCloudSync] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(() => monthKey(todayInputValue()));
  const [selectedTrainingDate, setSelectedTrainingDate] = useState<string | null>(null);
  const [scorebookOverrides, setScorebookOverrides] = useState<
    Record<string, ScorebookOverride>
  >({});
  const [activeMethodFilter, setActiveMethodFilter] = useState<Method | "ALL">("ALL");
  const [activeVictimGroup, setActiveVictimGroup] = useState<number | "ALL">("ALL");
  const [openVictimGroups, setOpenVictimGroups] = useState<Record<string, boolean>>({});
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [installBannerOpen, setInstallBannerOpen] = useState(true);
  const [standalone, setStandalone] = useState(false);
  const [online, setOnline] = useState(true);
  const [offlineReady, setOfflineReady] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cloudSignatureRef = useRef("");

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) {
        return;
      }

      const savedSessions = localStorage.getItem(SESSION_KEY);
      const savedDraft = localStorage.getItem(DRAFT_KEY);
      const savedScorebook = localStorage.getItem(SCOREBOOK_KEY);
      const savedCloudSyncKey = localStorage.getItem(CLOUD_SYNC_KEY) ?? "";
      const savedLastCloudSync = localStorage.getItem(CLOUD_LAST_SYNC_KEY) ?? "";
      const parsedSessions = parseStoredJson<unknown[]>(savedSessions, []);
      const parsedDraft = parseStoredJson<unknown>(savedDraft, null);
      const parsedScorebook = parseStoredJson<unknown>(savedScorebook, {});
      const currentDraft = isSessionLike(parsedDraft) ? ensureSessionShape(parsedDraft) : null;
      const shapedSessions = Array.isArray(parsedSessions)
        ? parsedSessions.filter(isSessionLike).map(ensureSessionShape)
        : [];
      const recoveredDrafts = LEGACY_DRAFT_KEYS.map((key) =>
        parseStoredJson<unknown>(localStorage.getItem(key), null),
      )
        .filter(isSessionLike)
        .map(freezeRunningTimers)
        .filter(sessionHasData);
      const sessionsById = new Map(shapedSessions.map((item) => [item.id, item]));
      const newlyRecovered = recoveredDrafts.filter((draft) => !sessionsById.has(draft.id));

      newlyRecovered.forEach((draft) => sessionsById.set(draft.id, draft));
      setSessions(
        Array.from(sessionsById.values()).sort((a, b) =>
          b.updatedAt.localeCompare(a.updatedAt),
        ),
      );
      setSession(
        currentDraft && sessionHasData(currentDraft)
          ? currentDraft
          : newlyRecovered[0] || recoveredDrafts[0] || currentDraft || createSession(),
      );
      setScorebookOverrides(
        isRecord(parsedScorebook)
          ? (parsedScorebook as Record<string, ScorebookOverride>)
          : {},
      );
      setCloudSyncKey(savedCloudSyncKey);
      setLastCloudSync(savedLastCloudSync);
      setCloudStatus(savedCloudSyncKey ? "ready" : "local");
      setCloudMessage(
        savedCloudSyncKey
          ? "Cloud sync key is saved on this device."
          : "Local-only storage is active.",
      );
      setAdminPasscodeExists(Boolean(localStorage.getItem(ADMIN_KEY)));
      if (newlyRecovered.length > 0) {
        setStatus(
          `Recovered ${newlyRecovered.length} older draft${
            newlyRecovered.length > 1 ? "s" : ""
          }. Check Admin saved records.`,
        );
      }
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
    let cancelled = false;
    const verifyOnlineState = async () => {
      try {
        const response = await fetch(`/manifest.webmanifest?live=${Date.now()}`, {
          cache: "no-store",
        });
        if (!cancelled) {
          setOnline(response.ok);
        }
      } catch {
        if (!cancelled) {
          setOnline(false);
        }
      }
    };
    const updateOnlineState = () => {
      void verifyOnlineState();
    };

    updateOnlineState();
    const interval = window.setInterval(updateOnlineState, 30000);
    window.addEventListener("online", updateOnlineState);
    window.addEventListener("offline", updateOnlineState);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("online", updateOnlineState);
      window.removeEventListener("offline", updateOnlineState);
    };
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    let cancelled = false;
    const markReady = () => {
      if (!cancelled) {
        setOfflineReady(true);
      }
    };

    navigator.serviceWorker.ready.then(markReady).catch(() => undefined);
    if (navigator.serviceWorker.controller) {
      markReady();
    }
    navigator.serviceWorker.addEventListener("controllerchange", markReady);

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener("controllerchange", markReady);
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

  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(SCOREBOOK_KEY, JSON.stringify(scorebookOverrides));
    }
  }, [hydrated, scorebookOverrides]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const trimmedKey = cloudSyncKey.trim();
    if (trimmedKey) {
      localStorage.setItem(CLOUD_SYNC_KEY, trimmedKey);
      return;
    }

    localStorage.removeItem(CLOUD_SYNC_KEY);
  }, [cloudSyncKey, hydrated]);

  useEffect(() => {
    if (!hydrated || !online || !cloudSyncKey.trim() || sessions.length === 0) {
      return;
    }

    const signature = sessionsSignature(sessions);
    if (cloudSignatureRef.current === signature) {
      return;
    }

    const timeout = window.setTimeout(() => {
      const syncQuietly = async () => {
        try {
          const response = await fetch("/api/triage-sync", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${cloudSyncKey.trim()}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ sessions: sessions.map(normalizeTimers) }),
          });

          if (response.ok) {
            const stamp = new Date().toISOString();
            cloudSignatureRef.current = signature;
            localStorage.setItem(CLOUD_LAST_SYNC_KEY, stamp);
            setLastCloudSync(stamp);
            setCloudStatus("synced");
            setCloudMessage("Cloud sync is up to date.");
          }
        } catch {
          setCloudStatus("error");
          setCloudMessage("Cloud sync paused. Saved sheets remain on this device.");
        }
      };

      void syncQuietly();
    }, 1600);

    return () => window.clearTimeout(timeout);
  }, [cloudSyncKey, hydrated, online, sessions]);

  const dayKey = session?.day ?? "day1";
  const dayConfig = getDayConfig(dayKey);
  const activeMember = session?.members[activeMemberIndex] ?? null;
  const visibleMethods =
    activeMethodFilter === "ALL" || !dayConfig.methods.includes(activeMethodFilter)
      ? dayConfig.methods
      : [activeMethodFilter];
  const victimGroups = useMemo(() => chunkVictims(getDayConfig(dayKey).victims), [dayKey]);
  const visibleVictimGroups =
    activeVictimGroup === "ALL"
      ? victimGroups
      : victimGroups[activeVictimGroup]
        ? [victimGroups[activeVictimGroup]]
        : victimGroups;
  const activeStats = useMemo(() => {
    if (!activeMember) {
      return null;
    }

    const config = getDayConfig(dayKey);
    return Object.fromEntries(
      config.methods.map((method) => [
        method,
        scoreMember(activeMember, config, method, now),
      ]),
    ) as Record<Method, ReturnType<typeof scoreMember>>;
  }, [activeMember, dayKey, now]);

  const dayScoreSummaries = useMemo(() => {
    if (!session || !activeMember) {
      return [];
    }

    const shapedSession = ensureSessionShape(session);
    const shapedSavedSessions = sessions.map(ensureSessionShape);
    const activeName = activeMember.name.trim().toLowerCase();

    return DAYS.map((day) => {
      const config = getDayConfig(day.key);
      const sortedSavedSessions = shapedSavedSessions
        .filter((savedSession) => savedSession.day === day.key)
        .sort(
          (left, right) =>
            new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
        );
      const sourceSession =
        shapedSession.day === day.key ? shapedSession : sortedSavedSessions[0] ?? null;
      const matchedMember =
        sourceSession?.day === shapedSession.day
          ? sourceSession.members[activeMemberIndex]
          : sourceSession?.members.find(
              (member) => activeName && member.name.trim().toLowerCase() === activeName,
            ) ??
            sourceSession?.members[activeMemberIndex] ??
            null;
      const methodScores = config.methods.map((method) =>
        matchedMember
          ? scoreMember(matchedMember, config, method, now)
          : {
              attempted: 0,
              correct: 0,
              total: config.victims.length,
              accuracy: 0,
              timeSeconds: 0,
            },
      );
      const correct = methodScores.reduce((total, score) => total + score.correct, 0);
      const total = config.victims.length * config.methods.length;
      const sourceLabel =
        sourceSession?.id === shapedSession.id
          ? "Current sheet"
          : sourceSession
            ? "Latest saved sheet"
            : "No saved sheet";

      return {
        dayKey: day.key,
        label: day.label,
        correct,
        total,
        percent: total ? correct / total : 0,
        sourceLabel,
        methodText: config.methods
          .map((method, index) => `${method} ${methodScores[index].correct}`)
          .join(" | "),
      };
    });
  }, [activeMember, activeMemberIndex, now, session, sessions]);

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

  const scorebookRows = useMemo(() => {
    return sessions.map(ensureSessionShape).flatMap((savedSession) => {
      const config = getDayConfig(savedSession.day);
      return savedSession.members
        .filter((member) => memberHasData(member, config.methods))
        .map((member, memberIndex) => {
          const rowId = `${savedSession.id}:${member.id}`;
          const override = scorebookOverrides[rowId] ?? {};
          const quizScores = Object.fromEntries(
            QUIZ_CONFIGS.map((quiz) => [
              quiz.key,
              override.quizScores?.[quiz.key] ?? 0,
            ]),
          ) as Record<QuizKey, ScoreValue>;
          const simulationScores = Object.fromEntries(
            config.methods.map((method) => {
              const autoScore = scoreMember(member, config, method, now).correct;
              return [
                method,
                override.simulationScores?.[method] ?? autoScore,
              ];
            }),
          ) as Partial<Record<Method, ScoreValue>>;
          const examPercent = QUIZ_CONFIGS.reduce((total, quiz) => {
            return total + (scoreValue(quizScores[quiz.key]) / quiz.max) * quiz.weight;
          }, 0);
          const simulationPercents = config.methods.map(
            (method) =>
              scoreValue(simulationScores[method]) / config.victims.length,
          );
          const simulationPercent = average(simulationPercents);
          const finalPercent = (examPercent + simulationPercent) / 2;

          return {
            rowId,
            session: savedSession,
            config,
            member,
            memberIndex,
            participantName:
              override.participantName || member.name || `Member ${memberIndex + 1}`,
            trainingName: override.trainingName || savedSession.teamName || config.label,
            trainingDate: override.trainingDate ?? savedSession.evaluationDate,
            quizScores,
            simulationScores,
            examPercent,
            simulationPercent,
            finalPercent,
            grade: gradeFor(finalPercent),
            comments: override.comments ?? "",
          };
        });
    });
  }, [sessions, scorebookOverrides, now]);

  const scorebookAnalytics = useMemo(() => {
    const rows = scorebookRows;
    const participantCount = rows.length;
    const meanFinal = average(rows.map((row) => row.finalPercent));
    const meanExam = average(rows.map((row) => row.examPercent));
    const meanSimulation = average(rows.map((row) => row.simulationPercent));
    const passRate = participantCount
      ? rows.filter((row) => row.finalPercent >= 0.75).length / participantCount
      : 0;
    const topScorers = [...rows]
      .sort((a, b) => b.finalPercent - a.finalPercent)
      .slice(0, 3);
    const gradeCounts = Object.fromEntries(
      GRADE_LABELS.map((label) => [
        label,
        rows.filter((row) => row.grade === label).length,
      ]),
    ) as Record<string, number>;
    const summarize = (keyer: (row: (typeof rows)[number]) => string) => {
      return Object.values(
        rows.reduce(
          (groups, row) => {
            const key = keyer(row);
            groups[key] ??= { key, rows: [] as typeof rows };
            groups[key].rows.push(row);
            return groups;
          },
          {} as Record<string, { key: string; rows: typeof rows }>,
        ),
      )
        .map((group) => ({
          key: group.key,
          participants: group.rows.length,
          meanFinal: average(group.rows.map((row) => row.finalPercent)),
          meanExam: average(group.rows.map((row) => row.examPercent)),
          meanSimulation: average(group.rows.map((row) => row.simulationPercent)),
          topName:
            [...group.rows].sort((a, b) => b.finalPercent - a.finalPercent)[0]
              ?.participantName ?? "None",
        }))
        .sort((a, b) => b.key.localeCompare(a.key));
    };

    return {
      participantCount,
      meanFinal,
      meanExam,
      meanSimulation,
      passRate,
      topScorers,
      gradeCounts,
      byMonth: summarize((row) => monthKey(row.trainingDate)),
      byTraining: summarize((row) => row.trainingName || row.config.label),
      byYear: summarize((row) => yearKey(row.trainingDate)),
    };
  }, [scorebookRows]);

  const trainingCalendarStats = useMemo(() => {
    const groups = new Map<
      string,
      {
        participants: number;
        sessionIds: Set<string>;
        finalScores: number[];
        trainings: Set<string>;
      }
    >();

    scorebookRows.forEach((row) => {
      const date = normalizedDateKey(row.trainingDate);
      if (!date) {
        return;
      }

      const group =
        groups.get(date) ??
        {
          participants: 0,
          sessionIds: new Set<string>(),
          finalScores: [],
          trainings: new Set<string>(),
        };
      group.participants += 1;
      group.sessionIds.add(row.session.id);
      group.finalScores.push(row.finalPercent);
      group.trainings.add(row.trainingName || row.config.label);
      groups.set(date, group);
    });

    return new Map(
      Array.from(groups.entries()).map(([date, group]) => [
        date,
        {
          date,
          participants: group.participants,
          sessions: group.sessionIds.size,
          meanFinal: average(group.finalScores),
          trainings: Array.from(group.trainings).sort(),
        },
      ]),
    ) as Map<string, CalendarDateStats>;
  }, [scorebookRows]);

  const selectedTrainingStats = selectedTrainingDate
    ? trainingCalendarStats.get(selectedTrainingDate)
    : null;
  const trainingCalendarCells = useMemo(
    () => calendarCells(calendarMonth, trainingCalendarStats),
    [calendarMonth, trainingCalendarStats],
  );
  const visibleScorebookRows = useMemo(() => {
    if (!selectedTrainingDate) {
      return scorebookRows;
    }

    return scorebookRows.filter(
      (row) => normalizedDateKey(row.trainingDate) === selectedTrainingDate,
    );
  }, [scorebookRows, selectedTrainingDate]);

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

  function clearActiveMember() {
    if (!activeMember) {
      return;
    }

    const hasActiveScores = dayConfig.methods.some((method) => {
      const record = activeMember[method];
      return (
        timerMs(record.timer) > 0 ||
        dayConfig.victims.some((victim) => record.answers[victim.id])
      );
    });

    if (
      hasActiveScores &&
      !window.confirm("Clear all selected tags and timers for this member?")
    ) {
      return;
    }

    updateMember(activeMember.id, (member) => {
      const cleared = { ...member } as MemberRecord;
      dayConfig.methods.forEach((method) => {
        cleared[method] = createMethodRecord();
      });
      return cleared;
    });
    setStatus(`Cleared all scores for ${activeMember.name || `Member ${activeMemberIndex + 1}`}.`);
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
    setSession((current) => createCleanSessionForDay(day, current));
    setActiveMemberIndex(0);
    setActiveMethodFilter("ALL");
    setActiveVictimGroup("ALL");
    setOpenVictimGroups({});
    setStatus(`${getDayConfig(day).label} score sheet ready with 0 scores.`);
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

  async function callCloudSync(
    method: "GET" | "POST",
    body?: Record<string, unknown>,
  ): Promise<CloudSyncResponse> {
    const trimmedKey = cloudSyncKey.trim();
    if (!trimmedKey) {
      throw new Error("Add the cloud sync key first.");
    }

    const response = await fetch("/api/triage-sync", {
      method,
      headers: {
        Authorization: `Bearer ${trimmedKey}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const payload = (await response.json().catch(() => ({}))) as CloudSyncResponse;

    if (!response.ok) {
      const missing = payload.missing?.length
        ? ` Missing: ${payload.missing.join(", ")}.`
        : "";
      throw new Error(`${payload.message ?? "Cloud sync failed."}${missing}`);
    }

    return payload;
  }

  function rememberCloudSync() {
    const stamp = new Date().toISOString();
    localStorage.setItem(CLOUD_LAST_SYNC_KEY, stamp);
    setLastCloudSync(stamp);
  }

  function mergeCloudPayload(payload: CloudSyncResponse, mergeScorebook = true) {
    const incomingSessions = Array.isArray(payload.sessions)
      ? payload.sessions.filter(isSessionLike).map(ensureSessionShape)
      : [];

    if (incomingSessions.length) {
      setSessions((current) => mergeSessionsByUpdatedAt(current, incomingSessions));
    }

    if (mergeScorebook && isRecord(payload.scorebookOverrides)) {
      setScorebookOverrides((current) => ({
        ...(payload.scorebookOverrides as Record<string, ScorebookOverride>),
        ...current,
      }));
    }

    return incomingSessions.length;
  }

  async function pushCloudSessions(
    records: EvaluationSession[],
    options: { includeScorebook?: boolean; silent?: boolean; signature?: string } = {},
  ) {
    if (!cloudSyncKey.trim()) {
      if (!options.silent) {
        setCloudStatus("local");
        setCloudMessage("Add the cloud sync key first.");
      }
      return false;
    }

    if (!online) {
      if (!options.silent) {
        setCloudStatus("error");
        setCloudMessage("You are offline. Saved sheets will sync when internet is back.");
      }
      return false;
    }

    if (!options.silent) {
      setCloudStatus("syncing");
      setCloudMessage("Syncing saved sheets to Supabase...");
    }

    try {
      const payload = await callCloudSync("POST", {
        sessions: records.map(normalizeTimers),
        ...(options.includeScorebook ? { scorebookOverrides } : {}),
      });
      if (options.signature) {
        cloudSignatureRef.current = options.signature;
      }
      rememberCloudSync();
      setCloudStatus("synced");
      setCloudMessage(
        `Cloud synced ${payload.saved ?? records.length} saved sheet${
          (payload.saved ?? records.length) === 1 ? "" : "s"
        }.`,
      );
      return true;
    } catch (error) {
      setCloudStatus("error");
      setCloudMessage(error instanceof Error ? error.message : "Cloud sync failed.");
      return false;
    }
  }

  async function pullCloudRecords() {
    if (!cloudSyncKey.trim()) {
      setCloudStatus("local");
      setCloudMessage("Add the cloud sync key first.");
      return;
    }

    if (!online) {
      setCloudStatus("error");
      setCloudMessage("You are offline. Pull cloud records once internet is back.");
      return;
    }

    setCloudStatus("syncing");
    setCloudMessage("Pulling Supabase records...");

    try {
      const payload = await callCloudSync("GET");
      const count = mergeCloudPayload(payload);
      rememberCloudSync();
      setCloudStatus("synced");
      setCloudMessage(
        count
          ? `Pulled ${count} cloud record${count === 1 ? "" : "s"}.`
          : "No new cloud records found.",
      );
      setAdminMessage(
        count
          ? `Pulled ${count} cloud record${count === 1 ? "" : "s"}.`
          : "No new cloud records found.",
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Cloud pull failed.";
      setCloudStatus("error");
      setCloudMessage(message);
      setAdminMessage(message);
    }
  }

  async function syncCloudNow() {
    setCloudStatus("syncing");
    setCloudMessage("Syncing all saved sheets and scorebook...");
    const pushed = await pushCloudSessions(sessions, {
      includeScorebook: true,
      signature: sessionsSignature(sessions),
    });
    if (pushed) {
      await pullCloudRecords();
    }
  }

  function selectCalendarDate(date: string) {
    setCalendarMonth(monthKey(date));
    setSelectedTrainingDate((current) => (current === date ? null : date));
  }

  function clearCalendarFilter() {
    setSelectedTrainingDate(null);
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
    void pushCloudSessions([frozen], { silent: true });
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
    setActiveMethodFilter("ALL");
    setActiveVictimGroup("ALL");
    setOpenVictimGroups({});
    setStatus(`New ${dayConfig.label} sheet ready.`);
  }

  function exportCurrent(format: "csv" | "json") {
    if (!session) {
      return;
    }

    const frozen = normalizeTimers(session);
    const config = getDayConfig(frozen.day);
    if (format === "csv") {
      downloadFile(
        `${config.label.toLowerCase().replaceAll(" ", "-")}-triage-current.csv`,
        buildCsv([frozen]),
        "text/csv",
      );
      return;
    }

    downloadFile(
      `${config.label.toLowerCase().replaceAll(" ", "-")}-triage-current.json`,
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

  function updateScorebookOverride(
    rowId: string,
    updater: (current: ScorebookOverride) => ScorebookOverride,
  ) {
    setScorebookOverrides((current) => ({
      ...current,
      [rowId]: updater(current[rowId] ?? {}),
    }));
  }

  function setScorebookText(
    rowId: string,
    key: "participantName" | "trainingName" | "trainingDate" | "comments",
    value: string,
  ) {
    updateScorebookOverride(rowId, (current) => ({ ...current, [key]: value }));
  }

  function setQuizScore(rowId: string, quizKey: QuizKey, value: string) {
    const quiz = QUIZ_CONFIGS.find((item) => item.key === quizKey);
    updateScorebookOverride(rowId, (current) => ({
      ...current,
      quizScores: {
        ...(current.quizScores ?? {}),
        [quizKey]: clampScore(value, quiz?.max ?? 100),
      },
    }));
  }

  function setSimulationScore(rowId: string, method: Method, value: string, max: number) {
    updateScorebookOverride(rowId, (current) => ({
      ...current,
      simulationScores: {
        ...(current.simulationScores ?? {}),
        [method]: clampScore(value, max),
      },
    }));
  }

  function exportScorebook() {
    const rows: (string | number)[][] = [
      [
        "training_date",
        "training",
        "day",
        "participant",
        ...QUIZ_CONFIGS.flatMap((quiz) => [
          `${quiz.key}_score`,
          `${quiz.key}_percent`,
        ]),
        "exam_percent",
        ...ALL_METHODS.flatMap((method) => [`${method}_score`, `${method}_percent`]),
        "simulation_percent",
        "final_percent",
        "grade",
        "comments",
      ],
    ];

    scorebookRows.forEach((row) => {
      rows.push([
        row.trainingDate,
        row.trainingName,
        row.config.label,
        row.participantName,
        ...QUIZ_CONFIGS.flatMap((quiz) => {
          const score = scoreValue(row.quizScores[quiz.key]);
          return [score, Math.round((score / quiz.max) * 100)];
        }),
        Math.round(row.examPercent * 100),
        ...ALL_METHODS.flatMap((method) => {
          const score = scoreValue(row.simulationScores[method]);
          const percent = row.config.methods.includes(method)
            ? Math.round((score / row.config.victims.length) * 100)
            : "";
          return [row.config.methods.includes(method) ? score : "", percent];
        }),
        Math.round(row.simulationPercent * 100),
        Math.round(row.finalPercent * 100),
        row.grade,
        row.comments,
      ]);
    });

    downloadFile("mci-triage-scorebook-analytics.csv", rows.map((row) => row.map(csvCell).join(",")).join("\n"), "text/csv");
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
        <div className="topbar-actions">
          <span className={online ? "connection-pill online" : "connection-pill offline"}>
            {online ? (
              <Wifi size={16} aria-hidden="true" />
            ) : (
              <WifiOff size={16} aria-hidden="true" />
            )}
            {online ? (offlineReady ? "Live online" : "Online") : "Offline mode"}
          </span>
          {installPrompt ? (
            <button className="ghost-button" type="button" onClick={installApp}>
              <Download size={18} aria-hidden="true" />
              Install
            </button>
          ) : null}
        </div>
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

      <section className="workspace-layout">
        <aside className="control-panel" aria-label="Score sheet controls">
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

              <section className="action-bar" aria-live="polite">
                <button className="primary-button" type="button" onClick={saveCurrent}>
                  <Save size={18} aria-hidden="true" />
                  Save Sheet
                </button>
                <button className="ghost-button" type="button" onClick={() => exportCurrent("csv")}>
                  <FileDown size={18} aria-hidden="true" />
                  Export Sheet
                </button>
                <button className="ghost-button" type="button" onClick={() => exportCurrent("json")}>
                  <Download size={18} aria-hidden="true" />
                  Export JSON
                </button>
                <button className="ghost-button" type="button" onClick={clearActiveMember}>
                  <RotateCcw size={18} aria-hidden="true" />
                  Clear All
                </button>
                <button className="ghost-button" type="button" onClick={createNewSheet}>
                  <Plus size={18} aria-hidden="true" />
                  New Sheet
                </button>
                {status ? <span>{status}</span> : null}
              </section>
            </>
          ) : (
            <section className="control-note">
              <div className="section-title">
                <ShieldCheck size={20} aria-hidden="true" />
                <h2>Admin Mode</h2>
              </div>
              <p>
                Review saved sheets, import JSON exports from evaluator devices, and export
                combined analytics.
              </p>
            </section>
          )}
        </aside>

        <section className="workspace-main">
          {view === "evaluation" ? (
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

              <section className="day-score-summary" aria-label="Day score summary">
                {dayScoreSummaries.map((summary) => (
                  <article
                    className={summary.dayKey === session.day ? "active" : ""}
                    key={summary.dayKey}
                  >
                    <span>{summary.label} Score</span>
                    <strong>
                      {summary.correct}/{summary.total} pts
                    </strong>
                    <small>{`${percentLabel(summary.percent)} | ${summary.methodText}`}</small>
                    <em>{summary.sourceLabel}</em>
                  </article>
                ))}
              </section>

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

              <section className="scoring-menu" aria-label="Scoring menu">
                <div>
                  <span>Method</span>
                  <div className="method-tabs" role="tablist" aria-label="Filter scoring method">
                    <button
                      className={activeMethodFilter === "ALL" ? "active" : ""}
                      type="button"
                      onClick={() => setActiveMethodFilter("ALL")}
                    >
                      All
                    </button>
                    {dayConfig.methods.map((method) => (
                      <button
                        className={activeMethodFilter === method ? "active" : ""}
                        key={method}
                        type="button"
                        onClick={() => setActiveMethodFilter(method)}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <span>Victims</span>
                  <div className="victim-range-menu" aria-label="Victim range menu">
                    <button
                      className={activeVictimGroup === "ALL" ? "active" : ""}
                      type="button"
                      onClick={() => setActiveVictimGroup("ALL")}
                    >
                      All
                    </button>
                    {victimGroups.map((group, index) => (
                      <button
                        className={activeVictimGroup === index ? "active" : ""}
                        key={group.key}
                        type="button"
                        onClick={() => setActiveVictimGroup(index)}
                      >
                        {group.label}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <div className="victim-groups">
                {visibleVictimGroups.map((group, groupIndex) => {
                  const groupStateKey = `${dayConfig.key}:${group.key}`;
                  const groupOpen =
                    openVictimGroups[groupStateKey] ??
                    (activeVictimGroup !== "ALL" || groupIndex === 0);
                  return (
                    <details
                      className="victim-group"
                      key={`${dayConfig.key}-${activeVictimGroup}-${group.key}`}
                      onToggle={(event) => {
                        const isOpen = event.currentTarget.open;
                        setOpenVictimGroups((current) => ({
                          ...current,
                          [groupStateKey]: isOpen,
                        }));
                      }}
                      open={groupOpen}
                    >
                      <summary>
                        <span>{group.label}</span>
                        <strong>
                          {group.victims.reduce(
                            (total, victim) =>
                              total +
                              visibleMethods.filter(
                                (method) => activeMember[method].answers[victim.id],
                              ).length,
                            0,
                          )}
                          /{group.victims.length * visibleMethods.length} tagged
                        </strong>
                      </summary>
                      <div className="victim-list">
                      {group.victims.map((victim) => (
                        <article
                          className={`victim-card methods-${visibleMethods.length}`}
                          key={victim.id}
                        >
                          <div className="victim-key">
                            <strong>{victim.id}</strong>
                            <div>
                              {visibleMethods.map((method) => (
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
                            {visibleMethods.map((method) =>
                              victim.correct[method]?.note ? (
                                <small key={method}>
                                  {`${method}: ${victim.correct[method]?.note}`}
                                </small>
                              ) : null,
                            )}
                          </div>

                          <div className="answer-grid">
                            {visibleMethods.map((method) => {
                              const selected = activeMember[method].answers[victim.id];
                              const isCorrect =
                                selected &&
                                (victim.correct[method]?.tags ?? []).includes(selected);
                              return (
                                <div className="answer-block" key={method}>
                                  <div className="answer-heading">
                                    <span>{method}</span>
                                    <strong
                                      className={isCorrect ? "correct" : selected ? "wrong" : ""}
                                    >
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
                                        onClick={() =>
                                          setAnswer(activeMember.id, method, victim.id, tag)
                                        }
                                      >
                                        {TAG_LABELS[tag]}
                                      </button>
                                    ))}
                                    <button
                                      className="clear-tag"
                                      type="button"
                                      onClick={() =>
                                        setAnswer(activeMember.id, method, victim.id, "")
                                      }
                                    >
                                      Clear
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </article>
                      ))}
                      </div>
                    </details>
                  );
                })}
              </div>
              <div className="bottom-quick-actions" aria-label="Bottom score sheet actions">
                <button className="primary-button" type="button" onClick={saveCurrent}>
                  <Save size={18} aria-hidden="true" />
                  Save Sheet
                </button>
                <button className="ghost-button" type="button" onClick={() => exportCurrent("csv")}>
                  <FileDown size={18} aria-hidden="true" />
                  Export Sheet
                </button>
                <button
                  className="ghost-button danger-ghost"
                  type="button"
                  onClick={clearActiveMember}
                >
                  <RotateCcw size={18} aria-hidden="true" />
                  Clear All
                </button>
              </div>
            </section>
            </section>
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
                  <button className="ghost-button" type="button" onClick={exportScorebook}>
                    <Calculator size={18} aria-hidden="true" />
                    Export Scorebook
                  </button>
                </div>
              </div>

              <section className="cloud-sync-card">
                <div className="cloud-sync-head">
                  <div className="section-title">
                    <Cloud size={20} aria-hidden="true" />
                    <h3>Supabase Cloud Sync</h3>
                  </div>
                  <span className={`sync-status-pill ${cloudStatus}`}>
                    {CLOUD_STATUS_LABELS[cloudStatus]}
                  </span>
                </div>
                <div className="cloud-sync-grid">
                  <label>
                    Sync Key
                    <input
                      type="password"
                      value={cloudSyncKey}
                      onChange={(event) => {
                        const value = event.target.value;
                        setCloudSyncKey(value);
                        if (value.trim()) {
                          setCloudStatus((current) =>
                            current === "local" ? "ready" : current,
                          );
                          setCloudMessage("Cloud sync key is saved on this device.");
                          return;
                        }

                        setCloudStatus("local");
                        setCloudMessage("Local-only storage is active.");
                      }}
                      placeholder="Enter shared sync key"
                      autoComplete="off"
                    />
                  </label>
                  <div className="cloud-sync-actions">
                    <button
                      className="primary-button"
                      type="button"
                      onClick={() => void syncCloudNow()}
                      disabled={cloudStatus === "syncing"}
                    >
                      <RefreshCw size={18} aria-hidden="true" />
                      Sync Now
                    </button>
                    <button
                      className="ghost-button"
                      type="button"
                      onClick={() => void pullCloudRecords()}
                      disabled={cloudStatus === "syncing"}
                    >
                      <Download size={18} aria-hidden="true" />
                      Pull Records
                    </button>
                  </div>
                </div>
                <p className="cloud-sync-message">
                  {cloudMessage} Last sync: {dateTimeLabel(lastCloudSync)}.
                </p>
              </section>

              <section className="training-calendar-card">
                <div className="calendar-toolbar">
                  <div className="section-title">
                    <CalendarDays size={20} aria-hidden="true" />
                    <h3>Training Calendar</h3>
                  </div>
                  <div className="calendar-month-controls">
                    <button
                      className="icon-button"
                      type="button"
                      title="Previous month"
                      aria-label="Previous month"
                      onClick={() => setCalendarMonth((current) => addMonths(current, -1))}
                    >
                      <ChevronLeft size={17} aria-hidden="true" />
                    </button>
                    <strong>{monthLabel(calendarMonth)}</strong>
                    <button
                      className="icon-button"
                      type="button"
                      title="Next month"
                      aria-label="Next month"
                      onClick={() => setCalendarMonth((current) => addMonths(current, 1))}
                    >
                      <ChevronRight size={17} aria-hidden="true" />
                    </button>
                    <button
                      className="ghost-button compact-button"
                      type="button"
                      onClick={() => {
                        setCalendarMonth(monthKey(todayInputValue()));
                        clearCalendarFilter();
                      }}
                    >
                      Today
                    </button>
                  </div>
                </div>

                <div className="training-calendar-layout">
                  <div className="training-calendar-grid">
                    <div className="calendar-weekdays" aria-hidden="true">
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                        <span key={day}>{day}</span>
                      ))}
                    </div>
                    <div className="calendar-days">
                      {trainingCalendarCells.map((cell) => {
                        const isSelected = selectedTrainingDate === cell.date;
                        const hasData = Boolean(cell.stats);

                        return (
                          <button
                            className={`calendar-day ${cell.inMonth ? "" : "muted"} ${
                              hasData ? "has-data" : ""
                            } ${isSelected ? "selected" : ""} ${cell.isToday ? "today" : ""}`}
                            key={cell.key}
                            type="button"
                            onClick={() => selectCalendarDate(cell.date)}
                          >
                            <time dateTime={cell.date}>{cell.day}</time>
                            {cell.stats ? (
                              <>
                                <span>{cell.stats.participants} pax</span>
                                <small>{percentLabel(cell.stats.meanFinal)}</small>
                              </>
                            ) : (
                              <i aria-hidden="true" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <aside className="calendar-summary-card">
                    <span>{selectedTrainingDate ?? "All Dates"}</span>
                    <strong>
                      {selectedTrainingStats
                        ? `${selectedTrainingStats.participants} participants`
                        : `${scorebookAnalytics.participantCount} participants`}
                    </strong>
                    <small>
                      {selectedTrainingStats
                        ? `${selectedTrainingStats.sessions} sheet${
                            selectedTrainingStats.sessions === 1 ? "" : "s"
                          } | ${percentLabel(selectedTrainingStats.meanFinal)} mean final`
                        : `${trainingCalendarStats.size} date${
                            trainingCalendarStats.size === 1 ? "" : "s"
                          } with records`}
                    </small>
                    {selectedTrainingStats ? (
                      <div className="calendar-training-list">
                        {selectedTrainingStats.trainings.slice(0, 4).map((training) => (
                          <em key={training}>{training}</em>
                        ))}
                      </div>
                    ) : null}
                    {selectedTrainingDate ? (
                      <button
                        className="ghost-button compact-button"
                        type="button"
                        onClick={clearCalendarFilter}
                      >
                        Show All
                      </button>
                    ) : null}
                  </aside>
                </div>
              </section>

              <section className="scorebook-area">
                <div className="scorebook-head">
                  <div className="section-title">
                    <Calculator size={20} aria-hidden="true" />
                    <h3>Quiz and Simulation Scorebook</h3>
                  </div>
                  <p>
                    Quiz scores are manual inputs. Simulation scores are auto-filled from saved
                    score sheets and can still be edited.
                  </p>
                </div>

                <div className="metric-grid scorebook-metrics">
                  <article>
                    <span>Scorebook Participants</span>
                    <strong>{scorebookAnalytics.participantCount}</strong>
                  </article>
                  <article>
                    <span>Mean Final Score</span>
                    <strong>{percentLabel(scorebookAnalytics.meanFinal)}</strong>
                  </article>
                  <article>
                    <span>Mean Quiz Score</span>
                    <strong>{percentLabel(scorebookAnalytics.meanExam)}</strong>
                  </article>
                  <article>
                    <span>Passing Rate</span>
                    <strong>{percentLabel(scorebookAnalytics.passRate)}</strong>
                  </article>
                </div>

                <div className="scorebook-insights">
                  <article>
                    <div className="section-title">
                      <Medal size={20} aria-hidden="true" />
                      <h3>Top 1-3 Scorers</h3>
                    </div>
                    {scorebookAnalytics.topScorers.length ? (
                      <ol className="top-scorers">
                        {scorebookAnalytics.topScorers.map((row) => (
                          <li key={row.rowId}>
                            <span>{row.participantName || "Unnamed participant"}</span>
                            <strong>{percentLabel(row.finalPercent)}</strong>
                            <small>{row.trainingName}</small>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="empty-state">Save simulation sheets to rank participants.</p>
                    )}
                  </article>

                  <article>
                    <div className="section-title">
                      <Award size={20} aria-hidden="true" />
                      <h3>Grade Distribution</h3>
                    </div>
                    <div className="grade-list">
                      {GRADE_LABELS.map((grade) => (
                        <div key={grade}>
                          <span>{grade}</span>
                          <strong>{scorebookAnalytics.gradeCounts[grade] ?? 0}</strong>
                        </div>
                      ))}
                    </div>
                  </article>
                </div>

                <div className="scorebook-insights three-up">
                  {[
                    { title: "Monthly Analytics", rows: scorebookAnalytics.byMonth },
                    { title: "Per Training", rows: scorebookAnalytics.byTraining },
                    { title: "Yearly Analytics", rows: scorebookAnalytics.byYear },
                  ].map((group) => (
                    <article key={group.title}>
                      <div className="section-title">
                        <BarChart3 size={20} aria-hidden="true" />
                        <h3>{group.title}</h3>
                      </div>
                      {group.rows.length ? (
                        <div className="mini-analytics-list">
                          {group.rows.slice(0, 6).map((item) => (
                            <div key={item.key}>
                              <span>{item.key}</span>
                              <strong>{percentLabel(item.meanFinal)}</strong>
                              <small>
                                {item.participants} pax | Quiz {percentLabel(item.meanExam)} |
                                Sim {percentLabel(item.meanSimulation)}
                              </small>
                              <em>{item.topName}</em>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="empty-state">No scorebook data yet.</p>
                      )}
                    </article>
                  ))}
                </div>

                <section className="quick-score-area">
                  <div className="quick-score-head">
                    <div className="section-title">
                      <Calculator size={20} aria-hidden="true" />
                      <h3>Fast Score Entry</h3>
                    </div>
                    <span>
                      {visibleScorebookRows.length}/{scorebookRows.length}
                    </span>
                  </div>
                  {visibleScorebookRows.length ? (
                    <div className="quick-score-grid">
                      {visibleScorebookRows.map((row) => (
                        <article className="quick-score-card" key={row.rowId}>
                          <header>
                            <div>
                              <strong>{row.participantName || "Unnamed participant"}</strong>
                              <span>
                                {row.trainingName} | {row.trainingDate}
                              </span>
                            </div>
                            <em>{percentLabel(row.finalPercent)}</em>
                          </header>

                          <div className="quick-score-fields">
                            <label>
                              Participant
                              <input
                                value={row.participantName}
                                onChange={(event) =>
                                  setScorebookText(
                                    row.rowId,
                                    "participantName",
                                    event.target.value,
                                  )
                                }
                                placeholder="Full name"
                              />
                            </label>
                            <label>
                              Training
                              <input
                                value={row.trainingName}
                                onChange={(event) =>
                                  setScorebookText(
                                    row.rowId,
                                    "trainingName",
                                    event.target.value,
                                  )
                                }
                                placeholder="Training or batch"
                              />
                            </label>
                            <label>
                              Date
                              <input
                                type="date"
                                value={row.trainingDate}
                                onChange={(event) =>
                                  setScorebookText(
                                    row.rowId,
                                    "trainingDate",
                                    event.target.value,
                                  )
                                }
                              />
                            </label>
                          </div>

                          <div className="quick-score-section">
                            <h4>Quiz Scores</h4>
                            <div className="quick-score-list">
                              {QUIZ_CONFIGS.map((quiz) => (
                                <ScoreStepper
                                  key={quiz.key}
                                  label={quiz.label}
                                  max={quiz.max}
                                  value={row.quizScores[quiz.key]}
                                  onChange={(value) =>
                                    setQuizScore(row.rowId, quiz.key, value)
                                  }
                                />
                              ))}
                            </div>
                          </div>

                          <div className="quick-score-section">
                            <h4>Simulation Scores</h4>
                            <div className="quick-score-list">
                              {row.config.methods.map((method) => (
                                <ScoreStepper
                                  key={method}
                                  label={method}
                                  max={row.config.victims.length}
                                  value={row.simulationScores[method] ?? ""}
                                  onChange={(value) =>
                                    setSimulationScore(
                                      row.rowId,
                                      method,
                                      value,
                                      row.config.victims.length,
                                    )
                                  }
                                />
                              ))}
                            </div>
                          </div>

                          <div className="quick-score-results">
                            <span>Quiz {percentLabel(row.examPercent)}</span>
                            <span>Simulation {percentLabel(row.simulationPercent)}</span>
                            <span>{row.grade}</span>
                          </div>

                          <label>
                            Comments
                            <input
                              value={row.comments}
                              onChange={(event) =>
                                setScorebookText(
                                  row.rowId,
                                  "comments",
                                  event.target.value,
                                )
                              }
                              placeholder="Optional"
                            />
                          </label>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="empty-state">
                      {scorebookRows.length
                        ? "No score inputs for the selected date."
                        : "Save or import simulation score sheets first."}
                    </p>
                  )}
                </section>

                <div className="scorebook-table">
                  <div className="section-title">
                    <TimerReset size={20} aria-hidden="true" />
                    <h3>Full Score Table</h3>
                  </div>
                  {visibleScorebookRows.length ? (
                    <div className="table-scroll scorebook-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Participant</th>
                            <th>Training</th>
                            <th>Date</th>
                            {QUIZ_CONFIGS.map((quiz) => (
                              <th key={quiz.key}>{quiz.label}</th>
                            ))}
                            <th>Quiz %</th>
                            {ALL_METHODS.map((method) => (
                              <th key={method}>{method}</th>
                            ))}
                            <th>Simulation %</th>
                            <th>Final %</th>
                            <th>Grade</th>
                            <th>Comments</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visibleScorebookRows.map((row) => (
                            <tr key={row.rowId}>
                              <td>
                                <input
                                  value={row.participantName}
                                  onChange={(event) =>
                                    setScorebookText(
                                      row.rowId,
                                      "participantName",
                                      event.target.value,
                                    )
                                  }
                                  placeholder="Full name"
                                />
                              </td>
                              <td>
                                <input
                                  value={row.trainingName}
                                  onChange={(event) =>
                                    setScorebookText(
                                      row.rowId,
                                      "trainingName",
                                      event.target.value,
                                    )
                                  }
                                  placeholder="Training or batch"
                                />
                              </td>
                              <td>
                                <input
                                  type="date"
                                  value={row.trainingDate}
                                  onChange={(event) =>
                                    setScorebookText(
                                      row.rowId,
                                      "trainingDate",
                                      event.target.value,
                                    )
                                  }
                                />
                              </td>
                              {QUIZ_CONFIGS.map((quiz) => (
                                <td key={quiz.key}>
                                  <input
                                    inputMode="decimal"
                                    min="0"
                                    max={quiz.max}
                                    type="number"
                                    value={row.quizScores[quiz.key]}
                                    onChange={(event) =>
                                      setQuizScore(row.rowId, quiz.key, event.target.value)
                                    }
                                    placeholder={`/${quiz.max}`}
                                  />
                                  <small>{`/${quiz.max}`}</small>
                                </td>
                              ))}
                              <td>
                                <strong>{percentLabel(row.examPercent)}</strong>
                              </td>
                              {ALL_METHODS.map((method) => (
                                <td key={method}>
                                  {row.config.methods.includes(method) ? (
                                    <>
                                      <input
                                        inputMode="decimal"
                                        min="0"
                                        max={row.config.victims.length}
                                        type="number"
                                        value={row.simulationScores[method] ?? ""}
                                        onChange={(event) =>
                                          setSimulationScore(
                                            row.rowId,
                                            method,
                                            event.target.value,
                                            row.config.victims.length,
                                          )
                                        }
                                        placeholder={`/${row.config.victims.length}`}
                                      />
                                      <small>{`/${row.config.victims.length}`}</small>
                                    </>
                                  ) : (
                                    <span className="muted-cell">-</span>
                                  )}
                                </td>
                              ))}
                              <td>
                                <strong>{percentLabel(row.simulationPercent)}</strong>
                              </td>
                              <td>
                                <strong>{percentLabel(row.finalPercent)}</strong>
                              </td>
                              <td>
                                <span className="grade-pill">{row.grade}</span>
                              </td>
                              <td>
                                <input
                                  value={row.comments}
                                  onChange={(event) =>
                                    setScorebookText(
                                      row.rowId,
                                      "comments",
                                      event.target.value,
                                    )
                                  }
                                  placeholder="Optional"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="empty-state">
                      Save or import simulation score sheets first. Participants will appear here
                      automatically.
                    </p>
                  )}
                </div>
              </section>

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
        </section>
      </section>
    </main>
  );
}
