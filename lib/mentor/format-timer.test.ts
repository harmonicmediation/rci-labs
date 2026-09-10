import { describe, expect, it } from "vitest";
import { formatClock, formatRemainingLabel, initialsFromName } from "./format-timer";

describe("formatClock", () => {
  it("formats minutes and zero-padded seconds", () => {
    expect(formatClock(754)).toBe("12:34");
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(-4)).toBe("0:00");
  });
});

describe("formatRemainingLabel", () => {
  it("pairs remaining with duration", () => {
    expect(formatRemainingLabel(192, 900)).toBe("3:12 / 15:00");
  });
});

describe("initialsFromName", () => {
  it("uses first and last initials", () => {
    expect(initialsFromName("Alex Rivera")).toBe("AR");
    expect(initialsFromName("Taylor")).toBe("TA");
  });
});
