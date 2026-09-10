import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

export async function writeAudit(
  ctx: MutationCtx,
  input: {
    organizationId: Id<"organizations">;
    actorType: "member" | "service" | "system";
    actorId?: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: unknown;
  },
) {
  await ctx.db.insert("auditEvents", {
    organizationId: input.organizationId,
    actorType: input.actorType,
    actorId: input.actorId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: input.metadata,
    createdAt: Date.now(),
  });
}

export const record = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    actorType: v.union(
      v.literal("member"),
      v.literal("service"),
      v.literal("system"),
    ),
    actorId: v.optional(v.string()),
    action: v.string(),
    entityType: v.string(),
    entityId: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await writeAudit(ctx, args);
  },
});
