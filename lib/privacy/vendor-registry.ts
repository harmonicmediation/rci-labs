import type { DataClass } from "./consent";

export type VendorRecord = {
  provider: string;
  purpose: string;
  dataCategories: DataClass[];
  persistsData: boolean;
  retention: string;
  region: string;
  dpaStatus: "unknown" | "in_place" | "not_required" | "needed";
  baaCapability: "not_enabled_v1" | "available" | "in_place";
  deletionMechanism: string;
  environment: "development" | "staging" | "production";
};

export const VENDOR_REGISTRY: VendorRecord[] = [
  {
    provider: "Clerk",
    purpose: "Authentication identity and sessions only",
    dataCategories: ["account"],
    persistsData: true,
    retention: "Clerk account lifecycle",
    region: "configured in Clerk dashboard",
    dpaStatus: "needed",
    baaCapability: "not_enabled_v1",
    deletionMechanism: "Clerk user deletion API",
    environment: "development",
  },
  {
    provider: "Convex",
    purpose: "Canonical RCI application data",
    dataCategories: ["account", "operational", "sensitive_coaching", "security_audit"],
    persistsData: true,
    retention: "RCI retention policies in Convex",
    region: "US East (N. Virginia) for current dev deployment",
    dpaStatus: "needed",
    baaCapability: "not_enabled_v1",
    deletionMechanism: "Convex document delete plus vendor export/backup review",
    environment: "development",
  },
  {
    provider: "Daily",
    purpose: "Realtime media, optional recording/transcription",
    dataCategories: ["operational", "sensitive_coaching"],
    persistsData: true,
    retention: "Keep with Daily in V1 unless exported",
    region: "Daily account region",
    dpaStatus: "needed",
    baaCapability: "not_enabled_v1",
    deletionMechanism: "Daily room/recording delete APIs",
    environment: "development",
  },
  {
    provider: "OpenAI",
    purpose: "Live evaluation and mentor report generation",
    dataCategories: ["sensitive_coaching"],
    persistsData: false,
    retention: "Send minimum transcript window; do not send unrelated profile data",
    region: "OpenAI API",
    dpaStatus: "needed",
    baaCapability: "not_enabled_v1",
    deletionMechanism: "Do not persist prompts in RCI logs; vendor API retention per OpenAI policy",
    environment: "development",
  },
  {
    provider: "Pipecat observer workers",
    purpose: "Non-speaking room observer; transcript/event forwarder",
    dataCategories: ["operational", "sensitive_coaching"],
    persistsData: false,
    retention: "In-memory for assigned room only",
    region: "RCI-managed containers (not provisioned yet)",
    dpaStatus: "not_required",
    baaCapability: "not_enabled_v1",
    deletionMechanism: "Worker shutdown; no broad database credentials",
    environment: "development",
  },
  {
    provider: "Sentry",
    purpose: "Application error monitoring",
    dataCategories: ["operational"],
    persistsData: true,
    retention: "Sentry plan default; coaching content prohibited",
    region: "Sentry project region",
    dpaStatus: "needed",
    baaCapability: "not_enabled_v1",
    deletionMechanism: "beforeSend redaction; Sentry issue delete",
    environment: "development",
  },
];
