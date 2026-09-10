export const MEMBER_STATUSES = [
  "active",
  "inactive",
  "suspended",
  "deleted",
] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

export const MEMBER_KINDS = [
  "student",
  "consumer",
  "mentor",
  "admin",
  "multi",
] as const;
export type MemberKind = (typeof MEMBER_KINDS)[number];

export const APP_ROLES = ["member", "mentor", "admin", "super_admin"] as const;
export type AppRole = (typeof APP_ROLES)[number];

export const PRACTICE_ROLES = [
  "coach",
  "client",
  "observer",
  "mentor",
  "ai_observer",
] as const;
export type PracticeRole = (typeof PRACTICE_ROLES)[number];

export const ROUND_STATUSES = [
  "pending",
  "running",
  "paused",
  "complete",
  "cancelled",
] as const;
export type RoundStatus = (typeof ROUND_STATUSES)[number];

export const ATTENTION_STATES = [
  "on_track",
  "waiting",
  "needs_attention",
  "mentor_requested",
  "completed",
] as const;
export type AttentionState = (typeof ATTENTION_STATES)[number];

export const READINESS_STATUSES = [
  "on_track",
  "watch",
  "extra_coaching_recommended",
] as const;
export type ReadinessStatus = (typeof READINESS_STATUSES)[number];

export const ALERT_SEVERITIES = [
  "info",
  "watch",
  "attention",
  "urgent",
] as const;
export type AlertSeverity = (typeof ALERT_SEVERITIES)[number];

export const ENTITLEMENTS = [
  "rci_student_labs",
  "consumer_group_coaching",
  "mentor_access",
  "admin_access",
] as const;
export type Entitlement = (typeof ENTITLEMENTS)[number];

export type QueueEntry = {
  memberId: string;
  joinedAt: number;
};

export type MatchResult = {
  rooms: { memberIds: string[] }[];
  stillWaiting: QueueEntry[];
};

export type TimerSnapshot = {
  status: RoundStatus;
  durationSeconds: number;
  remainingSeconds: number;
  startedAt?: number;
  pausedAt?: number;
  endedAt?: number;
};

export type RubricMetricScoreInput = {
  code: string;
  weight: number;
  score: number;
  scoreMin: number;
  scoreMax: number;
};
