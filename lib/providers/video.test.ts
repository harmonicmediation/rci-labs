import { describe, expect, it } from "vitest";
import {
  dailyDomainHost,
  needsDailyProvision,
  sanitizeDailyRoomName,
} from "./video";

describe("sanitizeDailyRoomName", () => {
  it("keeps Daily-safe characters", () => {
    expect(sanitizeDailyRoomName("rci-abc123-r1")).toBe("rci-abc123-r1");
  });
});

describe("dailyDomainHost", () => {
  it("adds .daily.co when only the subdomain is stored", () => {
    expect(dailyDomainHost("rci")).toBe("rci.daily.co");
    expect(dailyDomainHost("rci.daily.co")).toBe("rci.daily.co");
  });
});

describe("needsDailyProvision", () => {
  it("detects stub rooms", () => {
    expect(
      needsDailyProvision({
        dailyRoomName: "rci-room",
        dailyRoomId: "stub_rci-room",
        dailyRoomUrl: "https://stub.daily.co/rci-room",
      }),
    ).toBe(true);
    expect(
      needsDailyProvision({
        dailyRoomName: "rci-room",
        dailyRoomId: "abc-uuid",
        dailyRoomUrl: "https://rci.daily.co/rci-room",
      }),
    ).toBe(false);
  });
});
