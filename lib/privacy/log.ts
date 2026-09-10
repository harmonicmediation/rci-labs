const SENSITIVE_KEYS = [
  "transcript",
  "transcriptText",
  "text",
  "quote",
  "recording",
  "clientNote",
  "notes",
  "aiSummary",
  "prompt",
  "token",
  "authorization",
  "secret",
  "apiKey",
  "password",
  "email",
];

export type LogLevel = "info" | "warn" | "error";

export type LogEvent = {
  level: LogLevel;
  message: string;
  labId?: string;
  roomId?: string;
  roundId?: string;
  memberId?: string;
  requestId?: string;
  [key: string]: unknown;
};

export function redact(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(redact);
  if (typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.some((item) => key.toLowerCase().includes(item.toLowerCase()))) {
        output[key] = "[redacted]";
      } else {
        output[key] = redact(nested);
      }
    }
    return output;
  }
  return value;
}

export function logEvent(event: LogEvent): void {
  const { level, message, ...rest } = event;
  const safe = redact(rest);
  const line = {
    ts: new Date().toISOString(),
    level,
    message,
    ...(typeof safe === "object" && safe ? safe : {}),
  };
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export function sentryBeforeSend<T extends { request?: { data?: unknown }; extra?: unknown; breadcrumbs?: unknown }>(
  event: T,
): T | null {
  if (event.request) {
    event.request.data = undefined;
  }
  if (event.extra) {
    event.extra = redact(event.extra) as T["extra"];
  }
  return event;
}
