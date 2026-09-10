import Link from "next/link";
import { SetupChecklist } from "@/components/setup/setup-checklist";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
          Relationship Coaching Institute
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">RCI Labs V1</h1>
        <p className="mt-4 max-w-2xl text-lg leading-7 text-muted">
          Zoom replacement for live practice labs: persistent moderator room,
          student matching, authoritative timers, AI observer hooks, and
          versioned member APIs.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="rounded-lg bg-ink px-4 py-2 text-sm text-white" href="/mentor">
            Live mentor dashboard
          </Link>
          <Link className="rounded-lg border border-line bg-card px-4 py-2 text-sm" href="/labs">
            Join a practice lab
          </Link>
          <Link className="rounded-lg border border-line bg-card px-4 py-2 text-sm" href="/preview/mentor">
            Mentor dashboard preview
          </Link>
          <Link className="rounded-lg border border-line bg-card px-4 py-2 text-sm" href="/preview/admin">
            Admin preview
          </Link>
          <Link className="rounded-lg border border-line bg-card px-4 py-2 text-sm" href="/preview/student">
            Student preview
          </Link>
        </div>
        <div className="mt-10">
          <SetupChecklist />
        </div>
      </div>
    </div>
  );
}
