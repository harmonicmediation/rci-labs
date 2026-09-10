"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DailyCall } from "@/components/video/daily-call";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { remainingSeconds } from "@/lib/domain/timer";
import { formatClock } from "@/lib/mentor/format-timer";

const ROLE_LABEL: Record<string, string> = {
  coach: "Coach",
  client: "Client",
  observer: "Observer",
  mentor: "Mentor",
};

export function LiveStudentRoom({
  labId,
  roomId,
}: {
  labId: string;
  roomId: string;
}) {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const typedRoomId = roomId as Id<"practiceRooms">;
  const me = useQuery(api.members.me, isAuthenticated ? {} : "skip");
  const room = useQuery(
    api.rooms.get,
    isAuthenticated ? { roomId: typedRoomId } : "skip",
  );
  const requestHelp = useMutation(api.rooms.requestHelp);
  const leave = useMutation(api.rooms.leave);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [helpSent, setHelpSent] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const people =
    room?.participants.filter(
      (person) =>
        person.joinStatus !== "left" &&
        person.role !== "mentor" &&
        person.role !== "ai_observer",
    ) ?? [];
  const mine = people.find((person) => person.memberId === me?.id);
  const remaining = room?.round
    ? remainingSeconds(room.round, now)
    : 0;
  const note = room?.sharedNote?.split(" · ")[0];

  async function onHelp() {
    setBusy(true);
    try {
      await requestHelp({ roomId: typedRoomId });
      setHelpSent(true);
    } finally {
      setBusy(false);
    }
  }

  async function onLeave() {
    setBusy(true);
    try {
      await leave({ roomId: typedRoomId });
      router.push(`/labs/${labId}/lobby`);
    } finally {
      setBusy(false);
    }
  }

  if (!isAuthenticated || room === undefined) {
    return <p className="p-6 text-sm text-muted">One moment…</p>;
  }
  if (room === null) {
    return (
      <div className="p-6 text-sm text-muted">
        This room is no longer available.{" "}
        <Link className="text-accent" href={`/labs/${labId}/lobby`}>
          Return to the lobby
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <div className="flex items-center justify-between border-b border-line bg-card px-6 py-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">
            Room {room.ordinal}
            {note ? ` · ${note}` : ""}
          </p>
          <p className="font-semibold">
            Your role: {mine ? ROLE_LABEL[mine.role] ?? mine.role : "Joining…"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-surface px-3 py-1 text-sm font-semibold">
            {formatClock(remaining)}
          </span>
          <button
            type="button"
            className="rounded-lg bg-ink px-3 py-1.5 text-sm text-white disabled:opacity-50"
            disabled={busy || helpSent}
            onClick={() => void onHelp()}
          >
            {helpSent || room.attentionState === "mentor_requested"
              ? "Mentor requested"
              : "Request mentor"}
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <DailyCall roomId={roomId} className="h-full min-h-[60vh]" />
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-line bg-card px-6 py-3">
        <p className="text-sm text-muted">
          {people
            .map((person) =>
              person.memberId === me?.id
                ? `You (${ROLE_LABEL[person.role] ?? person.role})`
                : `${person.displayName} (${ROLE_LABEL[person.role] ?? person.role})`,
            )
            .join(" · ") || "Waiting for others…"}
        </p>
        <button
          type="button"
          className="rounded-lg border border-danger px-3 py-2 text-sm text-danger disabled:opacity-50"
          disabled={busy}
          onClick={() => void onLeave()}
        >
          Leave
        </button>
      </div>
    </div>
  );
}
