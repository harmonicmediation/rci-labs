import { remainingSeconds } from "@/lib/domain/timer";
import type { AttentionState, PracticeRole } from "@/lib/domain/types";
import type {
  FixtureMentor,
  FixtureParticipant,
  FixtureRoom,
} from "@/lib/fixtures/dashboard";
import { formatRemainingLabel, initialsFromName } from "./format-timer";

const PRACTICE_SLOTS = ["coach", "client", "observer"] as const;

export type LabStateRoom = {
  _id: string;
  ordinal: number;
  roomKind: string;
  attentionState: AttentionState;
  attentionReasonSummary?: string;
  sharedNote?: string;
  currentRoundId?: string;
  participants: Array<{
    _id: string;
    memberId: string;
    role: PracticeRole;
    joinStatus: string;
    displayName: string;
  }>;
  round: {
    _id: string;
    status: "pending" | "running" | "paused" | "complete" | "cancelled";
    durationSeconds: number;
    remainingSeconds: number;
    startedAt?: number;
    pausedAt?: number;
    endedAt?: number;
    remainingSecondsNow?: number;
  } | null;
};

export type LabStateInput = {
  me: { id: string; displayName: string };
  rooms: LabStateRoom[];
  mentors: Array<{
    _id: string;
    mentorId: string;
    displayName: string;
    currentPracticeRoomId?: string;
    status: string;
  }>;
  chat: Array<{
    id: string;
    author: string;
    createdAt: number;
    body: string;
  }>;
  waiting: Array<{ _id: string; displayName: string }>;
};

export type MappedLabDashboard = {
  mentors: FixtureMentor[];
  rooms: FixtureRoom[];
  chat: Array<{ id: string; author: string; time: string; body: string }>;
  joinedRoomId: string | null;
  joinedPracticeRoomId: string | null;
  waitingCount: number;
};

export function mapLabState(
  state: LabStateInput,
  now: number,
): MappedLabDashboard {
  const roomsById = new Map(state.rooms.map((room) => [room._id, room]));
  const myMentor = state.mentors.find((row) => row.mentorId === state.me.id);
  const joinedRoom = myMentor?.currentPracticeRoomId
    ? roomsById.get(myMentor.currentPracticeRoomId)
    : undefined;

  const mentors: FixtureMentor[] = state.mentors
    .filter((row) => row.status !== "left")
    .map((row) => {
      const inRoom = row.currentPracticeRoomId
        ? roomsById.get(row.currentPracticeRoomId)?.ordinal
        : undefined;
      const isYou = row.mentorId === state.me.id;
      return {
        id: row._id,
        name: isYou ? `${row.displayName} (you)` : row.displayName,
        inRoom,
      };
    });

  const rooms: FixtureRoom[] = state.rooms
    .filter((room) => room.roomKind === "practice")
    .sort((a, b) => a.ordinal - b.ordinal)
    .map((room) => {
      const humans = room.participants.filter(
        (person) =>
          (person.role === "coach" ||
            person.role === "client" ||
            person.role === "observer") &&
          person.joinStatus !== "left",
      );
      const byRole = new Map<(typeof PRACTICE_SLOTS)[number], (typeof humans)[number]>(
        humans.map((person) => [person.role as (typeof PRACTICE_SLOTS)[number], person]),
      );
      const participants: FixtureParticipant[] = PRACTICE_SLOTS.map((role) => {
        const person = byRole.get(role);
        if (!person) {
          return {
            id: `${room._id}-${role}-empty`,
            memberId: "",
            name: "Waiting…",
            role: "waiting" as const,
            initials: "",
          };
        }
        return {
          id: person._id,
          memberId: person.memberId,
          name: person.displayName,
          role,
          initials: initialsFromName(person.displayName),
        };
      });

      const remaining = room.round
        ? remainingSeconds(room.round, now)
        : 0;
      const duration = room.round?.durationSeconds ?? 900;
      const [title, module] = splitNote(room.sharedNote);

      return {
        id: room._id,
        ordinal: room.ordinal,
        title,
        module,
        status: room.attentionState,
        remainingLabel: formatRemainingLabel(remaining, duration),
        remainingSeconds: remaining,
        durationSeconds: duration,
        roundId: room.round?._id,
        insight: room.attentionReasonSummary,
        participants,
      };
    });

  const chat = [...state.chat]
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((row) => ({
      id: row.id,
      author: row.author,
      time: formatChatTime(row.createdAt),
      body: row.body,
    }));

  return {
    mentors,
    rooms,
    chat,
    joinedRoomId: joinedRoom ? String(joinedRoom.ordinal) : null,
    joinedPracticeRoomId: myMentor?.currentPracticeRoomId ?? null,
    waitingCount: state.waiting.length,
  };
}

function splitNote(note?: string): [string, string] {
  if (!note) return ["Practice room", ""];
  const [title, ...rest] = note.split(" · ");
  return [title || "Practice room", rest.join(" · ")];
}

function formatChatTime(createdAt: number): string {
  return new Date(createdAt).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}
