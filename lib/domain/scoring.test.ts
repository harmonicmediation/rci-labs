import { describe, expect, it } from "vitest";
import {
  extraCoachingRecommended,
  readinessStatus,
  weightedOverall,
} from "./scoring";

describe("weightedOverall", () => {
  it("computes a deterministic weighted average and clamps scores", () => {
    const overall = weightedOverall([
      { code: "avoid_advice", weight: 2, score: 4, scoreMin: 1, scoreMax: 5 },
      { code: "empathy", weight: 1, score: 9, scoreMin: 1, scoreMax: 5 },
    ]);
    expect(overall).toBe(4.33);
  });

  it("returns 0 when weights are missing", () => {
    expect(
      weightedOverall([
        { code: "x", weight: 0, score: 5, scoreMin: 1, scoreMax: 5 },
      ]),
    ).toBe(0);
  });
});

describe("readinessStatus", () => {
  it("derives readiness from the configured threshold", () => {
    expect(readinessStatus(3.5, 3.5)).toBe("on_track");
    expect(readinessStatus(3.2, 3.5)).toBe("watch");
    expect(readinessStatus(2.8, 3.5)).toBe("extra_coaching_recommended");
    expect(extraCoachingRecommended("extra_coaching_recommended")).toBe(true);
  });
});
