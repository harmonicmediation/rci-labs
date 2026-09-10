import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getMemberRoles, requireMember, requireMentor } from "./authz";
import { writeAudit } from "./audit";
import { getVideoProvider } from "../lib/providers/video";
import { shouldRaiseAlert } from "../lib/domain/alerts";

export const get = query({
  args: { roomId: v.id("practiceRooms") },
  handler: async (ctx, args) => {
    await requireMember(ctx);
    const room = await ctx.db.get(args.roomId);
    if (!room) return null;
    const participants = await ctx.db
      .query("roomParticipants")
      .withIndex("by_room", (q) => q.eq("practiceRoomId", args.roomId))
      .collect();
    const people = await Promise.all(
      participants.map(async (participant) => {
        const member = await ctx.db.get(participant.memberId);
        return { ...participant, displayName: member?.displayName ?? "Unknown" };
      }),
    );
    const round = room.currentRoundId ? await ctx.db.get(room.currentRoundId) : null;
    const alerts = await ctx.db
      .query("roomAlerts")
      .withIndex("by_room_status", (q) => q.eq("practiceRoomId", args.roomId))
      .collect();
    return { ...room, participants: people, round, alerts };
  },
});

export const prepareJoin = internalQuery({
  args: {
    roomId: v.id("practiceRooms"),
    authUserId: v.string(),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let member = await ctx.db
      .query("members")
      .withIndex("by_auth_user", (q) => q.eq("authUserId", args.authUserId))
      .unique();
    if (!member && args.email) {
      const email = args.email;
      member = await ctx.db
        .query("members")
        .withIndex("by_email", (q) => q.eq("email", email))
        .unique();
    }
    if (!member || member.status !== "active") {
      throw new Error("No RCI member record is linked to this account");
    }

    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");
    const lab = await ctx.db.get(room.labSessionId);
    if (!lab) throw new Error("Lab not found");

    const participants = await ctx.db
      .query("roomParticipants")
      .withIndex("by_room", (q) => q.eq("practiceRoomId", args.roomId))
      .collect();
    const participant = participants.find((row) => row.memberId === member._id);
    const roles = await getMemberRoles(ctx, member._id);
    const isMentor = roles.some(
      (role) => role === "mentor" || role === "admin" || role === "super_admin",
    );
    if (!participant && !isMentor) {
      throw new Error("Not assigned to this room");
    }

    return {
      memberId: member._id,
      displayName: member.displayName,
      isMentor,
      participantId: participant?._id,
      dailyRoomName: room.dailyRoomName,
      dailyRoomId: room.dailyRoomId,
      dailyRoomUrl: room.dailyRoomUrl,
      recordingEnabled: lab.recordingEnabled,
    };
  },
});

export const markJoined = internalMutation({
  args: {
    roomId: v.id("practiceRooms"),
    memberId: v.id("members"),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("roomParticipants")
      .withIndex("by_room", (q) => q.eq("practiceRoomId", args.roomId))
      .collect();
    const mine = rows.find((row) => row.memberId === args.memberId);
    if (mine && mine.joinStatus !== "joined") {
      await ctx.db.patch(mine._id, {
        joinStatus: "joined",
        joinedAt: Date.now(),
        leftAt: undefined,
      });
    }
  },
});

export const joinToken = mutation({
  args: { roomId: v.id("practiceRooms") },
  handler: async (ctx, args) => {
    const member = await requireMember(ctx);
    const room = await ctx.db.get(args.roomId);
    if (!room || !room.dailyRoomName) throw new Error("Room is not ready");

    const participant = await ctx.db
      .query("roomParticipants")
      .withIndex("by_room", (q) => q.eq("practiceRoomId", args.roomId))
      .collect()
      .then((rows) => rows.find((row) => row.memberId === member._id));

    const roles = await getMemberRoles(ctx, member._id);
    const isMentor = roles.some((role) =>
      role === "mentor" || role === "admin" || role === "super_admin",
    );
    if (!participant && !isMentor) {
      throw new Error("Not assigned to this room");
    }

    const video = getVideoProvider();
    const token = await video.createToken({
      roomName: room.dailyRoomName,
      userId: member._id,
      userName: member.displayName,
      isOwner: isMentor,
    });
    if (token.provider !== "daily") {
      throw new Error("Live video is not ready. Refresh and try again.");
    }

    if (participant) {
      await ctx.db.patch(participant._id, {
        joinStatus: "joined",
        joinedAt: Date.now(),
      });
    }

    return {
      token: token.token,
      roomUrl: token.roomUrl,
      expiresAt: token.expiresAt,
      provider: token.provider,
    };
  },
});

