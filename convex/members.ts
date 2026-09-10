import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import {
  getDefaultOrganization,
  getMemberByIdentity,
  identityEmail,
  requireAdmin,
  requireIdentity,
  requireMember,
  resolveAccountEmail,
} from "./authz";
import { writeAudit } from "./audit";
import type { AppRole, MemberKind, MemberStatus } from "../lib/domain/types";

const memberKind = v.union(
  v.literal("student"),
  v.literal("consumer"),
  v.literal("mentor"),
  v.literal("admin"),
  v.literal("multi"),
);

const memberStatus = v.union(
  v.literal("active"),
  v.literal("inactive"),
  v.literal("suspended"),
  v.literal("deleted"),
);

const appRole = v.union(
  v.literal("member"),
  v.literal("mentor"),
  v.literal("admin"),
  v.literal("super_admin"),
);

export async function serializeMember(
  ctx: QueryCtx | MutationCtx,
  memberId: Id<"members">,
) {
  const member = await ctx.db.get(memberId);
  if (!member) return null;
  const roles = await ctx.db
    .query("memberRoles")
    .withIndex("by_member", (q) => q.eq("memberId", memberId))
    .collect();
  const entitlements = await ctx.db
    .query("entitlements")
    .withIndex("by_member", (q) => q.eq("memberId", memberId))
    .collect();
  const identities = await ctx.db
    .query("externalIdentities")
    .withIndex("by_member", (q) => q.eq("memberId", memberId))
    .collect();
  return {
    id: member._id,
    email: member.email,
    first_name: member.firstName,
    last_name: member.lastName,
    display_name: member.displayName,
    status: member.status,
    member_kind: member.memberKind,
    roles: roles.map((row) => row.role),
    entitlements: entitlements.map((row) => row.entitlement),
    external_identities: identities.map((row) => ({
      provider: row.provider,
      external_id: row.externalId,
    })),
    created_at: new Date(member._creationTime).toISOString(),
    updated_at: new Date(member.updatedAt).toISOString(),
  };
}

export async function insertMember(
  ctx: MutationCtx,
  input: {
    organizationId: Id<"organizations">;
    email: string;
    firstName: string;
    lastName: string;
    displayName?: string;
    status?: MemberStatus;
    memberKind?: MemberKind;
    roles?: AppRole[];
    actorType: "member" | "service" | "system";
    actorId?: string;
  },
) {
  const email = input.email.trim().toLowerCase();
  const existing = await ctx.db
    .query("members")
    .withIndex("by_email", (q) => q.eq("email", email))
    .unique();
  if (existing && existing.status !== "deleted") {
    throw new Error("A member with that email already exists");
  }

  const now = Date.now();
  const memberId = await ctx.db.insert("members", {
    organizationId: input.organizationId,
    email,
    firstName: input.firstName,
    lastName: input.lastName,
    displayName: input.displayName ?? `${input.firstName} ${input.lastName}`.trim(),
    status: input.status ?? "active",
    memberKind: input.memberKind ?? "student",
    updatedAt: now,
  });

  const roles = input.roles ?? ["member"];
  for (const role of roles) {
    await ctx.db.insert("memberRoles", { memberId, role });
  }

  await writeAudit(ctx, {
    organizationId: input.organizationId,
    actorType: input.actorType,
    actorId: input.actorId,
    action: "member.create",
    entityType: "member",
    entityId: memberId,
    metadata: { email, roles },
  });

  return memberId;
}

export const me = query({
  args: {},
  handler: async (ctx) => {
    try {
      const member = await requireMember(ctx);
      return serializeMember(ctx, member._id);
    } catch {
      return null;
    }
  },
});

export const ensureLinked = mutation({
  args: {},
  handler: async (ctx) => {
    await requireIdentity(ctx);
    const member = await getMemberByIdentity(ctx);
    if (!member || member.status === "deleted") return null;
    const identity = await requireIdentity(ctx);
    if (!member.authUserId) {
      await ctx.db.patch(member._id, {
        authUserId: identity.subject,
        updatedAt: Date.now(),
      });
    }
    return serializeMember(ctx, member._id);
  },
});

export const ensureSelf = mutation({
  args: {
    email: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const existing = await getMemberByIdentity(ctx);
    if (existing && existing.status !== "deleted") {
      if (!existing.authUserId) {
        await ctx.db.patch(existing._id, {
          authUserId: identity.subject,
          updatedAt: Date.now(),
        });
      }
      return serializeMember(ctx, existing._id);
    }

    let email = resolveAccountEmail(identity, args.email);
    const byEmail = await ctx.db
      .query("members")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (byEmail && byEmail.status !== "deleted") {
      if (identityEmail(identity) === email && !byEmail.authUserId) {
        await ctx.db.patch(byEmail._id, {
          authUserId: identity.subject,
          updatedAt: Date.now(),
        });
        return serializeMember(ctx, byEmail._id);
      }
      email = resolveAccountEmail(identity);
    }

    const org = await getDefaultOrganization(ctx);
    const nameParts = (identity.name ?? "RCI Student").split(" ").filter(Boolean);
    const firstName =
      args.firstName?.trim() ||
      (typeof identity.givenName === "string" ? identity.givenName : undefined) ||
      nameParts[0] ||
      "RCI";
    const lastName =
      args.lastName?.trim() ||
      (typeof identity.familyName === "string" ? identity.familyName : undefined) ||
      nameParts.slice(1).join(" ") ||
      "Student";

    const memberId = await insertMember(ctx, {
      organizationId: org._id,
      email,
      firstName,
      lastName,
      memberKind: "student",
      roles: ["member"],
      actorType: "system",
    });
    await ctx.db.patch(memberId, {
      authUserId: identity.subject,
      updatedAt: Date.now(),
    });
    await ctx.db.insert("entitlements", {
      memberId,
      entitlement: "rci_student_labs",
      grantedAt: Date.now(),
    });
    return serializeMember(ctx, memberId);
  },
});

