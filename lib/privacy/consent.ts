export const DATA_CLASSES = [
  "public",
  "account",
  "operational",
  "sensitive_coaching",
  "security_audit",
] as const;
export type DataClass = (typeof DATA_CLASSES)[number];

export const CONSENT_FLAGS = [
  "audioVideo",
  "recording",
  "transcription",
  "aiMonitoring",
  "mentorReporting",
  "retention",
] as const;
export type ConsentFlag = (typeof CONSENT_FLAGS)[number];

export type ConsentFlagState = Record<ConsentFlag, boolean>;

export const DECLINED_POLICIES = [
  "deny_entry",
  "allow_non_recorded",
  "observer_only",
  "alternate_room",
] as const;
export type DeclinedPolicy = (typeof DECLINED_POLICIES)[number];

export type ConsentPolicy = {
  version: string;
  requiredFlags: ConsentFlag[];
  declinedPolicy: DeclinedPolicy;
};

export type SessionSensitivity = {
  recordingEnabled: boolean;
  transcriptionEnabled: boolean;
  aiMonitoringEnabled: boolean;
  mentorReportingEnabled: boolean;
};

export type ConsentDecision = {
  outcome: "entered" | DeclinedPolicy;
  missing: ConsentFlag[];
};

export function emptyConsentFlags(): ConsentFlagState {
  return {
    audioVideo: false,
    recording: false,
    transcription: false,
    aiMonitoring: false,
    mentorReporting: false,
    retention: false,
  };
}

export function requiredFlagsForSession(
  session: SessionSensitivity,
): ConsentFlag[] {
  const required: ConsentFlag[] = ["audioVideo"];
  if (session.recordingEnabled) required.push("recording");
  if (session.transcriptionEnabled) required.push("transcription");
  if (session.aiMonitoringEnabled) required.push("aiMonitoring");
  if (session.mentorReportingEnabled) required.push("mentorReporting");
  if (session.recordingEnabled || session.transcriptionEnabled) {
    required.push("retention");
  }
  return required;
}

export function evaluateConsent(input: {
  policy: ConsentPolicy;
  flags: ConsentFlagState;
  session: SessionSensitivity;
}): ConsentDecision {
  const required = requiredFlagsForSession(input.session).filter((flag) =>
    input.policy.requiredFlags.includes(flag),
  );
  const missing = required.filter((flag) => !input.flags[flag]);
  if (missing.length === 0) {
    return { outcome: "entered", missing: [] };
  }
  return { outcome: input.policy.declinedPolicy, missing };
}
