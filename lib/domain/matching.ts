import type { MatchResult, QueueEntry } from "./types";

export type MatchQueueInput = {
  waiting: QueueEntry[];
  roomSize: number;
  alreadyAssigned?: Iterable<string>;
};

/**
 * First-in matching. Skips anyone already in an active room and leaves a
 * remainder group waiting until a mentor assigns them or more people join.
 */
export function matchQueue(input: MatchQueueInput): MatchResult {
  const roomSize = Math.max(1, Math.floor(input.roomSize));
  const assigned = new Set(input.alreadyAssigned ?? []);
  const ordered = [...input.waiting]
    .filter((entry) => !assigned.has(entry.memberId))
    .sort((a, b) => a.joinedAt - b.joinedAt || a.memberId.localeCompare(b.memberId));

  const seen = new Set<string>();
  const unique: QueueEntry[] = [];
  for (const entry of ordered) {
    if (seen.has(entry.memberId)) continue;
    seen.add(entry.memberId);
    unique.push(entry);
  }

  const rooms: { memberIds: string[] }[] = [];
  let index = 0;
  while (index + roomSize <= unique.length) {
    rooms.push({
      memberIds: unique.slice(index, index + roomSize).map((entry) => entry.memberId),
    });
    index += roomSize;
  }

  return {
    rooms,
    stillWaiting: unique.slice(index),
  };
}

export function canFormRoom(
  waitingCount: number,
  roomSize: number,
): boolean {
  return waitingCount >= Math.max(1, roomSize);
}
