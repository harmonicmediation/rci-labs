import type { AttentionState } from "@/lib/domain/types";

const labels: Record<AttentionState, string> = {
  on_track: "On track",
  waiting: "Waiting",
  needs_attention: "Needs attention",
  mentor_requested: "Mentor requested",
  completed: "Completed",
};

const tones: Record<AttentionState, string> = {
  on_track: "bg-accent-soft text-accent border-teal-200",
  waiting: "bg-warn-soft text-warn border-amber-200",
  needs_attention: "bg-danger-soft text-danger border-red-200",
  mentor_requested: "bg-orange-100 text-orange-700 border-orange-200",
  completed: "bg-slate-100 text-slate-600 border-slate-200",
};

export function StatusBadge({ status }: { status: AttentionState }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tones[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {labels[status]}
    </span>
  );
}
