import { internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getDefaultOrganization, requireMember, requireMentor } from "./authz";
import { writeAudit } from "./audit";
import { matchQueue } from "../lib/domain/matching";
import { assignPracticeRoles } from "../lib/domain/roles";
import { remainingSeconds } from "../lib/domain/timer";
import { getVideoProvider, sanitizeDailyRoomName } from "../lib/providers/video";
import { evaluateConsent } from "../lib/privacy/consent";
import type { ConsentFlagState } from "../lib/privacy/consent";
import type { TimerSnapshot } from "../lib/domain/types";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

function remainingSecondsForRound(
  round: {
    status: TimerSnapshot["status"];
    durationSeconds: number;
    remainingSeconds: number;
    startedAt?: number;
    pausedAt?: number;
    endedAt?: number;
  },
  now: number,
) {
  return remainingSeconds(round, now);
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireMentor(ctx);
    const org = await getDefaultOrganization(ctx);
    return ctx.db
      .query("labSessions")
      .withIndex("by_org_status", (q) => q.eq("organizationId", org._id))
      .collect();
  },
});

export const listOpen = query({
  args: {},
  handler: async (ctx) => {
    await requireMember(ctx);
    const org = await getDefaultOrganization(ctx);
    const labs = await ctx.db
      .query("labSessions")
      .withIndex("by_org_status", (q) => q.eq("organizationId", org._id))
      .collect();
    return labs.filter((lab) => lab.status === "open" || lab.status === "live");
  },
});

export const entry = query({
  args: { labId: v.id("labSessions") },
  handler: async (ctx, args) => {
    const member = await requireMember(ctx);
    const lab = await ctx.db.get(args.labId);
    if (!lab) return null;
    const policy = lab.consentPolicyId
      ? await ctx.db.get(lab.consentPolicyId)
      : await ctx.db
          .query("consentPolicies")
          .withIndex("by_active", (q) => q.eq("active", true))
          .first();
    const assignment = await ctx.db
      .query("lobbyQueue")
      .withIndex("by_session_member", (q) =>
        q.eq("labSessionId", args.labId).eq("memberId", member._id),
      )
      .unique();
    const waiting = await ctx.db
      .query("lobbyQueue")
      .withIndex("by_session_status", (q) =>
        q.eq("labSessionId", args.labId).eq("status", "waiting"),
      )
      .collect();
    return {
      lab,
      policy,
      assignment,
      waitingCount: waiting.length,
    };
  },
});

export const get = query({
  args: { labId: v.id("labSessions") },
  handler: async (ctx, args) => {
    await requireMember(ctx);
    return ctx.db.get(args.labId);
  },
});

