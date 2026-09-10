import type { ReadinessStatus, RubricMetricScoreInput } from "./types";

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function weightedOverall(metrics: RubricMetricScoreInput[]): number {
  const totalWeight = metrics.reduce((sum, metric) => sum + metric.weight, 0);
  if (totalWeight <= 0) return 0;

  const weighted = metrics.reduce((sum, metric) => {
    const score = clamp(metric.score, metric.scoreMin, metric.scoreMax);
    return sum + metric.weight * score;
  }, 0);

  return round2(weighted / totalWeight);
}

export function readinessStatus(
  overall: number,
  readinessThreshold: number,
  watchMargin = 0.5,
): ReadinessStatus {
  if (overall >= readinessThreshold) return "on_track";
  if (overall >= readinessThreshold - watchMargin) return "watch";
  return "extra_coaching_recommended";
}

export function extraCoachingRecommended(
  status: ReadinessStatus,
): boolean {
  return status === "extra_coaching_recommended";
}
