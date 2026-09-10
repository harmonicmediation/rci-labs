import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getDefaultOrganization, requireAdmin } from "./authz";
import { insertMember, serializeMember } from "./members";
import { writeAudit } from "./audit";

export const list = query({
  args: { query: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const profiles = await ctx.db.query("mentorProfiles").collect();
    const needle = args.query?.trim().toLowerCase();
    const rows = [];
    for (const profile of profiles) {
      const serialized = await serializeMember(ctx, profile.memberId);
      if (!serialized) continue;
      if (
        needle &&
        !serialized.email.includes(needle) &&
        !serialized.display_name.toLowerCase().includes(needle)
      ) {
        continue;
      }
      rows.push({
        ...serialized,
        mentor: {
          bio: profile.bio,
          active: profile.active,
          specialties: profile.specialties,
          capacity: profile.capacity,
        },
      });
    }
    return rows;
  },
});

export const create = mutation({
  args: {
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    bio: v.optional(v.string()),
    specialties: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { member: actor } = await requireAdmin(ctx);
    const org = await getDefaultOrganization(ctx);
    const memberId = await insertMember(ctx, {
      organizationId: org._id,
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      memberKind: "mentor",
      roles: ["member", "mentor"],
      actorType: "member",
      actorId: actor._id,
    });
    await ctx.db.insert("mentorProfiles", {
      memberId,
      bio: args.bio,
      active: true,
      specialties: args.specialties ?? [],
    });
    await ctx.db.insert("entitlements", {
      memberId,
      entitlement: "mentor_access",
      grantedAt: Date.now(),
      grantedBy: actor._id,
    });
    return serializeMember(ctx, memberId);
  },
});

export const update = mutation({
  args: {
    memberId: v.id("members"),
    bio: v.optional(v.string()),
    active: v.optional(v.boolean()),
    specialties: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { member: actor } = await requireAdmin(ctx);
    const profile = await ctx.db
      .query("mentorProfiles")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .unique();
    if (!profile) throw new Error("Mentor profile not found");
    await ctx.db.patch(profile._id, {
      bio: args.bio ?? profile.bio,
      active: args.active ?? profile.active,
      specialties: args.specialties ?? profile.specialties,
    });
    const member = await ctx.db.get(args.memberId);
    if (member) {
      await writeAudit(ctx, {
        organizationId: member.organizationId,
        actorType: "member",
        actorId: actor._id,
        action: "mentor.update",
        entityType: "mentor",
        entityId: args.memberId,
        metadata: args,
      });
    }
    return serializeMember(ctx, args.memberId);
  },
});

export const deactivate = mutation({
  args: { memberId: v.id("members") },
  handler: async (ctx, args) => {
    const { member: actor } = await requireAdmin(ctx);
    const profile = await ctx.db
      .query("mentorProfiles")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .unique();
    if (profile) {
      await ctx.db.patch(profile._id, { active: false });
    }
    const roles = await ctx.db
      .query("memberRoles")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .collect();
    for (const role of roles) {
      if (role.role === "mentor") await ctx.db.delete(role._id);
    }
    const member = await ctx.db.get(args.memberId);
    if (member) {
      await writeAudit(ctx, {
        organizationId: member.organizationId,
        actorType: "member",
        actorId: actor._id,
        action: "mentor.deactivate",
        entityType: "mentor",
        entityId: args.memberId,
      });
    }
    return serializeMember(ctx, args.memberId);
  },
});