export const state = query({
  args: { labId: v.id("labSessions") },
  handler: async (ctx, args) => {
    const { member: me } = await requireMentor(ctx);
    const lab = await ctx.db.get(args.labId);
    if (!lab) return null;

    const rooms = await ctx.db
      .query("practiceRooms")
      .withIndex("by_session", (q) => q.eq("labSessionId", args.labId))
      .collect();
    const mentors = await ctx.db
      .query("labSessionMentors")
      .withIndex("by_session", (q) => q.eq("labSessionId", args.labId))
      .collect();
    const waiting = await ctx.db
      .query("lobbyQueue")
      .withIndex("by_session_status", (q) =>
        q.eq("labSessionId", args.labId).eq("status", "waiting"),
      )
      .collect();
    const alerts = await ctx.db
      .query("roomAlerts")
      .withIndex("by_lab_status", (q) =>
        q.eq("labSessionId", args.labId).eq("status", "open"),
      )
      .collect();
    const chatRows = await ctx.db
      .query("moderatorMessages")
      .withIndex("by_session", (q) => q.eq("labSessionId", args.labId))
      .collect();

    const roomViews = await Promise.all(
      rooms.map(async (room) => {
        const participants = await ctx.db
          .query("roomParticipants")
          .withIndex("by_room", (q) => q.eq("practiceRoomId", room._id))
          .collect();
        const people = await Promise.all(
          participants.map(async (participant) => {
            const member = await ctx.db.get(participant.memberId);
            return {
              ...participant,
              displayName: member?.displayName ?? "Unknown",
            };
          }),
        );
        const roundDoc = room.currentRoundId
          ? await ctx.db.get(room.currentRoundId)
          : null;
        const round = roundDoc
          ? {
              ...roundDoc,
              remainingSecondsNow: remainingSecondsForRound(roundDoc, Date.now()),
            }
          : null;
        return { ...room, participants: people, round };
      }),
    );

    const mentorViews = await Promise.all(
      mentors.map(async (row) => {
        const member = await ctx.db.get(row.mentorId);
        return {
          ...row,
          displayName: member?.displayName ?? "Mentor",
        };
      }),
    );

    const waitingViews = await Promise.all(
      waiting.map(async (row) => {
        const member = await ctx.db.get(row.memberId);
        return { ...row, displayName: member?.displayName ?? "Member" };
      }),
    );

    const chat = await Promise.all(
      chatRows.map(async (row) => {
        const author = await ctx.db.get(row.authorMemberId);
        return {
          id: row._id,
          authorMemberId: row.authorMemberId,
          author: author?.displayName ?? "Mentor",
          createdAt: row.createdAt,
          body: row.body,
        };
      }),
    );

    return {
      lab,
      me: { id: me._id, displayName: me.displayName },
      rooms: roomViews,
      mentors: mentorViews,
      waiting: waitingViews,
      alerts,
      chat,
    };
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    desiredRoomSize: v.optional(v.number()),
    defaultRoundSeconds: v.optional(v.number()),
    recordingEnabled: v.optional(v.boolean()),
    transcriptionEnabled: v.optional(v.boolean()),
    rotateRoles: v.optional(v.boolean()),
    rubricId: v.optional(v.id("rubrics")),
  },
  handler: async (ctx, args) => {
    const { member } = await requireMentor(ctx);
    const org = await getDefaultOrganization(ctx);
    const labId = await ctx.db.insert("labSessions", {
      organizationId: org._id,
      title: args.title,
      status: "draft",
      desiredRoomSize: args.desiredRoomSize ?? 3,
      sessionKind: "lab",
      defaultRoundSeconds: args.defaultRoundSeconds ?? 900,
      recordingEnabled: args.recordingEnabled ?? false,
      transcriptionEnabled: args.transcriptionEnabled ?? true,
      createdBy: member._id,
      rotateRoles: args.rotateRoles ?? true,
      rubricId: args.rubricId,
      consentNoticeVersion: "v1-draft",
    });
    await writeAudit(ctx, {
      organizationId: org._id,
      actorType: "member",
      actorId: member._id,
      action: "lab.create",
      entityType: "lab",
      entityId: labId,
    });
    return labId;
  },
});

export const open = mutation({
  args: { labId: v.id("labSessions") },
  handler: async (ctx, args) => {
    const { member } = await requireMentor(ctx);
    const lab = await ctx.db.get(args.labId);
    if (!lab) throw new Error("Lab not found");
    if (lab.status !== "draft" && lab.status !== "closed") {
      throw new Error("Lab is already open");
    }

    const video = getVideoProvider();
    const roomName = sanitizeDailyRoomName(`rci-moderator-${args.labId}`);
    const moderatorRoom = await video.createRoom({
      name: roomName,
      recordingEnabled: false,
    });

    await ctx.db.patch(args.labId, {
      status: "open",
      startsAt: Date.now(),
      moderatorDailyRoomName: moderatorRoom.roomName,
      moderatorDailyRoomId: moderatorRoom.roomId,
    });
    await ctx.scheduler.runAfter(0, internal.videoActions.provisionModeratorRoom, {
      labId: args.labId,
      roomName,
    });
    await writeAudit(ctx, {
      organizationId: lab.organizationId,
      actorType: "member",
      actorId: member._id,
      action: "lab.open",
      entityType: "lab",
      entityId: args.labId,
    });
    return ctx.db.get(args.labId);
  },
});

export const startLivePractice = mutation({
  args: {
    title: v.optional(v.string()),
    desiredRoomSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { member } = await requireMentor(ctx);
    const org = await getDefaultOrganization(ctx);
    const roomSize = Math.max(2, Math.min(3, Math.floor(args.desiredRoomSize ?? 2)));
    const labId = await ctx.db.insert("labSessions", {
      organizationId: org._id,
      title: args.title ?? "Practice call",
      status: "draft",
      desiredRoomSize: roomSize,
      sessionKind: "lab",
      defaultRoundSeconds: 900,
      recordingEnabled: false,
      transcriptionEnabled: false,
      createdBy: member._id,
      rotateRoles: true,
      consentNoticeVersion: "v1-draft",
    });

    const video = getVideoProvider();
    const roomName = sanitizeDailyRoomName(`rci-moderator-${labId}`);
    const moderatorRoom = await video.createRoom({
      name: roomName,
      recordingEnabled: false,
    });

    await ctx.db.patch(labId, {
      status: "open",
      startsAt: Date.now(),
      moderatorDailyRoomName: moderatorRoom.roomName,
      moderatorDailyRoomId: moderatorRoom.roomId,
    });
    await ctx.scheduler.runAfter(0, internal.videoActions.provisionModeratorRoom, {
      labId,
      roomName,
    });
    await writeAudit(ctx, {
      organizationId: org._id,
      actorType: "member",
      actorId: member._id,
      action: "lab.start_live_practice",
      entityType: "lab",
      entityId: labId,
    });
    return { labId, desiredRoomSize: roomSize };
  },
});

