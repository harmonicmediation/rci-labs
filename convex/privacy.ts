import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { requireAdmin, requireMember } from "./authz";
import { writeAudit } from "./audit";
import { VENDOR_REGISTRY } from "../lib/privacy/vendor-registry";
import { DEFAULT_RETENTION } from "../lib/privacy/retention";
async function collectMemberDataMap(
  ctx: { db: any },
  memberId: Id<"members">,
) {
  const member = await ctx.db.get(memberId);
  if (!member) throw new Error("Member not found");
  const roles = await ctx.db
    .query("memberRoles")
    .withIndex("by_member", (q: any) => q.eq("memberId", memberId))
    .collect();
  const entitlements = await ctx.db
    .query("entitlements")
    .withIndex("by_member", (q: any) => q.eq("memberId", memberId))
    .collect();
  const consents = await ctx.db
    .query("consents")
    .withIndex("by_member", (q: any) => q.eq("memberId", memberId))
    .collect();
  const reports = await ctx.db
    .query("mentorReports")
    .withIndex("by_coach", (q: any) => q.eq("coachMemberId", memberId))
    .collect();
  const queue = (await ctx.db.query("lobbyQueue").collect()).filter(
    (row: { memberId: string }) => row.memberId === memberId,
  );
  const assignments = await ctx.db
    .query("roomAssignmentEvents")
    .withIndex("by_member", (q: any) => q.eq("memberId", memberId))
    .collect();
  return {
    member: {
      id: member._id,
      status: member.status,
      memberKind: member.memberKind,
    },
    locations: [
      { store: "convex.members", count: 1, dataClass: "account" },
      { store: "convex.memberRoles", count: roles.length, dataClass: "account" },
      { store: "convex.entitlements", count: entitlements.length, dataClass: "account" },
      { store: "convex.consents", count: consents.length, dataClass: "security_audit" },
      {
        store: "convex.mentorReports",
        count: reports.length,
        dataClass: "sensitive_coaching",
      },
      { store: "convex.lobbyQueue", count: queue.length, dataClass: "operational" },
      {
        store: "convex.roomAssignmentEvents",
        count: assignments.length,
        dataClass: "operational",
      },
      { store: "clerk", count: member.authUserId ? 1 : 0, dataClass: "account" },
    ],
  };
}

export const activeConsentPolicy = query({
  args: {},
  handler: async (ctx) => {
    const policies = await ctx.db
      .query("consentPolicies")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();
    return policies[0] ?? null;
  },
});

export const vendorRegistry = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return VENDOR_REGISTRY;
  },
});

export const viewMemberDataMap = mutation({
  args: { memberId: v.id("members") },
  handler: async (ctx, args) => {
    const { member: actor } = await requireAdmin(ctx);
    const member = await ctx.db.get(args.memberId);
    if (!member) throw new Error("Member not found");
    const dataMap = await collectMemberDataMap(ctx, args.memberId);
    await writeAudit(ctx, {
      organizationId: member.organizationId,
      actorType: "member",
      actorId: actor._id,
      action: "privacy.data_map.view",
      entityType: "member",
      entityId: args.memberId,
    });
    return dataMap;
  },
});

export const exportMember = mutation({
  args: { memberId: v.id("members") },
  handler: async (ctx, args) => {
    const { member: actor } = await requireAdmin(ctx);
    const member = await ctx.db.get(args.memberId);
    if (!member) throw new Error("Member not found");
    const dataMap = await collectMemberDataMap(ctx, args.memberId);

    const jobId = await ctx.db.insert("privacyJobs", {
      kind: "export",
      memberId: args.memberId,
      status: "complete",
      result: dataMap,
      requestedBy: actor._id,
      createdAt: Date.now(),
      completedAt: Date.now(),
    });
    await writeAudit(ctx, {
      organizationId: member.organizationId,
      actorType: "member",
      actorId: actor._id,
      action: "privacy.export",
      entityType: "member",
      entityId: args.memberId,
      metadata: { jobId },
    });
    return { jobId, dataMap };
  },
});

export const deleteMemberRequest = mutation({
  args: { memberId: v.id("members") },
  handler: async (ctx, args) => {
    const { member: actor } = await requireAdmin(ctx);
    const member = await ctx.db.get(args.memberId);
    if (!member) throw new Error("Member not found");

    const reports = await ctx.db
      .query("mentorReports")
      .withIndex("by_coach", (q) => q.eq("coachMemberId", args.memberId))
      .collect();
    for (const report of reports) {
      await ctx.db.patch(report._id, {
        aiSummary: "[deleted]",
        habitsToWorkOn: [],
        strengths: [],
        mentorComments: undefined,
      });
    }

    await ctx.db.patch(args.memberId, {
      status: "deleted",
      email: `deleted-${args.memberId}@invalid.local`,
      firstName: "Deleted",
      lastName: "Member",
      displayName: "Deleted member",
      authUserId: undefined,
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });

    const jobId = await ctx.db.insert("privacyJobs", {
      kind: "delete_request",
      memberId: args.memberId,
      status: "complete",
      requestedBy: actor._id,
      createdAt: Date.now(),
      completedAt: Date.now(),
    });
    await writeAudit(ctx, {
      organizationId: member.organizationId,
      actorType: "member",
      actorId: actor._id,
      action: "privacy.delete_request",
      entityType: "member",
      entityId: args.memberId,
      metadata: { jobId },
    });
    return { jobId };
  },
});

