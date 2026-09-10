import { describe, expect, it } from "vitest";
import { canFormRoom, matchQueue } from "./matching";

describe("matchQueue", () => {
  it("forms groups of the configured size in join order", () => {
    const result = matchQueue({
      roomSize: 3,
      waiting: [
        { memberId: "c", joinedAt: 30 },
        { memberId: "a", joinedAt: 10 },
        { memberId: "b", joinedAt: 20 },
        { memberId: "d", joinedAt: 40 },
      ],
    });

    expect(result.rooms).toEqual([{ memberIds: ["a", "b", "c"] }]);
    expect(result.stillWaiting.map((entry) => entry.memberId)).toEqual(["d"]);
  });

  it("skips people already assigned to an active room", () => {
    const result = matchQueue({
      roomSize: 2,
      alreadyAssigned: ["a"],
      waiting: [
        { memberId: "a", joinedAt: 1 },
        { memberId: "b", joinedAt: 2 },
        { memberId: "c", joinedAt: 3 },
      ],
    });

    expect(result.rooms).toEqual([{ memberIds: ["b", "c"] }]);
    expect(result.stillWaiting).toEqual([]);
  });

  it("deduplicates the same member appearing twice in the queue", () => {
    const result = matchQueue({
      roomSize: 2,
      waiting: [
        { memberId: "a", joinedAt: 1 },
        { memberId: "a", joinedAt: 2 },
        { memberId: "b", joinedAt: 3 },
      ],
    });

    expect(result.rooms).toEqual([{ memberIds: ["a", "b"] }]);
  });

  it("keeps an incomplete remainder waiting", () => {
    const result = matchQueue({
      roomSize: 3,
      waiting: [
        { memberId: "a", joinedAt: 1 },
        { memberId: "b", joinedAt: 2 },
      ],
    });

    expect(result.rooms).toEqual([]);
    expect(result.stillWaiting).toHaveLength(2);
  });
});

describe("canFormRoom", () => {
  it("requires a full group", () => {
    expect(canFormRoom(2, 3)).toBe(false);
    expect(canFormRoom(3, 3)).toBe(true);
  });
});
