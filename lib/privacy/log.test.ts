import { describe, expect, it } from "vitest";
import { redact, sentryBeforeSend } from "./log";

describe("privacy log redaction", () => {
  it("strips transcript and secret fields", () => {
    expect(
      redact({
        memberId: "m1",
        transcript: "client said something private",
        apiKey: "sk-secret",
      }),
    ).toEqual({
      memberId: "m1",
      transcript: "[redacted]",
      apiKey: "[redacted]",
    });
  });

  it("drops request bodies before Sentry send", () => {
    const result = sentryBeforeSend({
      request: { data: { transcript: "nope" } },
      extra: { quote: "nope", roomId: "r1" },
    });
    expect(result?.request?.data).toBeUndefined();
    expect(result?.extra).toEqual({ quote: "[redacted]", roomId: "r1" });
  });
});