export const claim = mutation({
  args: { roomId: v.id("practiceRooms") },
  handler: async (ctx, args) => {
    const { member } = await requireMentor(ctx);
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");
    await ctx.db.patch(args.roomId, { assignedMentorId: member._id });
    const openAlerts = await ctx.db
      .query("roomAlerts")
      .withIndex("by_room_status", (q) =>
        q.eq("practiceRoomId", args.roomId).eq("status", "open"),
      )
      .collect();
    for (const alert of openAlerts) {
      await ctx.db.patch(alert._id, { status: "claimed", claimedBy: member._id });
    }
    return args.roomId;
  },
});

export const release = mutation({
  args: { roomId: v.id("practiceRooms") },
  handler: async (ctx, args) => {
    await requireMentor(ctx);
    await ctx.db.patch(args.roomId, { assignedMentorId: undefined });
    return args.roomId;
  },
});

export const enter = mutation({
  args: { roomId: v.id("practiceRooms"), labId: v.id("labSessions") },
  handler: async (ctx, args) => {
    const { member } = await requireMentor(ctx);
    const existing = await ctx.db
      .query("labSessionMentors")
      .withIndex("by_session_mentor", (q) =>
        q.eq("labSessionId", args.labId).eq("mentorId", member._id),
      )
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "joined",
        currentPracticeRoomId: args.roomId,
        joinedAt: existing.joinedAt ?? Date.now(),
      });
    } else {
      await ctx.db.insert("labSessionMentors", {
        labSessionId: args.labId,
        mentorId: member._id,
        status: "joined",
        joinedAt: Date.now(),
        currentPracticeRoomId: args.roomId,
      });
    }

    const myRows = await ctx.db
      .query("roomParticipants")
      .withIndex("by_member_session", (q) =>
        q.eq("memberId", member._id).eq("labSessionId", args.labId),
      )
      .collect();
    for (const row of myRows) {
      if (row.role === "mentor" && row.practiceRoomId !== args.roomId) {
        await ctx.db.patch(row._id, {
          joinStatus: "left",
          leftAt: Date.now(),
        });
      }
    }

    const already = myRows.find(
      (row) => row.practiceRoomId === args.roomId && row.role === "mentor",
    );
    if (already) {
      await ctx.db.patch(already._id, {
        joinStatus: "joined",
        joinedAt: Date.now(),
        leftAt: undefined,
      });
    } else {
      await ctx.db.insert("roomParticipants", {
        practiceRoomId: args.roomId,
        labSessionId: args.labId,
        memberId: member._id,
        role: "mentor",
        actorType: "human",
        joinStatus: "joined",
        joinedAt: Date.now(),
      });
    }
    return args.roomId;
  },
});

export const leaveToModerator = mutation({
  args: { labId: v.id("labSessions") },
  handler: async (ctx, args) => {
    const { member } = await requireMentor(ctx);
    const existing = await ctx.db
      .query("labSessionMentors")
      .withIndex("by_session_mentor", (q) =>
        q.eq("labSessionId", args.labId).eq("mentorId", member._id),
      )
      .unique();
    if (existing?.currentPracticeRoomId) {
      const rows = await ctx.db
        .query("roomParticipants")
        .withIndex("by_member_session", (q) =>
          q.eq("memberId", member._id).eq("labSessionId", args.labId),
        )
        .collect();
      for (const row of rows) {
        if (row.role === "mentor" && row.joinStatus !== "left") {
          await ctx.db.patch(row._id, {
            joinStatus: "left",
            leftAt: Date.now(),
          });
        }
      }
      await ctx.db.patch(existing._id, { currentPracticeRoomId: undefined });
    }
    return args.labId;
  },
});