export const deleteSessionArtifact = mutation({
  args: {
    labSessionId: v.id("labSessions"),
    artifactType: v.string(),
    artifactId: v.string(),
  },
  handler: async (ctx, args) => {
    const { member: actor } = await requireAdmin(ctx);
    const lab = await ctx.db.get(args.labSessionId);
    if (!lab) throw new Error("Lab not found");

    if (args.artifactType === "mentor_reports") {
      const report = await ctx.db.get(args.artifactId as Id<"mentorReports">);
      if (report) {
        await ctx.db.patch(report._id, {
          aiSummary: "[deleted]",
          habitsToWorkOn: [],
          strengths: [],
        });
      }
    }
    if (args.artifactType === "transcript_segments") {
      const segment = await ctx.db.get(args.artifactId as Id<"transcriptSegments">);
      if (segment) await ctx.db.delete(segment._id);
    }

    const jobId = await ctx.db.insert("privacyJobs", {
      kind: "delete_artifact",
      labSessionId: args.labSessionId,
      artifactType: args.artifactType,
      artifactId: args.artifactId,
      status: "complete",
      requestedBy: actor._id,
      createdAt: Date.now(),
      completedAt: Date.now(),
    });
    await writeAudit(ctx, {
      organizationId: lab.organizationId,
      actorType: "member",
      actorId: actor._id,
      action: "privacy.delete_artifact",
      entityType: args.artifactType,
      entityId: args.artifactId,
      metadata: { jobId, labSessionId: args.labSessionId },
    });
    return { jobId };
  },
});

export const retentionDefaults = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const stored = await ctx.db.query("retentionPolicies").collect();
    return stored.length > 0 ? stored : DEFAULT_RETENTION;
  },
});

export const recordSensitiveAccess = mutation({
  args: {
    entityType: v.string(),
    entityId: v.string(),
    action: v.string(),
  },
  handler: async (ctx, args) => {
    const member = await requireMember(ctx);
    await writeAudit(ctx, {
      organizationId: member.organizationId,
      actorType: "member",
      actorId: member._id,
      action: args.action,
      entityType: args.entityType,
      entityId: args.entityId,
    });
  },
});

export const viewMemberDataMapInternal = internalMutation({
  args: { memberId: v.string(), actorId: v.string() },
  handler: async (ctx, args) => {
    const dataMap = await collectMemberDataMap(ctx, args.memberId as Id<"members">);
    const member = await ctx.db.get(args.memberId as Id<"members">);
    if (member) {
      await writeAudit(ctx, {
        organizationId: member.organizationId,
        actorType: "service",
        actorId: args.actorId,
        action: "privacy.data_map.view",
        entityType: "member",
        entityId: args.memberId,
      });
    }
    return dataMap;
  },
});

export const exportMemberInternal = internalMutation({
  args: { memberId: v.string(), actorId: v.string() },
  handler: async (ctx, args) => {
    const memberId = args.memberId as Id<"members">;
    const member = await ctx.db.get(memberId);
    if (!member) throw new Error("Member not found");
    const dataMap = await collectMemberDataMap(ctx, memberId);
    const jobId = await ctx.db.insert("privacyJobs", {
      kind: "export",
      memberId,
      status: "complete",
      result: dataMap,
      requestedBy: args.actorId,
      createdAt: Date.now(),
      completedAt: Date.now(),
    });
    await writeAudit(ctx, {
      organizationId: member.organizationId,
      actorType: "service",
      actorId: args.actorId,
      action: "privacy.export",
      entityType: "member",
      entityId: memberId,
      metadata: { jobId },
    });
    return { jobId, dataMap };
  },
});

export const deleteMemberInternal = internalMutation({
  args: { memberId: v.string(), actorId: v.string() },
  handler: async (ctx, args) => {
    const memberId = args.memberId as Id<"members">;
    const member = await ctx.db.get(memberId);
    if (!member) throw new Error("Member not found");
    await ctx.db.patch(memberId, {
      status: "deleted",
      email: `deleted-${memberId}@invalid.local`,
      firstName: "Deleted",
      lastName: "Member",
      displayName: "Deleted member",
      authUserId: undefined,
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
    const jobId = await ctx.db.insert("privacyJobs", {
      kind: "delete_request",
      memberId,
      status: "complete",
      requestedBy: args.actorId,
      createdAt: Date.now(),
      completedAt: Date.now(),
    });
    await writeAudit(ctx, {
      organizationId: member.organizationId,
      actorType: "service",
      actorId: args.actorId,
      action: "privacy.delete_request",
      entityType: "member",
      entityId: memberId,
      metadata: { jobId },
    });
    return { jobId };
  },
});

export const deleteArtifactInternal = internalMutation({
  args: {
    labSessionId: v.string(),
    artifactId: v.string(),
    artifactType: v.string(),
    actorId: v.string(),
  },
  handler: async (ctx, args) => {
    const lab = await ctx.db.get(args.labSessionId as Id<"labSessions">);
    if (!lab) throw new Error("Lab not found");
    if (args.artifactType === "transcript_segments") {
      const segment = await ctx.db.get(args.artifactId as Id<"transcriptSegments">);
      if (segment) await ctx.db.delete(segment._id);
    }
    const jobId = await ctx.db.insert("privacyJobs", {
      kind: "delete_artifact",
      labSessionId: args.labSessionId as Id<"labSessions">,
      artifactType: args.artifactType,
      artifactId: args.artifactId,
      status: "complete",
      requestedBy: args.actorId,
      createdAt: Date.now(),
      completedAt: Date.now(),
    });
    await writeAudit(ctx, {
      organizationId: lab.organizationId,
      actorType: "service",
      actorId: args.actorId,
      action: "privacy.delete_artifact",
      entityType: args.artifactType,
      entityId: args.artifactId,
      metadata: { jobId },
    });
    return { jobId };
  },
});
