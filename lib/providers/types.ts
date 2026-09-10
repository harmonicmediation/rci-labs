export type VideoRoom = {
  provider: "daily" | "stub";
  roomName: string;
  roomId: string;
  roomUrl: string;
};

export type VideoToken = {
  provider: "daily" | "stub";
  token: string;
  roomUrl: string;
  expiresAt: number;
};

export type VideoProvider = {
  createRoom(input: {
    name: string;
    recordingEnabled?: boolean;
    expiresInSeconds?: number;
  }): Promise<VideoRoom>;
  deleteRoom(roomName: string): Promise<void>;
  createToken(input: {
    roomName: string;
    userId: string;
    userName: string;
    isOwner?: boolean;
    enableRecording?: boolean;
  }): Promise<VideoToken>;
  startRecording(roomName: string): Promise<{ recordingId: string }>;
  stopRecording(roomName: string): Promise<void>;
};

export type ObserverJob = {
  practiceRoomId: string;
  dailyRoomUrl: string;
  dailyToken: string;
  rubricVersion: number;
};

export type ObserverProvider = {
  startObserver(job: ObserverJob): Promise<{ workerId: string }>;
  stopObserver(workerId: string): Promise<void>;
  health(workerId: string): Promise<{ ok: boolean }>;
};

export type LiveEvaluation = {
  room_state: "normal" | "watch" | "mentor_suggested" | "urgent";
  confidence: number;
  signals: Array<{
    code: string;
    severity: "watch" | "attention" | "urgent";
    summary: string;
    evidence: Array<{
      speaker: string;
      timestamp_ms: number;
      quote: string;
    }>;
  }>;
  rubric_observations: Array<{
    metric_code: string;
    direction: "positive" | "negative";
    strength: number;
  }>;
};

export type ReportDraft = {
  metricScores: Array<{
    metricCode: string;
    score: number;
    confidence: number;
    evidence: Array<{ quote: string; timestampMs: number }>;
    note: string;
  }>;
  strengths: string[];
  habitsToWorkOn: string[];
  summary: string;
  model: string;
};

export type AIProvider = {
  evaluateWindow(input: {
    transcript: string;
    rubricInstructions: string;
  }): Promise<LiveEvaluation>;
  generateReport(input: {
    transcript: string;
    rubricInstructions: string;
  }): Promise<ReportDraft>;
  moderationCheck(text: string): Promise<{ flagged: boolean; categories: string[] }>;
};

export type MembershipProvider = {
  getMember(externalId: string): Promise<unknown | null>;
  syncMember(externalId: string): Promise<unknown | null>;
};

export type BillingProvider = {
  getEntitlement(customerId: string, entitlement: string): Promise<boolean>;
};
