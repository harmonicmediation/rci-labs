"use client";

import { Show, SignInButton, useUser } from "@clerk/nextjs";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { ConsentFlag } from "@/lib/privacy/consent";
import { requiredFlagsForSession } from "@/lib/privacy/consent";

const FLAG_COPY: Record<ConsentFlag, { title: string; detail: string }> = {
  audioVideo: {
    title: "Live audio and video",
    detail: "You’ll be in the practice room with camera and microphone.",
  },
  recording: {
    title: "Recording",
    detail: "This session may be recorded so mentors can review the practice.",
  },
  transcription: {
    title: "Transcription",
    detail: "What is said may be written down to support coaching feedback.",
  },
  aiMonitoring: {
    title: "AI support for mentors",
    detail: "An observer may flag moments that need a mentor’s attention.",
  },
  mentorReporting: {
    title: "Mentor reports",
    detail: "Mentors may review your practice and share notes with you.",
  },
  retention: {
    title: "How long we keep records",
    detail: "Notes and reports are kept only as long as RCI’s policy allows.",
  },
};

export function LiveStudentLobby({ labId }: { labId: string }) {
  const router = useRouter();
  const { user } = useUser();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const typedLabId = labId as Id<"labSessions">;
  const me = useQuery(api.members.me, isAuthenticated ? {} : "skip");
  const entry = useQuery(
    api.labs.entry,
    isAuthenticated && me ? { labId: typedLabId } : "skip",
  );
  const ensureSelf = useMutation(api.members.ensureSelf);
  const joinLobby = useMutation(api.labs.joinLobby);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || me) return;
    void ensureSelf({
      email: user?.primaryEmailAddress?.emailAddress,
      firstName: user?.firstName ?? user?.fullName?.split(" ")[0],
      lastName:
        user?.lastName ?? user?.fullName?.split(" ").slice(1).join(" ") ?? undefined,
    });
  }, [ensureSelf, isAuthenticated, me, user]);

  useEffect(() => {
    const roomId = entry?.assignment?.assignedRoomId;
    if (entry?.assignment?.status === "assigned" && roomId) {
      router.replace(`/labs/${labId}/rooms/${roomId}`);
    }
  }, [entry?.assignment, labId, router]);

  const flags = (
    entry
      ? (entry.policy?.requiredFlags ?? []).filter((flag) =>
          requiredFlagsForSession({
            recordingEnabled: entry.lab.recordingEnabled,
            transcriptionEnabled: entry.lab.transcriptionEnabled,
            aiMonitoringEnabled: entry.lab.transcriptionEnabled,
            mentorReportingEnabled: true,
          }).includes(flag),
        )
      : ["audioVideo", "transcription", "aiMonitoring", "mentorReporting", "retention"]
  ) as ConsentFlag[];
  const waiting = entry?.waitingCount ?? 0;
  const roomSize = entry?.lab.desiredRoomSize ?? 3;
  const needed = Math.max(0, roomSize - waiting);
  const progress = Math.min(1, waiting / roomSize);

  async function onSubmit(form: HTMLFormElement) {
    setBusy(true);
    setError(null);
    try {
      const data = new FormData(form);
      const nextFlags = {
        audioVideo: data.get("audioVideo") === "on",
        recording: data.get("recording") === "on",
        transcription: data.get("transcription") === "on",
        aiMonitoring: data.get("aiMonitoring") === "on",
        mentorReporting: data.get("mentorReporting") === "on",
        retention: data.get("retention") === "on",
      };
      const result = await joinLobby({ labId: typedLabId, flags: nextFlags });
      if (result.roomId) {
        router.replace(`/labs/${labId}/rooms/${result.roomId}`);
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? "We couldn’t add you to the lobby. Please try again."
          : "We couldn’t add you to the lobby. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="flex items-center justify-between border-b border-line bg-card px-6 py-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
            Relationship Coaching Institute
          </p>
          <p className="text-sm font-semibold">RCI Labs</p>
        </div>
        <Link className="text-sm text-muted" href="/labs">
          All labs
        </Link>
      </header>

      <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center px-6 py-8">
        <Show
          when="signed-in"
          fallback={
            <div className="rounded-2xl border border-line bg-card p-5">
              <p className="text-sm">Sign in to join this practice lab.</p>
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
          {isLoading || me === undefined || (me && entry === undefined) ? (
            <p className="text-sm text-muted">One moment…</p>
          ) : !entry ? (
            <p className="text-sm text-muted">This lab could not be found.</p>
          ) : entry.lab.status !== "open" && entry.lab.status !== "live" ? (
            <p className="text-sm text-muted">This lab isn’t open yet.</p>
          ) : entry.assignment?.status === "waiting" ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
                Lobby
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                {entry.lab.title}
              </h1>
              <p className="mt-3 text-muted">
                You’re in the lobby. We’ll place you in a practice room of{" "}
                {roomSize} as soon as a group is ready.
              </p>
              <div className="mt-6 rounded-2xl border border-line bg-card p-5 shadow-[var(--shadow)]">
                <p className="text-sm font-medium">Matching</p>
                <p className="mt-1 text-sm text-muted">
                  {needed === 0
                    ? "A room is forming now."
                    : needed === 1
                      ? "Waiting for 1 more person"
                      : `Waiting for ${needed} more people`}
                </p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface">
                  <div
                    className="h-full bg-accent"
                    style={{ width: `${Math.max(12, progress * 100)}%` }}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
                Lobby
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                {entry.lab.title}
              </h1>
              <form
                className="mt-6 space-y-3 rounded-2xl border border-line bg-card p-5 shadow-[var(--shadow)]"
                onSubmit={(event) => {
                  event.preventDefault();
                  void onSubmit(event.currentTarget);
                }}
              >
                <p className="text-sm font-medium">Before you enter</p>
                <p className="text-sm leading-6 text-muted">
                  {entry.policy?.body ??
                    "This lab uses live video so you can practice coaching with others. Mentors may look in to support the room."}
                </p>
                {flags.map((flag) => (
                  <label key={flag} className="flex items-start gap-2 text-sm">
                    <input type="checkbox" name={flag} required className="mt-1" />
                    <span>
                      <span className="font-medium">{FLAG_COPY[flag].title}</span>
                      <span className="mt-0.5 block text-muted">
                        {FLAG_COPY[flag].detail}
                      </span>
                    </span>
                  </label>
                ))}
                <button
                  className="rounded-lg bg-ink px-4 py-2 text-sm text-white disabled:opacity-50"
                  type="submit"
                  disabled={busy}
                >
                  Agree and join lobby
                </button>
              </form>
            </>
          )}
        </Show>
        {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
      </div>
    </div>
  );
}