export const moveParticipant = mutation({
  args: {
    roomId: v.id("practiceRooms"),
    memberId: v.id("members"),
    targetRoomId: v.id("practiceRooms"),
  },
  handler: async (ctx, args) => {
    const { member: actor } = await requireMentor(ctx);
    const source = await ctx.db.get(args.roomId);
    const target = await ctx.db.get(args.targetRoomId);
    if (!source || !target) throw new Error("Room not found");
    if (source.labSessionId !== target.labSessionId) {
      throw new Error("Rooms must belong to the same lab");
    }

    const participants = await ctx.db
      .query("roomParticipants")
      .withIndex("by_room", (q) => q.eq("practiceRoomId", args.roomId))
      .collect();
    const row = participants.find((participant) => participant.memberId === args.memberId);
    if (!row) throw new Error("Participant not in source room");

    await ctx.db.patch(row._id, {
      practiceRoomId: args.targetRoomId,
      joinStatus: "assigned",
    });

    const queue = await ctx.db
      .query("lobbyQueue")
      .withIndex("by_session_member", (q) =>
        q.eq("labSessionId", source.labSessionId).eq("memberId", args.memberId),
      )
      .unique();
    if (queue) {
      await ctx.db.patch(queue._id, { assignedRoomId: args.targetRoomId });
    }

    await ctx.db.insert("roomAssignmentEvents", {
      labSessionId: source.labSessionId,
      memberId: args.memberId,
      fromRoomId: args.roomId,
      toRoomId: args.targetRoomId,
      reason: "manual_move",
      actorType: "moderator",
      actorId: actor._id,
      createdAt: Date.now(),
    });

    await writeAudit(ctx, {
      organizationId: (await ctx.db.get(source.labSessionId))!.organizationId,
      actorType: "member",
      actorId: actor._id,
      action: "room.move_participant",
      entityType: "practice_room",
      entityId: args.targetRoomId,
      metadata: { memberId: args.memberId, from: args.roomId },
    });

    return args.targetRoomId;
  },
});

export const message = mutation({
  args: {
    roomId: v.id("practiceRooms"),
    body: v.string(),
    audience: v.optional(v.union(v.literal("all"), v.literal("targeted"))),
    audienceMemberIds: v.optional(v.array(v.id("members"))),
    persist: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { member } = await requireMentor(ctx);
    return ctx.db.insert("roomMessages", {
      practiceRoomId: args.roomId,
      authorMemberId: member._id,
      audience: args.audience ?? "all",
      audienceMemberIds: args.audienceMemberIds,
      body: args.body,
      persist: args.persist ?? true,
      createdAt: Date.now(),
    });
  },
});

export const requestHelp = mutation({
  args: { roomId: v.id("practiceRooms") },
  handler: async (ctx, args) => {
    const member = await requireMember(ctx);
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");

    const openAlerts = await ctx.db
      .query("roomAlerts")
      .withIndex("by_room_status", (q) => q.eq("practiceRoomId", args.roomId))
      .collect();
    const decision = shouldRaiseAlert(
      {
        category: "help_requested",
        severity: "urgent",
        confidence: 1,
        source: "participant",
      },
      openAlerts.map((alert) => ({
        category: alert.category,
        createdAt: alert.createdAt,
        status: alert.status,
      })),
      { now: Date.now(), cooldownMs: 30_000, minConfidence: 0 },
    );

    if (!decision.emit) return null;

    await ctx.db.patch(args.roomId, {
      attentionState: "mentor_requested",
      attentionReasonSummary: `${member.displayName} requested mentor help`,
    });

    return ctx.db.insert("roomAlerts", {
      practiceRoomId: args.roomId,
      labSessionId: room.labSessionId,
      roundId: room.currentRoundId,
      source: "participant",
      severity: "urgent",
      category: "help_requested",
      summary: `${member.displayName} requested mentor help`,
      status: "open",
      createdAt: Date.now(),
    });
  },
});

export const leave = mutation({
  args: { roomId: v.id("practiceRooms") },
  handler: async (ctx, args) => {
    const member = await requireMember(ctx);
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");
    const rows = await ctx.db
      .query("roomParticipants")
      .withIndex("by_room", (q) => q.eq("practiceRoomId", args.roomId))
      .collect();
    const mine = rows.find((row) => row.memberId === member._id);
    if (mine && mine.joinStatus !== "left") {
      await ctx.db.patch(mine._id, {
        joinStatus: "left",
        leftAt: Date.now(),
      });
    }
    const queue = await ctx.db
      .query("lobbyQueue")
      .withIndex("by_session_member", (q) =>
        q.eq("labSessionId", room.labSessionId).eq("memberId", member._id),
      )
      .unique();
    if (queue) {
      await ctx.db.patch(queue._id, { status: "left" });
    }
    return room.labSessionId;
  },
});

export const setNote = mutation({
  args: { roomId: v.id("practiceRooms"), note: v.string() },
  handler: async (ctx, args) => {
    await requireMentor(ctx);
    await ctx.db.patch(args.roomId, { sharedNote: args.note });
  },
});

export const sendModeratorMessage = mutation({
  args: { labId: v.id("labSessions"), body: v.string() },
  handler: async (ctx, args) => {
    const { member } = await requireMentor(ctx);
    return ctx.db.insert("moderatorMessages", {
      labSessionId: args.labId,
      authorMemberId: member._id,
      body: args.body,
      createdAt: Date.now(),
    });
  },
});
