import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./authz";

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rubrics = await ctx.db.query("rubrics").collect();
    return Promise.all(
      rubrics.map(async (rubric) => {
        const metrics = await ctx.db
          .query("rubricMetrics")
          .withIndex("by_rubric", (q) => q.eq("rubricId", rubric._id))
          .collect();
        return { ...rubric, id: rubric._id, metrics };
      }),
    );
  },
});

export const get = query({
  args: { rubricId: v.id("rubrics") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const rubric = await ctx.db.get(args.rubricId);
    if (!rubric) return null;
    const metrics = await ctx.db
      .query("rubricMetrics")
      .withIndex("by_rubric", (q) => q.eq("rubricId", rubric._id))
      .collect();
    return { ...rubric, id: rubric._id, metrics };
  },
});

export const createVersion = mutation({
  args: {
    name: v.string(),
    readinessThreshold: v.number(),
    metrics: v.array(
      v.object({
        code: v.string(),
        name: v.string(),
        description: v.string(),
        weight: v.number(),
        scoreMin: v.number(),
        scoreMax: v.number(),
        expectedScore: v.optional(v.number()),
        evaluatorInstructions: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("rubrics")
      .withIndex("by_name_version", (q) => q.eq("name", args.name))
      .collect();
    const version = existing.reduce((max, row) => Math.max(max, row.version), 0) + 1;
    for (const row of existing) {
      if (row.active) await ctx.db.patch(row._id, { active: false });
    }
    const rubricId = await ctx.db.insert("rubrics", {
      name: args.name,
      version,
      active: true,
      readinessThreshold: args.readinessThreshold,
      escalationThresholds: {},
    });
    for (const metric of args.metrics) {
      await ctx.db.insert("rubricMetrics", {
        rubricId,
        ...metric,
      });
    }
    return rubricId;
  },
});
