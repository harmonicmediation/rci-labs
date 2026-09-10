import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./authz";
import { writeAudit } from "./audit";

export const listForMember = query({
  args: { memberId: v.id("members") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const rows = await ctx.db
      .query("entitlements")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .collect();
    return rows.map((row) => row.entitlement);
  },
});

export const set = mutation({
  args: {
    memberId: v.id("members"),
    entitlement: v.string(),
    granted: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { member: actor } = await requireAdmin(ctx);
    const member = await ctx.db.get(args.memberId);
    if (!member) throw new Error("Member not found");

    const existing = await ctx.db
      .query("entitlements")
      .withIndex("by_member_entitlement", (q) =>
        q.eq("memberId", args.memberId).eq("entitlement", args.entitlement),
      )
      .unique();

    if (args.granted && !existing) {
      await ctx.db.insert("entitlements", {
        memberId: args.memberId,
        entitlement: args.entitlement,
        grantedAt: Date.now(),
        grantedBy: actor._id,
      });
    }
    if (!args.granted && existing) {
      await ctx.db.delete(existing._id);
    }

    await writeAudit(ctx, {
      organizationId: member.organizationId,
      actorType: "member",
      actorId: actor._id,
      action: args.granted ? "entitlement.grant" : "entitlement.revoke",
      entityType: "member",
      entityId: args.memberId,
      metadata: { entitlement: args.entitlement },
    });

    const rows = await ctx.db
      .query("entitlements")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .collect();
    return rows.map((row) => row.entitlement);
  },
});
