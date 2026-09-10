import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { getDefaultOrganization } from "./authz";
import {
  insertMember,
  serializeMember,
} from "./members";
import { writeAudit } from "./audit";
import type { Id } from "./_generated/dataModel";

export const getServiceKey = internalQuery({
  args: { keyHash: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("serviceApiKeys")
      .withIndex("by_hash", (q) => q.eq("keyHash", args.keyHash))
      .unique();
  },
});

export const getIdempotent = internalQuery({
  args: { key: v.string(), method: v.string(), path: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("idempotencyKeys")
      .withIndex("by_key_method_path", (q) =>
        q.eq("key", args.key).eq("method", args.method).eq("path", args.path),
      )
      .unique();
  },
});

export const saveIdempotent = internalMutation({
  args: {
    key: v.string(),
    method: v.string(),
    path: v.string(),
    responseStatus: v.number(),
    responseBody: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("idempotencyKeys", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const hitRateLimit = internalMutation({
  args: { key: v.string(), limit: v.number(), windowMs: v.number() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("rateLimits")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
    if (!existing || now - existing.windowStart >= args.windowMs) {
      if (existing) {
        await ctx.db.patch(existing._id, { windowStart: now, count: 1 });
      } else {
        await ctx.db.insert("rateLimits", {
          key: args.key,
          windowStart: now,
          count: 1,
        });
      }
      return false;
    }
    const next = existing.count + 1;
    await ctx.db.patch(existing._id, { count: next });
    return next > args.limit;
  },
});

export const createMember = internalMutation({
  args: {
    email: v.string(),
    first_name: v.optional(v.string()),
    last_name: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    status: v.optional(v.string()),
    member_kind: v.optional(v.string()),
    actorId: v.string(),
  },
  handler: async (ctx, args) => {
    const org = await getDefaultOrganization(ctx);
    const memberId = await insertMember(ctx, {
      organizationId: org._id,
      email: args.email,
      firstName: args.first_name ?? args.firstName ?? "",
      lastName: args.last_name ?? args.lastName ?? "",
      status: (args.status as "active") ?? "active",
      memberKind: (args.member_kind as "consumer") ?? "consumer",
      roles: ["member"],
      actorType: "service",
      actorId: args.actorId,
    });
    return serializeMember(ctx, memberId);
  },
});

export const listMembers = internalQuery({
  args: {
    email: v.optional(v.string()),
    status: v.optional(v.string()),
    kind: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const org = await getDefaultOrganization(ctx);
    const members = await ctx.db
      .query("members")
      .withIndex("by_org_status", (q) => q.eq("organizationId", org._id))
      .collect();
    const filtered = members.filter((member) => {
      if (args.email && member.email !== args.email.toLowerCase()) return false;
      if (args.status && member.status !== args.status) return false;
      if (args.kind && member.memberKind !== args.kind) return false;
      return member.status !== "deleted";
    });
    return Promise.all(filtered.map((member) => serializeMember(ctx, member._id)));
  },
});

export const getMember = internalQuery({
  args: { memberId: v.string() },
  handler: async (ctx, args) => {
    return serializeMember(ctx, args.memberId as Id<"members">);
  },
});

export const updateMember = internalMutation({
  args: { memberId: v.string(), patch: v.any(), actorId: v.string() },
  handler: async (ctx, args) => {
    const memberId = args.memberId as Id<"members">;
    const existing = await ctx.db.get(memberId);
    if (!existing) throw new Error("Member not found");
    await ctx.db.patch(memberId, {
      firstName: args.patch.first_name ?? existing.firstName,
      lastName: args.patch.last_name ?? existing.lastName,
      displayName: args.patch.display_name ?? existing.displayName,
      email: args.patch.email?.toLowerCase() ?? existing.email,
      status: args.patch.status ?? existing.status,
      memberKind: args.patch.member_kind ?? existing.memberKind,
      updatedAt: Date.now(),
    });
    await writeAudit(ctx, {
      organizationId: existing.organizationId,
      actorType: "service",
      actorId: args.actorId,
      action: "member.update",
      entityType: "member",
      entityId: memberId,
    });
    return serializeMember(ctx, memberId);
  },
});

export const deactivateMember = internalMutation({
  args: { memberId: v.string(), actorId: v.string() },
  handler: async (ctx, args) => {
    const memberId = args.memberId as Id<"members">;
    const existing = await ctx.db.get(memberId);
    if (!existing) throw new Error("Member not found");
    await ctx.db.patch(memberId, { status: "inactive", updatedAt: Date.now() });
    await writeAudit(ctx, {
      organizationId: existing.organizationId,
      actorType: "service",
      actorId: args.actorId,
      action: "member.deactivate",
      entityType: "member",
      entityId: memberId,
    });
    return serializeMember(ctx, memberId);
  },
});

export const reactivateMember = internalMutation({
  args: { memberId: v.string(), actorId: v.string() },
  handler: async (ctx, args) => {
    const memberId = args.memberId as Id<"members">;
    const existing = await ctx.db.get(memberId);
    if (!existing) throw new Error("Member not found");
    await ctx.db.patch(memberId, { status: "active", updatedAt: Date.now() });
    return serializeMember(ctx, memberId);
  },
});

export const softDeleteMember = internalMutation({
  args: { memberId: v.string(), actorId: v.string() },
  handler: async (ctx, args) => {
    const memberId = args.memberId as Id<"members">;
    const existing = await ctx.db.get(memberId);
    if (!existing) throw new Error("Member not found");
    await ctx.db.patch(memberId, {
      status: "deleted",
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
    return serializeMember(ctx, memberId);
  },
});

export const setRoles = internalMutation({
  args: {
    memberId: v.string(),
    roles: v.array(v.string()),
    actorId: v.string(),
  },
  handler: async (ctx, args) => {
    const memberId = args.memberId as Id<"members">;
    const existing = await ctx.db.get(memberId);
    if (!existing) throw new Error("Member not found");
    const current = await ctx.db
      .query("memberRoles")
      .withIndex("by_member", (q) => q.eq("memberId", memberId))
      .collect();
    for (const row of current) await ctx.db.delete(row._id);
    for (const role of args.roles) {
      await ctx.db.insert("memberRoles", {
        memberId,
        role: role as "member",
      });
    }
    await writeAudit(ctx, {
      organizationId: existing.organizationId,
      actorType: "service",
      actorId: args.actorId,
      action: "member.roles.replace",
      entityType: "member",
      entityId: memberId,
      metadata: { roles: args.roles },
    });
    return serializeMember(ctx, memberId);
  },
});

export const listEntitlements = internalQuery({
  args: { memberId: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("entitlements")
      .withIndex("by_member", (q) =>
        q.eq("memberId", args.memberId as Id<"members">),
      )
      .collect();
    return rows.map((row) => row.entitlement);
  },
});

export const setEntitlement = internalMutation({
  args: {
    memberId: v.string(),
    entitlement: v.string(),
    granted: v.boolean(),
    actorId: v.string(),
  },
  handler: async (ctx, args) => {
    const memberId = args.memberId as Id<"members">;
    const existing = await ctx.db
      .query("entitlements")
      .withIndex("by_member_entitlement", (q) =>
        q.eq("memberId", memberId).eq("entitlement", args.entitlement),
      )
      .unique();
    if (args.granted && !existing) {
      await ctx.db.insert("entitlements", {
        memberId,
        entitlement: args.entitlement,
        grantedAt: Date.now(),
      });
    }
    if (!args.granted && existing) {
      await ctx.db.delete(existing._id);
    }
    const rows = await ctx.db
      .query("entitlements")
      .withIndex("by_member", (q) => q.eq("memberId", memberId))
      .collect();
    return rows.map((row) => row.entitlement);
  },
});
