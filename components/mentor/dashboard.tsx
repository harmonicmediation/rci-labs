"use client";

import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/ui/status-badge";
import type { AttentionState } from "@/lib/domain/types";
import { formatClock } from "@/lib/mentor/format-timer";
import type {
  FixtureMentor,
  FixtureRoom,
} from "@/lib/fixtures/dashboard";

type Filter = "all" | AttentionState;

const filterLabels: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "All rooms" },
  { id: "on_track", label: "On track" },
  { id: "needs_attention", label: "Needs attention" },
  { id: "mentor_requested", label: "Mentor requested" },
  { id: "waiting", label: "Waiting" },
  { id: "completed", label: "Completed" },
];

export type MentorDashboardHandlers = {
  onJoin?: (roomId: string) => void;
  onReturn?: () => void;
  onReset?: (roomId: string) => void;
  onExtend?: (roomId: string) => void;
  onEndRound?: (roomId: string) => void;
  onMessageRoom?: (roomId: string, body: string) => void;
  onMoveParticipant?: (
    roomId: string,
    memberId: string,
    targetRoomId: string,
  ) => void;
  onSendChat?: (body: string) => void;
  onMatch?: () => void;
};

export function MentorDashboard({
  mentors,
  rooms,
  chat,
  preview = false,
  waitingCount = 0,
  roomSize = 3,
  joinedRoomId: joinedFromLive,
  handlers,
  busy = false,
}: {
  mentors: FixtureMentor[];
  rooms: FixtureRoom[];
  chat: Array<{ id: string; author: string; time: string; body: string }>;
  preview?: boolean;
  waitingCount?: number;
  roomSize?: number;
  joinedRoomId?: string | null;
  handlers?: MentorDashboardHandlers;
  busy?: boolean;
}) {
  const live = Boolean(handlers);
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState(rooms[1]?.id ?? rooms[0]?.id);
  const [localJoined, setLocalJoined] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveMemberId, setMoveMemberId] = useState("");
  const [moveTargetId, setMoveTargetId] = useState("");
  const [roomMessage, setRoomMessage] = useState("");
  const [chatDraft, setChatDraft] = useState("");

  const joinedRoomId = live ? (joinedFromLive ?? null) : localJoined;
  const visible = useMemo(
    () => (filter === "all" ? rooms : rooms.filter((room) => room.status === filter)),
    [filter, rooms],
  );
  const selected =
    rooms.find((room) => room.id === selectedId) ??
    rooms.find((room) => room.id === visible[0]?.id) ??
    rooms[0];
  const counts = {
    all: rooms.length,
    on_track: rooms.filter((room) => room.status === "on_track").length,
    needs_attention: rooms.filter((room) => room.status === "needs_attention").length,
    waiting: rooms.filter((room) => room.status === "waiting").length,
    completed: rooms.filter((room) => room.status === "completed").length,
    mentor_requested: rooms.filter((room) => room.status === "mentor_requested").length,
  };
  const duration = selected?.durationSeconds ?? 900;
  const movable = selected?.participants.filter(
    (person) => person.role !== "waiting" && person.memberId,
  ) ?? [];

  function joinRoom(room: FixtureRoom) {
    setSelectedId(room.id);
    if (handlers?.onJoin) {
      handlers.onJoin(room.id);
      return;
    }
    setLocalJoined(String(room.ordinal));
  }

  function returnToModerator() {
    if (handlers?.onReturn) {
      handlers.onReturn();
      return;
    }
    setLocalJoined(null);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <section className="border-b border-line bg-card px-6 py-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Moderator room</p>
            <p className="text-xs text-muted">{mentors.length} mentors online</p>
          </div>
          <div className="flex gap-2">
            <button type="button" className="rounded-lg border border-line px-3 py-1.5 text-sm">
              Mute
            </button>
            <button type="button" className="rounded-lg border border-line px-3 py-1.5 text-sm">
              Stop video
            </button>
            <button type="button" className="rounded-lg bg-danger px-3 py-1.5 text-sm text-white">
              Leave
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {mentors.map((mentor) => (
            <div key={mentor.id} className="overflow-hidden rounded-xl bg-slate-900">
              <div className="flex h-28 items-end bg-linear-to-br from-slate-700 to-slate-900 p-3">
                <div>
                  <p className="text-sm font-medium text-white">{mentor.name}</p>
                  {mentor.inRoom ? (
                    <p className="text-xs text-teal-200">In room {mentor.inRoom}</p>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
        {joinedRoomId ? (
          <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-900 px-3 py-2 text-sm text-white">
            <span>Moderator dock · muted while you are in room {joinedRoomId}</span>
            <button
              type="button"
              className="rounded-md bg-white/10 px-2 py-1"
              onClick={returnToModerator}
              disabled={busy}
            >
              Return
            </button>
          </div>
        ) : null}
        {waitingCount > 0 ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted">
              {waitingCount} student{waitingCount === 1 ? "" : "s"} waiting in
              lobby for a group of {roomSize}.
            </p>
            {handlers?.onMatch ? (
              <button
                type="button"
                className="rounded-lg border border-line px-3 py-1.5 text-sm disabled:opacity-50"
                disabled={busy}
                onClick={handlers.onMatch}
              >
                Match now
              </button>
            ) : null}
          </div>
        ) : null}
      </section>

      <div className="grid flex-1 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="p-6">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {filterLabels.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`rounded-full border px-3 py-1 text-sm ${
                  filter === item.id
                    ? "border-ink bg-ink text-white"
                    : "border-line bg-card text-muted"
                }`}
              >
                {item.label}
                <span className="ml-1 text-xs opacity-70">{counts[item.id]}</span>
              </button>
            ))}
          </div>
          {visible.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-card p-8 text-sm text-muted">
              No rooms in this filter. Open students will appear here after matching.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {visible.map((room) => (
                <article
                  key={room.id}
                  className={`rounded-2xl border bg-card p-4 shadow-[var(--shadow)] ${
                    selected?.id === room.id ? "border-ink" : "border-line"
                  } ${
                    room.status === "needs_attention" || room.status === "mentor_requested"
                      ? "border-red-200"
                      : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">Room {room.ordinal}</p>
                      <p className="text-xs text-muted">{room.remainingLabel}</p>
                    </div>
                    <StatusBadge status={room.status} />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {room.participants.map((person) => (
                      <div key={person.id} className="text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold">
                          {person.initials || "—"}
                        </div>
                        <p className="mt-1 text-[11px] uppercase tracking-wide text-muted">
                          {person.role}
                        </p>
                        <p className="truncate text-xs">{person.name}</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-sm font-medium">{room.title}</p>
                  <p className="text-xs text-muted">{room.module}</p>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      className="rounded-lg bg-ink px-3 py-1.5 text-sm text-white disabled:opacity-50"
                      disabled={busy}
                      onClick={() => joinRoom(room)}
                    >
                      Join
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-line px-3 py-1.5 text-sm"
                      onClick={() => setSelectedId(room.id)}
                    >
                      Details
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="border-l border-line bg-card">
          {selected ? (
            <div className="flex h-full flex-col">
              <div className="border-b border-line px-5 py-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">Room {selected.ordinal}</p>
                  <StatusBadge status={selected.status} />
                </div>
                <p className="text-sm text-muted">{selected.title}</p>
              </div>
              <div className="space-y-5 overflow-auto px-5 py-4">
                <section>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    AI insights
                  </p>
                  <p className="mt-2 rounded-xl bg-surface p-3 text-sm">
                    {selected.insight ?? "No attention signals in the current window."}
                  </p>
                </section>
                <section>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Room controls
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      className="rounded-lg border border-line px-3 py-2 text-left text-sm"
                      onClick={() => {
                        setMoveMemberId(movable[0]?.memberId ?? "");
                        setMoveTargetId(
                          rooms.find((room) => room.id !== selected.id)?.id ?? "",
                        );
                        setMoveOpen(true);
                      }}
                    >
                      Move participant
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-line px-3 py-2 text-left text-sm"
                      onClick={() => {
                        document.getElementById("room-message")?.focus();
                      }}
                    >
                      Message room
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-line px-3 py-2 text-left text-sm disabled:opacity-50"
                      disabled={busy || (Boolean(handlers) && !selected.roundId)}
                      onClick={() => handlers?.onExtend?.(selected.id)}
                    >
                      Extend +5 min
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-line px-3 py-2 text-left text-sm"
                      onClick={() => setResetOpen(true)}
                    >
                      Reset timer
                    </button>
                    <button
                      type="button"
                      className="col-span-2 rounded-lg border border-danger px-3 py-2 text-left text-sm text-danger"
                      onClick={() => setEndOpen(true)}
                    >
                      End round
                    </button>
                  </div>
                  {live ? (
                    <form
                      className="mt-3 flex gap-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const body = roomMessage.trim();
                        if (!body) return;
                        handlers?.onMessageRoom?.(selected.id, body);
                        setRoomMessage("");
                      }}
                    >
                      <input
                        id="room-message"
                        value={roomMessage}
                        onChange={(event) => setRoomMessage(event.target.value)}
                        placeholder="Message this room"
                        className="min-w-0 flex-1 rounded-lg border border-line px-3 py-2 text-sm"
                      />
                      <button
                        type="submit"
                        className="rounded-lg bg-ink px-3 py-2 text-sm text-white disabled:opacity-50"
                        disabled={busy}
                      >
                        Send
                      </button>
                    </form>
                  ) : null}
                </section>
                <section>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Moderator chat
                  </p>
                  <div className="mt-2 space-y-2">
                    {chat.map((message) => (
                      <div key={message.id} className="rounded-xl bg-surface px-3 py-2">
                        <p className="text-xs text-muted">
                          {message.author} · {message.time}
                        </p>
                        <p className="text-sm">{message.body}</p>
                      </div>
                    ))}
                  </div>
                  {live ? (
                    <form
                      className="mt-3 flex gap-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const body = chatDraft.trim();
                        if (!body) return;
                        handlers?.onSendChat?.(body);
                        setChatDraft("");
                      }}
                    >
                      <input
                        value={chatDraft}
                        onChange={(event) => setChatDraft(event.target.value)}
                        placeholder="Message mentors"
                        className="min-w-0 flex-1 rounded-lg border border-line px-3 py-2 text-sm"
                      />
                      <button
                        type="submit"
                        className="rounded-lg border border-line px-3 py-2 text-sm disabled:opacity-50"
                        disabled={busy}
                      >
                        Send
                      </button>
                    </form>
                  ) : null}
                </section>
              </div>
            </div>
          ) : null}
        </aside>
      </div>

      {resetOpen && selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl">
            <h2 className="text-lg font-semibold">
              Reset this round to {formatClock(duration)}?
            </h2>
            <p className="mt-2 text-sm text-muted">
              Timer reset is audited and requires confirmation.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-line px-3 py-2 text-sm"
                onClick={() => setResetOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-ink px-3 py-2 text-sm text-white"
                onClick={() => {
                  handlers?.onReset?.(selected.id);
                  setResetOpen(false);
                }}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {endOpen && selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl">
            <h2 className="text-lg font-semibold">End this round?</h2>
            <p className="mt-2 text-sm text-muted">
              The room will be marked completed. This cannot be undone from the dashboard.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-line px-3 py-2 text-sm"
                onClick={() => setEndOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-danger px-3 py-2 text-sm text-white"
                onClick={() => {
                  handlers?.onEndRound?.(selected.id);
                  setEndOpen(false);
                }}
              >
                End round
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {moveOpen && selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl">
            <h2 className="text-lg font-semibold">Move a participant</h2>
            <label className="mt-4 block text-sm">
              Person
              <select
                className="mt-1 w-full rounded-lg border border-line px-3 py-2"
                value={moveMemberId}
                onChange={(event) => setMoveMemberId(event.target.value)}
              >
                {movable.map((person) => (
                  <option key={person.id} value={person.memberId}>
                    {person.name} ({person.role})
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-3 block text-sm">
              Destination
              <select
                className="mt-1 w-full rounded-lg border border-line px-3 py-2"
                value={moveTargetId}
                onChange={(event) => setMoveTargetId(event.target.value)}
              >
                {rooms
                  .filter((room) => room.id !== selected.id)
                  .map((room) => (
                    <option key={room.id} value={room.id}>
                      Room {room.ordinal} · {room.title}
                    </option>
                  ))}
              </select>
            </label>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-line px-3 py-2 text-sm"
                onClick={() => setMoveOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-ink px-3 py-2 text-sm text-white disabled:opacity-50"
                disabled={!moveMemberId || !moveTargetId || !live}
                onClick={() => {
                  handlers?.onMoveParticipant?.(
                    selected.id,
                    moveMemberId,
                    moveTargetId,
                  );
                  setMoveOpen(false);
                }}
              >
                Move
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {preview ? (
        <p className="border-t border-line px-6 py-2 text-xs text-muted">
          Preview data — use Live labs after signing in to drive this from Convex.
        </p>
      ) : null}
    </div>
  );
}
