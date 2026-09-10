"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { MentorDashboard } from "@/components/mentor/dashboard";
import { DailyCall } from "@/components/video/daily-call";
import { ShareLobbyLink } from "@/components/video/share-lobby-link";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { mapLabState, type LabStateInput } from "@/lib/mentor/map-lab-state";

export function LiveMentorDashboard({ labId }: { labId: string }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const typedLabId = labId as Id<"labSessions">;
  const state = useQuery(
    api.labs.state,
    isAuthenticated ? { labId: typedLabId } : "skip",
  );
  const enter = useMutation(api.rooms.enter);
  const leave = useMutation(api.rooms.leaveToModerator);
  const reset = useMutation(api.rounds.reset);
  const adjust = useMutation(api.rounds.adjust);
  const endRound = useMutation(api.rounds.end);
  const messageRoom = useMutation(api.rooms.message);
  const moveParticipant = useMutation(api.rooms.moveParticipant);
  const sendChat = useMutation(api.rooms.sendModeratorMessage);
  const match = useMutation(api.labs.match);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const mapped = useMemo(
    () => (state ? mapLabState(state as LabStateInput, now) : null),
    [state, now],
  );

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  if (isLoading || (isAuthenticated && state === undefined)) {
    return <p className="p-6 text-sm text-muted">Loading live lab…</p>;
  }
  if (!isAuthenticated) {
    return <p className="p-6 text-sm text-muted">Sign in to open the live dashboard.</p>;
  }
  if (!state || !mapped) {
    return <p className="p-6 text-sm text-muted">This lab was not found.</p>;
  }

  function roundIdFor(roomId: string) {
    return mapped?.rooms.find((room) => room.id === roomId)?.roundId;
  }

  return (
    <>
      {error ? (
        <p className="border-b border-red-200 bg-danger-soft px-6 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      <ShareLobbyLink
        labId={labId}
        roomSize={state.lab.desiredRoomSize}
      />
      {mapped.joinedPracticeRoomId ? (
        <DailyCall
          roomId={mapped.joinedPracticeRoomId}
          className="h-[min(52vh,480px)] w-full border-b border-line"
        />
      ) : null}
      <MentorDashboard
        mentors={mapped.mentors}
        rooms={mapped.rooms}
        chat={mapped.chat}
        waitingCount={mapped.waitingCount}
        roomSize={state.lab.desiredRoomSize}
        joinedRoomId={mapped.joinedRoomId}
        busy={busy}
        handlers={{
          onJoin: (roomId) =>
            run(() => enter({ roomId: roomId as Id<"practiceRooms">, labId: typedLabId })),
          onReturn: () => run(() => leave({ labId: typedLabId })),
          onReset: (roomId) => {
            const roundId = roundIdFor(roomId);
            const duration =
              mapped.rooms.find((room) => room.id === roomId)?.durationSeconds ?? 900;
            if (!roundId) return;
            return run(() =>
              reset({
                roundId: roundId as Id<"rounds">,
                confirm: true,
                durationSeconds: duration,
              }),
            );
          },
          onExtend: (roomId) => {
            const roundId = roundIdFor(roomId);
            if (!roundId) return;
            return run(() =>
              adjust({ roundId: roundId as Id<"rounds">, deltaSeconds: 300 }),
            );
          },
          onEndRound: (roomId) => {
            const roundId = roundIdFor(roomId);
            if (!roundId) return;
            return run(() => endRound({ roundId: roundId as Id<"rounds"> }));
          },
          onMessageRoom: (roomId, body) =>
            run(() =>
              messageRoom({
                roomId: roomId as Id<"practiceRooms">,
                body,
              }),
            ),
          onMoveParticipant: (roomId, memberId, targetRoomId) =>
            run(() =>
              moveParticipant({
                roomId: roomId as Id<"practiceRooms">,
                memberId: memberId as Id<"members">,
                targetRoomId: targetRoomId as Id<"practiceRooms">,
              }),
            ),
          onSendChat: (body) =>
            run(() => sendChat({ labId: typedLabId, body })),
          onMatch: () => run(() => match({ labId: typedLabId })),
        }}
      />
    </>
  );
}
