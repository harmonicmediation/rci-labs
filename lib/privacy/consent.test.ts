import { describe, expect, it } from "vitest";
import { evaluateConsent, requiredFlagsForSession } from "./consent";

const policy = {
  version: "v1",
  requiredFlags: [
    "audioVideo",
    "recording",
    "transcription",
    "aiMonitoring",
    "mentorReporting",
    "retention",
  ] as const,
  declinedPolicy: "deny_entry" as const,
};

describe("evaluateConsent", () => {
  it("allows entry when all session-required flags are granted", () => {
    const session = {
      recordingEnabled: true,
      transcriptionEnabled: true,
      aiMonitoringEnabled: true,
      mentorReportingEnabled: true,
    };
    const decision = evaluateConsent({
      policy: { ...policy, requiredFlags: [...policy.requiredFlags] },
      flags: {
        audioVideo: true,
        recording: true,
        transcription: true,
        aiMonitoring: true,
        mentorReporting: true,
        retention: true,
      },
      session,
    });
    expect(decision.outcome).toBe("entered");
    expect(requiredFlagsForSession(session)).toContain("recording");
  });

  it("enforces the configured declined policy instead of proceeding", () => {
    const decision = evaluateConsent({
      policy: { ...policy, requiredFlags: [...policy.requiredFlags] },
      flags: {
        audioVideo: true,
        recording: false,
        transcription: true,
        aiMonitoring: true,
        mentorReporting: true,
        retention: true,
      },
      session: {
        recordingEnabled: true,
        transcriptionEnabled: true,
        aiMonitoringEnabled: true,
        mentorReportingEnabled: true,
      },
    });
    expect(decision.outcome).toBe("deny_entry");
    expect(decision.missing).toEqual(["recording"]);
  });

  it("does not require recording consent when recording is off", () => {
    const decision = evaluateConsent({
      policy: { ...policy, requiredFlags: [...policy.requiredFlags] },
      flags: {
        audioVideo: true,
        recording: false,
        transcription: true,
        aiMonitoring: true,
        mentorReporting: true,
        retention: true,
      },
      session: {
        recordingEnabled: false,
        transcriptionEnabled: true,
        aiMonitoringEnabled: true,
        mentorReportingEnabled: true,
      },
    });
    expect(decision.outcome).toBe("entered");
  });
});
