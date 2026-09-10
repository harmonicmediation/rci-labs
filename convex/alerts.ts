import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireMentor } from "./authz";

export const listOpen = query({
  args: { labId: v.id("labSessions") },
  handler: async (ctx, args) => {
    await requireMentor(ctx);
    return ctx.db
      .query("roomAlerts")
      .withIndex("by_lab_status", (q) =>
        q.eq("labSessionId", args.labId).eq("status", "open"),
      )
      .collect();
  },
});

export const claim = mutation({
  args: { alertId: v.id("roomAlerts") },
  handler: async (ctx, args) => {
    const { member } = await requireMentor(ctx);
    await ctx.db.patch(args.alertId, {
      status: "claimed",
      claimedBy: member._id,
    });
  },
});

export const resolve = mutation({
  args: { alertId: v.id("roomAlerts") },
  handler: async (ctx, args) => {
    await requireMentor(ctx);
    await ctx.db.patch(args.alertId, {
      status: "resolved",
      resolvedAt: Date.now(),
    });
  },
});

export const dismiss = mutation({
  args: { alertId: v.id("roomAlerts") },
  handler: async (ctx, args) => {
    await requireMentor(ctx);
    await ctx.db.patch(args.alertId, {
      status: "dismissed",
      resolvedAt: Date.now(),
    });
  },
});
