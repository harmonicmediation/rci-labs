import type { VideoProvider, VideoRoom, VideoToken } from "./types";

const DAILY_API = "https://api.daily.co/v1";

export function sanitizeDailyRoomName(name: string) {
  const cleaned = name.replace(/[^A-Za-z0-9_-]/g, "-").replace(/-+/g, "-");
  return cleaned.slice(0, 120).replace(/^-+|-+$/g, "") || "rci-room";
}

export function dailyDomainHost(domain: string) {
  const trimmed = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return trimmed.includes(".") ? trimmed : `${trimmed}.daily.co`;
}

export function needsDailyProvision(room: {
  dailyRoomName?: string;
  dailyRoomId?: string;
  dailyRoomUrl?: string;
}) {
  if (!room.dailyRoomName) return true;
  if (room.dailyRoomId?.startsWith("stub_")) return true;
  if (room.dailyRoomUrl?.includes("stub.daily.co")) return true;
  return false;
}

export function getVideoProvider(options?: { network?: boolean }) {
  const apiKey = process.env.DAILY_API_KEY;
  const domain = process.env.DAILY_DOMAIN;
  if (options?.network && apiKey && domain) {
    return createDailyProvider(apiKey, dailyDomainHost(domain));
  }
  return stubVideoProvider;
}

export function requireDailyProvider() {
  const apiKey = process.env.DAILY_API_KEY;
  const domain = process.env.DAILY_DOMAIN;
  if (!apiKey || !domain) {
    throw new Error("Daily video is not configured on the server.");
  }
  return createDailyProvider(apiKey, dailyDomainHost(domain));
}

export const stubVideoProvider: VideoProvider = {
  async createRoom(input) {
    return {
      provider: "stub",
      roomName: input.name,
      roomId: `stub_${input.name}`,
      roomUrl: `https://stub.daily.co/${input.name}`,
    };
  },
  async deleteRoom() {},
  async createToken(input) {
    const expiresAt = Date.now() + 60 * 60 * 1000;
    return {
      provider: "stub",
      token: `stub-token-${input.userId}`,
      roomUrl: `https://stub.daily.co/${input.roomName}`,
      expiresAt,
    };
  },
  async startRecording() {
    return { recordingId: "stub-recording" };
  },
  async stopRecording() {},
};

class DailyApiError extends Error {
  status: number;
  constructor(path: string, status: number, body: string) {
    super(`Daily API ${path} failed: ${status} ${body}`);
    this.name = "DailyApiError";
    this.status = status;
  }
}

function createDailyProvider(apiKey: string, domain: string): VideoProvider {
  async function dailyFetch<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${DAILY_API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
    if (!response.ok) {
      const body = await response.text();
      throw new DailyApiError(path, response.status, body);
    }
    return (await response.json()) as T;
  }

  return {
    async createRoom(input) {
      const name = sanitizeDailyRoomName(input.name);
      try {
        const room = await dailyFetch<{
          id: string;
          name: string;
          url: string;
        }>("/rooms", {
          method: "POST",
          body: JSON.stringify({
            name,
            privacy: "private",
            properties: {
              enable_prejoin_ui: false,
              exp: input.expiresInSeconds
                ? Math.floor(Date.now() / 1000) + input.expiresInSeconds
                : undefined,
              enable_recording: input.recordingEnabled ? "cloud" : undefined,
            },
          }),
        });
        return {
          provider: "daily",
          roomName: room.name,
          roomId: room.id,
          roomUrl: room.url ?? `https://${domain}/${room.name}`,
        } satisfies VideoRoom;
      } catch (error) {
        const status = error instanceof DailyApiError ? error.status : 0;
        if (status === 400 || status === 409) {
          const existing = await dailyFetch<{
            id: string;
            name: string;
            url: string;
          }>(`/rooms/${encodeURIComponent(name)}`);
          return {
            provider: "daily",
            roomName: existing.name,
            roomId: existing.id,
            roomUrl: existing.url ?? `https://${domain}/${existing.name}`,
          } satisfies VideoRoom;
        }
        throw error;
      }
    },

    async deleteRoom(roomName) {
      await dailyFetch(`/rooms/${encodeURIComponent(roomName)}`, {
        method: "DELETE",
      });
    },

    async createToken(input) {
      const token = await dailyFetch<{ token: string }>("/meeting-tokens", {
        method: "POST",
        body: JSON.stringify({
          properties: {
            room_name: input.roomName,
            user_id: input.userId,
            user_name: input.userName,
            is_owner: input.isOwner ?? false,
            enable_recording: input.enableRecording ? "cloud" : undefined,
            exp: Math.floor(Date.now() / 1000) + 60 * 60,
          },
        }),
      });
      return {
        provider: "daily",
        token: token.token,
        roomUrl: `https://${domain}/${input.roomName}`,
        expiresAt: Date.now() + 60 * 60 * 1000,
      } satisfies VideoToken;
    },

    async startRecording(roomName) {
      const recording = await dailyFetch<{ id?: string; recordingId?: string }>(
        `/rooms/${encodeURIComponent(roomName)}/recordings/start`,
        { method: "POST" },
      );
      return { recordingId: recording.id ?? recording.recordingId ?? "unknown" };
    },

    async stopRecording(roomName) {
      await dailyFetch(`/rooms/${encodeURIComponent(roomName)}/recordings/stop`, {
        method: "POST",
      });
    },
  };
}
