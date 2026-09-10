import type { AlertSeverity } from "./types";

export type IncomingAlert = {
  category: string;
  severity: AlertSeverity;
  confidence: number;
  source: "participant" | "ai" | "system" | "mentor";
};

export type ExistingAlert = {
  category: string;
  createdAt: number;
  status: "open" | "claimed" | "resolved" | "dismissed";
};

export type AlertPolicy = {
  now: number;
  cooldownMs: number;
  minConfidence: number;
  previousWindowHadSameCategory?: boolean;
};

export type AlertDecision = {
  emit: boolean;
  reason: string;
};

export function shouldRaiseAlert(
  incoming: IncomingAlert,
  openAlerts: ExistingAlert[],
  policy: AlertPolicy,
): AlertDecision {
  if (incoming.source === "participant" || incoming.category === "help_requested") {
    return { emit: true, reason: "explicit_help_request" };
  }

  if (incoming.confidence < policy.minConfidence) {
    return { emit: false, reason: "below_confidence" };
  }

  const recentSame = openAlerts.find(
    (alert) =>
      alert.category === incoming.category &&
      (alert.status === "open" || alert.status === "claimed") &&
      policy.now - alert.createdAt < policy.cooldownMs,
  );
  if (recentSame) {
    return { emit: false, reason: "cooldown" };
  }

  if (
    (incoming.severity === "info" || incoming.severity === "watch") &&
    incoming.source === "ai" &&
    !policy.previousWindowHadSameCategory
  ) {
    return { emit: false, reason: "needs_repeat_signal" };
  }

  return { emit: true, reason: "threshold_met" };
}

export function mapRoomStateToAttention(
  roomState: "normal" | "watch" | "mentor_suggested" | "urgent",
): "on_track" | "needs_attention" | "mentor_requested" {
  if (roomState === "urgent" || roomState === "mentor_suggested") {
    return "needs_attention";
  }
  if (roomState === "watch") return "needs_attention";
  return "on_track";
}
