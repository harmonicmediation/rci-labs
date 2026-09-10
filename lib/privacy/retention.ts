export const ARTIFACT_TYPES = [
  "recordings",
  "raw_transcripts",
  "transcript_segments",
  "ai_observations",
  "mentor_reports",
  "client_notes",
  "practice_client_state",
] as const;
export type ArtifactType = (typeof ARTIFACT_TYPES)[number];

export const RETENTION_MODES = [
  "do_not_persist",
  "session_only",
  "days",
  "until_program_complete",
  "until_relationship_ends",
  "until_manual_delete",
] as const;
export type RetentionMode = (typeof RETENTION_MODES)[number];

export type RetentionPolicy = {
  artifactType: ArtifactType;
  mode: RetentionMode;
  retainDays?: number;
};

export const DEFAULT_RETENTION: RetentionPolicy[] = [
  { artifactType: "recordings", mode: "days", retainDays: 30 },
  { artifactType: "raw_transcripts", mode: "days", retainDays: 30 },
  { artifactType: "transcript_segments", mode: "days", retainDays: 30 },
  { artifactType: "ai_observations", mode: "days", retainDays: 14 },
  { artifactType: "mentor_reports", mode: "until_program_complete" },
  { artifactType: "client_notes", mode: "do_not_persist" },
  { artifactType: "practice_client_state", mode: "do_not_persist" },
];

export function retentionExpiresAt(
  policy: RetentionPolicy,
  createdAt: number,
  now = Date.now(),
): number | null {
  if (policy.mode === "do_not_persist" || policy.mode === "session_only") {
    return now;
  }
  if (policy.mode === "days") {
    const days = policy.retainDays ?? 0;
    return createdAt + days * 24 * 60 * 60 * 1000;
  }
  return null;
}

export function isExpired(
  policy: RetentionPolicy,
  createdAt: number,
  now = Date.now(),
): boolean {
  const expires = retentionExpiresAt(policy, createdAt, now);
  return expires != null && now >= expires;
}
