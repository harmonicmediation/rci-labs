import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireMentor } from "./authz";
import { writeAudit } from "./audit";
import {
  adjustTimer,
  endTimer,
  pauseTimer,
  remainingSeconds,
  resetTimer,
  resumeTimer,
  startTimer,
} from "../lib/domain/timer";
import type { TimerSnapshot } from "../lib/domain/types";

function snapshot(round: {
  status: TimerSnapshot["status"];
  durationSeconds: number;
  remainingSeconds: number;
  startedAt?: number;
  pausedAt?: number;
  endedAt?: number;
}): TimerSnapshot {
  return {
    status: round.status,
    durationSeconds: round.durationSeconds,
    remainingSeconds: round.remainingSeconds,
    startedAt: round.startedAt,
    pausedAt: round.pausedAt,
    endedAt: round.endedAt,
  };
}

export const get = query({
  args: { roundId: v.id("rounds") },
  handler: async (ctx, args) => {
    const round = await ctx.db.get(args.roundId);
    if (!round) return null;
    return {
      ...round,
      remainingSeconds: remainingSeconds(snapshot(round), Date.now()),
    };
  },
});

export const start = mutation({
  args: { roundId: v.id("rounds") },
  handler: async (ctx, args) => applyTimer(ctx, args.roundId, "start"),
});

export const pause = mutation({
  args: { roundId: v.id("rounds") },
  handler: async (ctx, args) => applyTimer(ctx, args.roundId, "pause"),
});

export const resume = mutation({
  args: { roundId: v.id("rounds") },
  handler: async (ctx, args) => applyTimer(ctx, args.roundId, "resume"),
});

export const end = mutation({
  args: { roundId: v.id("rounds") },
  handler: async (ctx, args) => applyTimer(ctx, args.roundId, "end"),
});

export const reset = mutation({
  args: {
    roundId: v.id("rounds"),
    confirm: v.boolean(),
    durationSeconds: v.number(),
  },
  handler: async (ctx, args) => {
    const { member } = await requireMentor(ctx);
    const round = await ctx.db.get(args.roundId);
    if (!round) throw new Error("Round not found");
    const now = Date.now();
    const next = resetTimer(
      snapshot(round),
      { confirm: args.confirm, durationSeconds: args.durationSeconds },
      now,
    );
    await ctx.db.patch(args.roundId, next);
    await ctx.db.insert("timerEvents", {
      roundId: args.roundId,
      action: "reset",
      actorMemberId: member._id,
      previousValue: remainingSeconds(snapshot(round), now),
      newValue: next.remainingSeconds,
      createdAt: now,
    });
    const room = await ctx.db.get(round.practiceRoomId);
    if (room) {
      const lab = await ctx.db.get(room.labSessionId);
      if (lab) {
        await writeAudit(ctx, {
          organizationId: lab.organizationId,
          actorType: "member",
          actorId: member._id,
          action: "timer.reset",
          entityType: "round",
          entityId: args.roundId,
          metadata: { durationSeconds: args.durationSeconds },
        });
      }
    }
    return next;
  },
});

export const adjust = mutation({
  args: { roundId: v.id("rounds"), deltaSeconds: v.number() },
  handler: async (ctx, args) => {
    const { member } = await requireMentor(ctx);
    const round = await ctx.db.get(args.roundId);
    if (!round) throw new Error("Round not found");
    const now = Date.now();
    const next = adjustTimer(snapshot(round), args.deltaSeconds, now);
    await ctx.db.patch(args.roundId, next);
    await ctx.db.insert("timerEvents", {
      roundId: args.roundId,
      action: args.deltaSeconds >= 0 ? "add" : "subtract",
      actorMemberId: member._id,
      previousValue: remainingSeconds(snapshot(round), now),
      newValue: next.remainingSeconds,
      createdAt: now,
    });
    return next;
  },
});

async function applyTimer(
  ctx: Parameters<typeof requireMentor>[0] & {
    db: {
      get: (id: any) => Promise<any>;
      patch: (id: any, value: any) => Promise<void>;
      insert: (table: any, value: any) => Promise<unknown>;
    };
  },
  roundId: any,
  action: "start" | "pause" | "resume" | "end",
) {
  const { member } = await requireMentor(ctx);
  const round = await ctx.db.get(roundId);
  if (!round) throw new Error("Round not found");
  const now = Date.now();
  const current = snapshot(round);
  const next =
    action === "start"
      ? startTimer(current, now)
      : action === "pause"
        ? pauseTimer(current, now)
        : action === "resume"
          ? resumeTimer(current, now)
          : endTimer(current, now);
  await ctx.db.patch(roundId, next);
  await ctx.db.insert("timerEvents", {
    roundId,
    action,
    actorMemberId: member._id,
    previousValue: remainingSeconds(current, now),
    newValue: next.remainingSeconds,
    createdAt: now,
  });
  if (action === "end") {
    await ctx.db.patch(round.practiceRoomId, {
      status: "completed",
      attentionState: "completed",
    });
  }
  if (action === "pause") {
    await ctx.db.patch(round.practiceRoomId, { status: "paused" });
  }
  if (action === "start" || action === "resume") {
    await ctx.db.patch(round.practiceRoomId, { status: "live" });
  }
  return next;
}
