import { describe, expect, it } from "vitest";
import { shouldRaiseAlert } from "./alerts";

const policy = {
  now: 10_000,
  cooldownMs: 60_000,
  minConfidence: 0.6,
};

describe("shouldRaiseAlert", () => {
  it("always emits explicit help requests", () => {
    const decision = shouldRaiseAlert(
      {
        category: "help_requested",
        severity: "urgent",
        confidence: 0,
        source: "participant",
      },
      [],
      policy,
    );
    expect(decision.emit).toBe(true);
    expect(decision.reason).toBe("explicit_help_request");
  });

  it("dedupes repeated AI alerts inside the cooldown window", () => {
    const decision = shouldRaiseAlert(
      {
        category: "repeated_advice_giving",
        severity: "attention",
        confidence: 0.9,
        source: "ai",
      },
      [
        {
          category: "repeated_advice_giving",
          createdAt: 5_000,
          status: "open",
        },
      ],
      policy,
    );
    expect(decision).toEqual({ emit: false, reason: "cooldown" });
  });

  it("requires a repeated signal for low-severity AI alerts", () => {
    const first = shouldRaiseAlert(
      {
        category: "silence",
        severity: "watch",
        confidence: 0.8,
        source: "ai",
      },
      [],
      { ...policy, previousWindowHadSameCategory: false },
    );
    expect(first.emit).toBe(false);

    const second = shouldRaiseAlert(
      {
        category: "silence",
        severity: "watch",
        confidence: 0.8,
        source: "ai",
      },
      [],
      { ...policy, previousWindowHadSameCategory: true },
    );
    expect(second.emit).toBe(true);
  });

  it("drops low-confidence AI classifications", () => {
    const decision = shouldRaiseAlert(
      {
        category: "dominating",
        severity: "attention",
        confidence: 0.2,
        source: "ai",
      },
      [],
      policy,
    );
    expect(decision.reason).toBe("below_confidence");
  });
});
