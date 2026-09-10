import { describe, expect, it } from "vitest";
import { mapLabState } from "./map-lab-state";

describe("mapLabState", () => {
  it("maps rooms, you-label, and running timer remaining", () => {
    const now = 1_000_000;
    const mapped = mapLabState(
      {
        me: { id: "mentor-me", displayName: "John" },
        waiting: [{ _id: "w1", displayName: "Pat" }],
        chat: [
          {
            id: "c1",
            author: "Celicia Chen",
            createdAt: now - 60_000,
            body: "I'll take room 2",
          },
        ],
        mentors: [
          {
            _id: "ms1",
            mentorId: "mentor-me",
            displayName: "John",
            currentPracticeRoomId: "room-1",
            status: "joined",
          },
          {
            _id: "ms2",
            mentorId: "mentor-2",
            displayName: "Celicia Chen",
            status: "joined",
          },
        ],
        rooms: [
          {
            _id: "room-1",
            ordinal: 1,
            roomKind: "practice",
            attentionState: "on_track",
            sharedNote: "Empathic Reflection · Radical Marriage · Module 4",
            participants: [
              {
                _id: "p1",
                memberId: "s1",
                role: "coach",
                joinStatus: "joined",
                displayName: "Alex Rivera",
              },
              {
                _id: "p2",
                memberId: "s2",
                role: "client",
                joinStatus: "joined",
                displayName: "Taylor Morgan",
              },
            ],
            round: {
              _id: "round-1",
              status: "running",
              durationSeconds: 900,
              remainingSeconds: 900,
              startedAt: now - 146_000,
            },
          },
        ],
      },
      now,
    );

    expect(mapped.mentors[0]?.name).toBe("John (you)");
    expect(mapped.mentors[0]?.inRoom).toBe(1);
    expect(mapped.joinedRoomId).toBe("1");
    expect(mapped.joinedPracticeRoomId).toBe("room-1");
    expect(mapped.waitingCount).toBe(1);
    expect(mapped.rooms[0]?.title).toBe("Empathic Reflection");
    expect(mapped.rooms[0]?.remainingLabel).toBe("12:34 / 15:00");
    expect(mapped.rooms[0]?.participants.map((person) => person.role)).toEqual([
      "coach",
      "client",
      "waiting",
    ]);
  });
});
