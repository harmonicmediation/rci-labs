import type { RoundStatus, TimerSnapshot } from "./types";

export class TimerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimerError";
  }
}

export function remainingSeconds(round: TimerSnapshot, now: number): number {
  if (round.status !== "running" || round.startedAt == null) {
    return Math.max(0, round.remainingSeconds);
  }
  const elapsed = Math.floor((now - round.startedAt) / 1000);
  return Math.max(0, round.remainingSeconds - elapsed);
}

export function startTimer(round: TimerSnapshot, now: number): TimerSnapshot {
  assertTransition(round.status, ["pending", "paused"], "start");
  return {
    ...round,
    status: "running",
    remainingSeconds:
      round.status === "paused"
        ? remainingSeconds(round, now)
        : round.durationSeconds,
    startedAt: now,
    pausedAt: undefined,
    endedAt: undefined,
  };
}

export function pauseTimer(round: TimerSnapshot, now: number): TimerSnapshot {
  assertTransition(round.status, ["running"], "pause");
  return {
    ...round,
    status: "paused",
    remainingSeconds: remainingSeconds(round, now),
    startedAt: undefined,
    pausedAt: now,
  };
}

export function resumeTimer(round: TimerSnapshot, now: number): TimerSnapshot {
  assertTransition(round.status, ["paused"], "resume");
  return {
    ...round,
    status: "running",
    remainingSeconds: remainingSeconds(round, now),
    startedAt: now,
    pausedAt: undefined,
  };
}

export function resetTimer(
  round: TimerSnapshot,
  input: { confirm: boolean; durationSeconds: number },
  now: number,
): TimerSnapshot {
  if (!input.confirm) {
    throw new TimerError("Reset requires confirmation");
  }
  if (round.status === "complete" || round.status === "cancelled") {
    throw new TimerError("Cannot reset a finished round");
  }
  const durationSeconds = Math.max(1, Math.floor(input.durationSeconds));
  return {
    ...round,
    durationSeconds,
    remainingSeconds: durationSeconds,
    status: round.status === "running" ? "running" : "pending",
    startedAt: round.status === "running" ? now : undefined,
    pausedAt: undefined,
    endedAt: undefined,
  };
}

export function adjustTimer(
  round: TimerSnapshot,
  deltaSeconds: number,
  now: number,
): TimerSnapshot {
  if (round.status === "complete" || round.status === "cancelled") {
    throw new TimerError("Cannot adjust a finished round");
  }
  const current = remainingSeconds(round, now);
  const next = Math.max(0, current + Math.trunc(deltaSeconds));
  return {
    ...round,
    remainingSeconds: next,
    startedAt: round.status === "running" ? now : round.startedAt,
  };
}

export function endTimer(round: TimerSnapshot, now: number): TimerSnapshot {
  if (round.status === "complete" || round.status === "cancelled") {
    throw new TimerError("Round already finished");
  }
  return {
    ...round,
    status: "complete",
    remainingSeconds: remainingSeconds(round, now),
    startedAt: undefined,
    endedAt: now,
  };
}

export function cancelTimer(round: TimerSnapshot, now: number): TimerSnapshot {
  if (round.status === "complete" || round.status === "cancelled") {
    throw new TimerError("Round already finished");
  }
  return {
    ...round,
    status: "cancelled",
    remainingSeconds: remainingSeconds(round, now),
    startedAt: undefined,
    endedAt: now,
  };
}

function assertTransition(
  current: RoundStatus,
  allowed: RoundStatus[],
  action: string,
): void {
  if (!allowed.includes(current)) {
    throw new TimerError(`Cannot ${action} a ${current} round`);
  }
}
