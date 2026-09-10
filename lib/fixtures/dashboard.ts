import type { AttentionState } from "../domain/types";

export type FixtureMentor = {
  id: string;
  name: string;
  inRoom?: number;
};

export type FixtureParticipant = {
  id: string;
  memberId?: string;
  name: string;
  role: "coach" | "client" | "observer" | "waiting";
  initials: string;
};

export type FixtureRoom = {
  id: string;
  ordinal: number;
  title: string;
  module: string;
  status: AttentionState;
  remainingLabel: string;
  remainingSeconds?: number;
  durationSeconds?: number;
  roundId?: string;
  participants: FixtureParticipant[];
  insight?: string;
};

export const fixtureMentors: FixtureMentor[] = [
  { id: "m1", name: "John (you)" },
  { id: "m2", name: "Celicia Chen" },
  { id: "m3", name: "Marcus Cole", inRoom: 5 },
  { id: "m4", name: "Priya Shah" },
];

export const fixtureRooms: FixtureRoom[] = [
  {
    id: "r1",
    ordinal: 1,
    title: "Empathic Reflection",
    module: "Radical Marriage · Module 4",
    status: "on_track",
    remainingLabel: "12:34 / 15:00",
    participants: [
      { id: "p1", name: "Daniel A.", role: "coach", initials: "DA" },
      { id: "p2", name: "Sarah B.", role: "client", initials: "SB" },
      { id: "p3", name: "Maya T.", role: "observer", initials: "MT" },
    ],
  },
  {
    id: "r2",
    ordinal: 2,
    title: "Staying with Emotion",
    module: "Conscious Dating · Module 3",
    status: "needs_attention",
    remainingLabel: "03:12 / 15:00",
    insight: "Client showed frustration; coach gave advice twice.",
    participants: [
      { id: "p4", name: "Alex R.", role: "coach", initials: "AR" },
      { id: "p5", name: "Taylor M.", role: "client", initials: "TM" },
      { id: "p6", name: "Noel P.", role: "observer", initials: "NP" },
    ],
  },
  {
    id: "r3",
    ordinal: 3,
    title: "Open Questions",
    module: "Winning Conflict · Module 2",
    status: "on_track",
    remainingLabel: "08:45 / 15:00",
    participants: [
      { id: "p7", name: "Riley N.", role: "coach", initials: "RN" },
      { id: "p8", name: "Casey B.", role: "client", initials: "CB" },
      { id: "p9", name: "Emma L.", role: "observer", initials: "EL" },
    ],
  },
  {
    id: "r7",
    ordinal: 7,
    title: "Self Empathy",
    module: "Conscious Dating · Module 2",
    status: "waiting",
    remainingLabel: "0:00 / 15:00",
    participants: [
      { id: "p10", name: "Waiting…", role: "waiting", initials: "" },
      { id: "p11", name: "Waiting…", role: "waiting", initials: "" },
      { id: "p12", name: "Waiting…", role: "waiting", initials: "" },
    ],
  },
  {
    id: "r8",
    ordinal: 8,
    title: "Repair and Reconnection",
    module: "Radical Marriage · Module 5",
    status: "on_track",
    remainingLabel: "10:15 / 15:00",
    participants: [
      { id: "p13", name: "Jordan L.", role: "coach", initials: "JL" },
      { id: "p14", name: "Sam P.", role: "client", initials: "SP" },
      { id: "p15", name: "Ava K.", role: "observer", initials: "AK" },
    ],
  },
  {
    id: "r12",
    ordinal: 12,
    title: "Emotional Triggers",
    module: "Conscious Dating · Module 4",
    status: "needs_attention",
    remainingLabel: "04:30 / 15:00",
    insight: "Room 5 requested support — mentor suggested.",
    participants: [
      { id: "p16", name: "Ida T.", role: "coach", initials: "IT" },
      { id: "p17", name: "Ben K.", role: "client", initials: "BK" },
      { id: "p18", name: "Nina Q.", role: "observer", initials: "NQ" },
    ],
  },
];

export const fixtureChat = [
  { id: "c1", author: "Celicia", time: "7:16 PM", body: "Room 2 looks tricky. I'm going to listen for a minute." },
  { id: "c2", author: "Marcus", time: "7:16 PM", body: "I can jump in if needed." },
  { id: "c3", author: "Priya", time: "7:17 PM", body: "Room 5 requested support — I'll rotate at 7:20." },
];
