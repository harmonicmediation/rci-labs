"use client";

import { Show, SignInButton, useUser } from "@clerk/nextjs";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";

const labStatusLabel: Record<string, string> = {
  draft: "Draft",
  open: "Open",
  live: "In session",
  closing: "Wrapping up",
  closed: "Closed",
};

export function MentorLabHome() {
  const router = useRouter();
  const { user } = useUser();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const me = useQuery(api.members.me, isAuthenticated ? {} : "skip");
  const labs = useQuery(
    api.labs.list,
    me &&
      (me.roles.includes("mentor") ||
        me.roles.includes("admin") ||
        me.roles.includes("super_admin"))
      ? {}
      : "skip",
  );
  const ensureLinked = useMutation(api.members.ensureLinked);
  const claim = useMutation(api.seed.claimLocalMentor);
  const seedDemo = useMutation(api.seed.seedDemoLab);
  const startLivePractice = useMutation(api.labs.startLivePractice);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    void ensureLinked({});
  }, [ensureLinked, isAuthenticated]);

  async function run<T>(action: () => Promise<T>): Promise<T | undefined> {
    setBusy(true);
    setError(null);
    try {
      return await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Action failed");
      return undefined;
    } finally {
      setBusy(false);
    }
  }

  const canMentor =
    me?.roles.includes("mentor") ||
    me?.roles.includes("admin") ||
    me?.roles.includes("super_admin");

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
            Relationship Coaching Institute
          </p>
          <h1 className="mt-1 text-2xl font-semibold">Live Labs</h1>
          <p className="mt-2 text-sm text-muted">
            Better conversation. Stronger coaching. Sign in to join a practice
            lab and support students in the room.
          </p>
        </div>
      </div>

      <Show
        when="signed-in"
        fallback={
          <div className="rounded-2xl border border-line bg-card p-5">
            <p className="text-sm">
              Sign in to join today’s practice labs.
            </p>
            <SignInButton mode="redirect">
              <button
                type="button"
                className="mt-4 rounded-lg bg-ink px-4 py-2 text-sm text-white"
              >
                Sign in
              </button>
            </SignInButton>
          </div>
        }
      >
        {isLoading || me === undefined ? (
          <p className="text-sm text-muted">One moment…</p>
        ) : !me || !canMentor ? (
          <div className="rounded-2xl border border-line bg-card p-5">
            <p className="text-sm font-medium">Welcome to RCI Labs</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              You’re signed in, but this account isn’t set up as a mentor yet.
              Continue as a mentor to join the practice rooms and support
              students.
            </p>
            <button
              type="button"
              className="mt-4 rounded-lg bg-ink px-4 py-2 text-sm text-white disabled:opacity-50"
              disabled={busy}
              onClick={() =>
                run(() =>
                  claim({
                    email: user?.primaryEmailAddress?.emailAddress,
                    firstName: user?.firstName ?? user?.fullName?.split(" ")[0],
                    lastName:
                      user?.lastName ??
                      user?.fullName?.split(" ").slice(1).join(" ") ??
                      undefined,
                  }),
                )
              }
            >
              Continue as a mentor
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg bg-ink px-4 py-2 text-sm text-white disabled:opacity-50"
                disabled={busy}
                onClick={async () => {
                  const result = await run(() => startLivePractice({}));
                  if (result?.labId) {
                    router.push(`/mentor/labs/${result.labId}`);
                  }
                }}
              >
                Start a 2-person call
              </button>
              <button
                type="button"
                className="rounded-lg border border-line px-4 py-2 text-sm disabled:opacity-50"
                disabled={busy}
                onClick={async () => {
                  const result = await run(() => seedDemo({}));
                  if (result?.labId) {
                    router.push(`/mentor/labs/${result.labId}`);
                  }
                }}
              >
                Open Wednesday practice lab
              </button>
              <Link
                className="rounded-lg border border-line px-4 py-2 text-sm"
                href="/labs"
              >
                Student lobby
              </Link>
            </div>
            <div className="overflow-hidden rounded-2xl border border-line bg-card">
              {(labs ?? []).length === 0 ? (
                <p className="p-5 text-sm text-muted">
                  No labs are open yet. Start a 2-person call to share a lobby
                  link, or open the Wednesday practice lab.
                </p>
              ) : (
                <ul>
                  {(labs ?? [])
                    .slice()
                    .sort((a, b) => b._creationTime - a._creationTime)
                    .map((lab) => (
                      <li key={lab._id} className="border-t border-line first:border-t-0">
                        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                          <span>
                            <span className="font-medium">{lab.title}</span>
                            <span className="ml-2 text-muted">
                              {labStatusLabel[lab.status] ?? lab.status}
                            </span>
                          </span>
                          <span className="flex gap-3">
                            <Link className="text-muted hover:text-ink" href={`/labs/${lab._id}/lobby`}>
                              Student lobby
                            </Link>
                            <Link className="font-medium" href={`/mentor/labs/${lab._id}`}>
                              Moderator room
                            </Link>
                          </span>
                        </div>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Show>

      {error ? (
        <p className="mt-4 text-sm text-danger">
          Something went wrong. Please try again.
        </p>
      ) : null}
    </div>
  );
}