export const close = mutation({
  args: { labId: v.id("labSessions") },
  handler: async (ctx, args) => {
    const { member } = await requireMentor(ctx);
    const lab = await ctx.db.get(args.labId);
    if (!lab) throw new Error("Lab not found");

    const rooms = await ctx.db
      .query("practiceRooms")
      .withIndex("by_session", (q) => q.eq("labSessionId", args.labId))
      .collect();
    for (const room of rooms) {
      if (room.status === "live" || room.status === "ready" || room.status === "paused") {
        await ctx.db.patch(room._id, {
          status: "completed",
          attentionState: "completed",
        });
      }
    }

    await ctx.db.patch(args.labId, { status: "closed", endsAt: Date.now() });
    await writeAudit(ctx, {
      organizationId: lab.organizationId,
      actorType: "member",
      actorId: member._id,
      action: "lab.close",
      entityType: "lab",
      entityId: args.labId,
    });
    return ctx.db.get(args.labId);
  },
});

export const joinLobby = mutation({
  args: {
    labId: v.id("labSessions"),
    flags: v.object({
      audioVideo: v.boolean(),
      recording: v.boolean(),
      transcription: v.boolean(),
      aiMonitoring: v.boolean(),
      mentorReporting: v.boolean(),
      retention: v.boolean(),
    }),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const member = await requireMember(ctx);
    const lab = await ctx.db.get(args.labId);
    if (!lab || (lab.status !== "open" && lab.status !== "live")) {
      throw new Error("Lab is not open");
    }

    const policy = lab.consentPolicyId
      ? await ctx.db.get(lab.consentPolicyId)
      : await ctx.db
          .query("consentPolicies")
          .withIndex("by_active", (q) => q.eq("active", true))
          .first();
    if (!policy) throw new Error("No consent policy is configured");

    const flags = args.flags as ConsentFlagState;
    const decision = evaluateConsent({
      policy: {
        version: policy.version,
        requiredFlags: policy.requiredFlags,
        declinedPolicy: policy.declinedPolicy,
      },
      flags,
      session: {
        recordingEnabled: lab.recordingEnabled,
        transcriptionEnabled: lab.transcriptionEnabled,
        aiMonitoringEnabled: lab.transcriptionEnabled,
        mentorReportingEnabled: true,
      },
    });

    await ctx.db.insert("consents", {
      memberId: member._id,
      labSessionId: args.labId,
      policyId: policy._id,
      policyVersion: policy.version,
      noticeVersion: policy.version,
      flags,
      recording: flags.recording,
      transcription: flags.transcription,
      aiEvaluation: flags.aiMonitoring,
      declined: decision.outcome !== "entered",
      outcome: decision.outcome,
      source: args.source ?? "lobby",
      acceptedAt: Date.now(),
    });

    if (decision.outcome === "deny_entry") {
      throw new Error(
        `Required consent was not granted: ${decision.missing.join(", ")}`,
      );
    }

    const existing = await ctx.db
      .query("lobbyQueue")
      .withIndex("by_session_member", (q) =>
        q.eq("labSessionId", args.labId).eq("memberId", member._id),
      )
      .unique();

    if (existing?.status === "assigned" && existing.assignedRoomId) {
      return { status: "assigned", roomId: existing.assignedRoomId };
    }
    if (existing?.status === "waiting") {
      return { status: "waiting", roomId: null };
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "waiting",
        joinedAt: Date.now(),
        assignedRoomId: undefined,
      });
    } else {
      await ctx.db.insert("lobbyQueue", {
        labSessionId: args.labId,
        memberId: member._id,
        joinedAt: Date.now(),
        status: "waiting",
      });
    }

    await maybeAutoMatch(ctx, args.labId);
    const refreshed = await ctx.db
      .query("lobbyQueue")
      .withIndex("by_session_member", (q) =>
        q.eq("labSessionId", args.labId).eq("memberId", member._id),
      )
      .unique();
    return {
      status: refreshed?.status ?? "waiting",
      roomId: refreshed?.assignedRoomId ?? null,
    };
  },
});

export const match = mutation({
  args: { labId: v.id("labSessions") },
  handler: async (ctx, args) => {
    await requireMentor(ctx);
    return maybeAutoMatch(ctx, args.labId);
  },
});

export const myAssignment = query({
  args: { labId: v.id("labSessions") },
  handler: async (ctx, args) => {
    const member = await requireMember(ctx);
    const queue = await ctx.db
      .query("lobbyQueue")
      .withIndex("by_session_member", (q) =>
        q.eq("labSessionId", args.labId).eq("memberId", member._id),
      )
      .unique();
    return queue;
  },
});

