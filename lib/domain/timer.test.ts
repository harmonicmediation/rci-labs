import { describe, expect, it } from "vitest";
import {
  adjustTimer,
  endTimer,
  pauseTimer,
  remainingSeconds,
  resetTimer,
  resumeTimer,
  startTimer,
  TimerError,
} from "./timer";
import type { TimerSnapshot } from "./types";

const pending: TimerSnapshot = {
  status: "pending",
  durationSeconds: 900,
  remainingSeconds: 900,
};

describe("timer", () => {
  it("starts from pending and counts down while running", () => {
    const started = startTimer(pending, 1_000);
    expect(started.status).toBe("running");
    expect(remainingSeconds(started, 1_000 + 10_000)).toBe(890);
  });

  it("pause freezes remaining time and resume continues from it", () => {
    const started = startTimer(pending, 0);
    const paused = pauseTimer(started, 30_000);
    expect(paused.status).toBe("paused");
    expect(paused.remainingSeconds).toBe(870);
    expect(remainingSeconds(paused, 120_000)).toBe(870);

    const resumed = resumeTimer(paused, 120_000);
    expect(remainingSeconds(resumed, 125_000)).toBe(865);
  });

  it("rejects reset without confirmation", () => {
    const started = startTimer(pending, 0);
    expect(() =>
      resetTimer(started, { confirm: false, durationSeconds: 900 }, 5_000),
    ).toThrow(TimerError);
  });

  it("reset with confirmation restores the requested duration", () => {
    const started = startTimer(pending, 0);
    const reset = resetTimer(
      started,
      { confirm: true, durationSeconds: 600 },
      20_000,
    );
    expect(reset.durationSeconds).toBe(600);
    expect(reset.remainingSeconds).toBe(600);
    expect(reset.status).toBe("running");
  });

  it("adjusts remaining time and never goes below zero", () => {
    const started = startTimer(pending, 0);
    const added = adjustTimer(started, 120, 10_000);
    expect(added.remainingSeconds).toBe(1010);
    const subtracted = adjustTimer(started, -10_000, 10_000);
    expect(subtracted.remainingSeconds).toBe(0);
  });

  it("serializes illegal transitions", () => {
    expect(() => pauseTimer(pending, 0)).toThrow(/pause/);
    const ended = endTimer(startTimer(pending, 0), 1);
    expect(() => startTimer(ended, 2)).toThrow(/start/);
  });
});