export const list = query({
  args: {
    status: v.optional(memberStatus),
    kind: v.optional(memberKind),
    query: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const org = await getDefaultOrganization(ctx);
    const members = await ctx.db
      .query("members")
      .withIndex("by_org_status", (q) =>
        args.status
          ? q.eq("organizationId", org._id).eq("status", args.status)
          : q.eq("organizationId", org._id),
      )
      .collect();

    const needle = args.query?.trim().toLowerCase();
    const filtered = members.filter((member) => {
      if (args.kind && member.memberKind !== args.kind) return false;
      if (!needle) return true;
      return (
        member.email.includes(needle) ||
        member.displayName.toLowerCase().includes(needle) ||
        member.firstName.toLowerCase().includes(needle) ||
        member.lastName.toLowerCase().includes(needle)
      );
    });

    return Promise.all(filtered.map((member) => serializeMember(ctx, member._id)));
  },
});

export const get = query({
  args: { memberId: v.id("members") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return serializeMember(ctx, args.memberId);
  },
});

export const create = mutation({
  args: {
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    displayName: v.optional(v.string()),
    status: v.optional(memberStatus),
    memberKind: v.optional(memberKind),
    roles: v.optional(v.array(appRole)),
  },
  handler: async (ctx, args) => {
    const { member } = await requireAdmin(ctx);
    const org = await getDefaultOrganization(ctx);
    const memberId = await insertMember(ctx, {
      organizationId: org._id,
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      displayName: args.displayName,
      status: args.status,
      memberKind: args.memberKind,
      roles: args.roles,
      actorType: "member",
      actorId: member._id,
    });
    return serializeMember(ctx, memberId);
  },
});

export const update = mutation({
  args: {
    memberId: v.id("members"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    displayName: v.optional(v.string()),
    email: v.optional(v.string()),
    status: v.optional(memberStatus),
    memberKind: v.optional(memberKind),
  },
  handler: async (ctx, args) => {
    const { member: actor } = await requireAdmin(ctx);
    const existing = await ctx.db.get(args.memberId);
    if (!existing) throw new Error("Member not found");

    await ctx.db.patch(args.memberId, {
      firstName: args.firstName ?? existing.firstName,
      lastName: args.lastName ?? existing.lastName,
      displayName: args.displayName ?? existing.displayName,
      email: args.email?.trim().toLowerCase() ?? existing.email,
      status: args.status ?? existing.status,
      memberKind: args.memberKind ?? existing.memberKind,
      updatedAt: Date.now(),
    });

    await writeAudit(ctx, {
      organizationId: existing.organizationId,
      actorType: "member",
      actorId: actor._id,
      action: "member.update",
      entityType: "member",
      entityId: args.memberId,
      metadata: args,
    });

    return serializeMember(ctx, args.memberId);
  },
});

export const setRoles = mutation({
  args: {
    memberId: v.id("members"),
    roles: v.array(appRole),
  },
  handler: async (ctx, args) => {
    const { member: actor } = await requireAdmin(ctx);
    const existing = await ctx.db.get(args.memberId);
    if (!existing) throw new Error("Member not found");

    const current = await ctx.db
      .query("memberRoles")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .collect();
    for (const row of current) {
      await ctx.db.delete(row._id);
    }
    for (const role of args.roles) {
      await ctx.db.insert("memberRoles", { memberId: args.memberId, role });
    }

    await writeAudit(ctx, {
      organizationId: existing.organizationId,
      actorType: "member",
      actorId: actor._id,
      action: "member.roles.replace",
      entityType: "member",
      entityId: args.memberId,
      metadata: { roles: args.roles },
    });

    return serializeMember(ctx, args.memberId);
  },
});

export const deactivate = mutation({
  args: { memberId: v.id("members") },
  handler: async (ctx, args) => {
    const { member: actor } = await requireAdmin(ctx);
    const existing = await ctx.db.get(args.memberId);
    if (!existing) throw new Error("Member not found");
    await ctx.db.patch(args.memberId, { status: "inactive", updatedAt: Date.now() });
    await writeAudit(ctx, {
      organizationId: existing.organizationId,
      actorType: "member",
      actorId: actor._id,
      action: "member.deactivate",
      entityType: "member",
      entityId: args.memberId,
    });
    return serializeMember(ctx, args.memberId);
  },
});

export const reactivate = mutation({
  args: { memberId: v.id("members") },
  handler: async (ctx, args) => {
    const { member: actor } = await requireAdmin(ctx);
    const existing = await ctx.db.get(args.memberId);
    if (!existing) throw new Error("Member not found");
    await ctx.db.patch(args.memberId, {
      status: "active",
      deletedAt: undefined,
      updatedAt: Date.now(),
    });
    await writeAudit(ctx, {
      organizationId: existing.organizationId,
      actorType: "member",
      actorId: actor._id,
      action: "member.reactivate",
      entityType: "member",
      entityId: args.memberId,
    });
    return serializeMember(ctx, args.memberId);
  },
});

export const softDelete = mutation({
  args: { memberId: v.id("members") },
  handler: async (ctx, args) => {
    const { member: actor } = await requireAdmin(ctx);
    const existing = await ctx.db.get(args.memberId);
    if (!existing) throw new Error("Member not found");
    await ctx.db.patch(args.memberId, {
      status: "deleted",
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
    await writeAudit(ctx, {
      organizationId: existing.organizationId,
      actorType: "member",
      actorId: actor._id,
      action: "member.soft_delete",
      entityType: "member",
      entityId: args.memberId,
    });
    return serializeMember(ctx, args.memberId);
  },
});