async function maybeAutoMatch(ctx: MutationCtx, labId: Id<"labSessions">) {
  const lab = await ctx.db.get(labId);
  if (!lab) throw new Error("Lab not found");

  const waiting = await ctx.db
    .query("lobbyQueue")
    .withIndex("by_session_status", (q) =>
      q.eq("labSessionId", labId).eq("status", "waiting"),
    )
    .collect();
  const activeAssignments = await ctx.db
    .query("roomParticipants")
    .withIndex("by_session_status", (q) => q.eq("labSessionId", labId))
    .collect();
  const alreadyAssigned = activeAssignments
    .filter((row) => row.joinStatus !== "left")
    .map((row) => row.memberId);

  const result = matchQueue({
    waiting: waiting.map((row) => ({
      memberId: row.memberId,
      joinedAt: row.joinedAt,
    })),
    roomSize: lab.desiredRoomSize,
    alreadyAssigned,
  });

  const existingRooms = await ctx.db
    .query("practiceRooms")
    .withIndex("by_session", (q) => q.eq("labSessionId", labId))
    .collect();
  let ordinal = existingRooms.reduce((max, room) => Math.max(max, room.ordinal), 0);
  const video = getVideoProvider();
  const createdRoomIds: Id<"practiceRooms">[] = [];

  for (const group of result.rooms) {
    ordinal += 1;
    const daily = await video.createRoom({
      name: sanitizeDailyRoomName(`rci-${labId}-r${ordinal}`),
      recordingEnabled: lab.recordingEnabled,
    });
    const roomId = await ctx.db.insert("practiceRooms", {
      labSessionId: labId,
      ordinal,
      dailyRoomName: daily.roomName,
      dailyRoomId: daily.roomId,
      dailyRoomUrl: daily.roomUrl,
      roomKind: "practice",
      status: "ready",
      rubricId: lab.rubricId,
      attentionState: "on_track",
      aiAvailable: false,
    });
    createdRoomIds.push(roomId);
    await ctx.scheduler.runAfter(0, internal.videoActions.provisionPracticeRoom, {
      roomId,
      roomName: daily.roomName,
    });

    const roles = assignPracticeRoles(group.memberIds);
    const coach = roles.find((row) => row.role === "coach");
    const client = roles.find((row) => row.role === "client");
    const observer = roles.find((row) => row.role === "observer");

    for (const assignment of roles) {
      await ctx.db.insert("roomParticipants", {
        practiceRoomId: roomId,
        labSessionId: labId,
        memberId: assignment.memberId as Id<"members">,
        role: assignment.role,
        actorType: "human",
        joinStatus: "assigned",
      });
      const queueRow = waiting.find((row) => row.memberId === assignment.memberId);
      if (queueRow) {
        await ctx.db.patch(queueRow._id, {
          status: "assigned",
          assignedRoomId: roomId,
        });
      }
      await ctx.db.insert("roomAssignmentEvents", {
        labSessionId: labId,
        memberId: assignment.memberId as Id<"members">,
        toRoomId: roomId,
        reason: "initial_match",
        actorType: "system",
        createdAt: Date.now(),
      });
    }

    const roundId = await ctx.db.insert("rounds", {
      practiceRoomId: roomId,
      sequenceNumber: 1,
      status: "pending",
      durationSeconds: lab.defaultRoundSeconds,
      remainingSeconds: lab.defaultRoundSeconds,
      coachMemberId: coach ? (coach.memberId as Id<"members">) : undefined,
      clientMemberId: client ? (client.memberId as Id<"members">) : undefined,
      observerMemberId: observer
        ? (observer.memberId as Id<"members">)
        : undefined,
    });
    await ctx.db.patch(roomId, { currentRoundId: roundId, status: "live" });
  }

  if (createdRoomIds.length > 0 && lab.status === "open") {
    await ctx.db.patch(labId, { status: "live" });
  }

  return { createdRoomIds, stillWaiting: result.stillWaiting.length };
}

export const patchModeratorDaily = internalMutation({
  args: {
    labId: v.id("labSessions"),
    roomName: v.string(),
    roomId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.labId, {
      moderatorDailyRoomName: args.roomName,
      moderatorDailyRoomId: args.roomId,
    });
  },
});

export const patchPracticeDaily = internalMutation({
  args: {
    roomId: v.id("practiceRooms"),
    roomName: v.string(),
    roomIdDaily: v.string(),
    roomUrl: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.roomId, {
      dailyRoomName: args.roomName,
      dailyRoomId: args.roomIdDaily,
      dailyRoomUrl: args.roomUrl,
    });
  },
});
