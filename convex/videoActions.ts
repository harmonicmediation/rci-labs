import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  getVideoProvider,
  needsDailyProvision,
  requireDailyProvider,
  sanitizeDailyRoomName,
} from "../lib/providers/video";
import { logEvent } from "../lib/privacy/log";

export const provisionModeratorRoom = internalAction({
  args: { labId: v.id("labSessions"), roomName: v.string() },
  handler: async (ctx, args) => {
    try {
      const video = getVideoProvider({ network: true });
      const room = await video.createRoom({
        name: sanitizeDailyRoomName(args.roomName),
        recordingEnabled: false,
      });
      await ctx.runMutation(internal.labs.patchModeratorDaily, {
        labId: args.labId,
        roomName: room.roomName,
        roomId: room.roomId,
      });
    } catch (error) {
      logEvent({
        level: "error",
        message: "daily.provision_moderator_failed",
        labId: args.labId,
      });
      throw error;
    }
  },
});

export const provisionPracticeRoom = internalAction({
  args: { roomId: v.id("practiceRooms"), roomName: v.string() },
  handler: async (ctx, args) => {
    try {
      const video = getVideoProvider({ network: true });
      const room = await video.createRoom({
        name: sanitizeDailyRoomName(args.roomName),
      });
      await ctx.runMutation(internal.labs.patchPracticeDaily, {
        roomId: args.roomId,
        roomName: room.roomName,
        roomIdDaily: room.roomId,
        roomUrl: room.roomUrl,
      });
    } catch (error) {
      logEvent({
        level: "error",
        message: "daily.provision_practice_failed",
        roomId: args.roomId,
      });
      throw error;
    }
  },
});

export const issueJoinToken = action({
  args: { roomId: v.id("practiceRooms") },
  handler: async (
    ctx,
    args,
  ): Promise<{
    token: string;
    roomUrl: string;
    expiresAt: number;
    provider: "daily" | "stub";
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Sign in to join video");
    }

    const prepared: {
      memberId: Id<"members">;
      displayName: string;
      isMentor: boolean;
      participantId?: Id<"roomParticipants">;
      dailyRoomName?: string;
      dailyRoomId?: string;
      dailyRoomUrl?: string;
      recordingEnabled: boolean;
    } = await ctx.runQuery(internal.rooms.prepareJoin, {
      roomId: args.roomId,
      authUserId: identity.subject,
      email:
        typeof identity.email === "string" ? identity.email : undefined,
    });

    const video = requireDailyProvider();
    let roomName = sanitizeDailyRoomName(
      prepared.dailyRoomName ?? `rci-${args.roomId}`,
    );
    let roomUrl: string | undefined = prepared.dailyRoomUrl;

    if (
      needsDailyProvision({
        dailyRoomName: prepared.dailyRoomName,
        dailyRoomId: prepared.dailyRoomId,
        dailyRoomUrl: prepared.dailyRoomUrl,
      })
    ) {
      const room = await video.createRoom({
        name: roomName,
        recordingEnabled: prepared.recordingEnabled,
      });
      await ctx.runMutation(internal.labs.patchPracticeDaily, {
        roomId: args.roomId,
        roomName: room.roomName,
        roomIdDaily: room.roomId,
        roomUrl: room.roomUrl,
      });
      roomName = room.roomName;
      roomUrl = room.roomUrl;
    }

    const token = await video.createToken({
      roomName,
      userId: prepared.memberId,
      userName: prepared.displayName,
      isOwner: prepared.isMentor,
      enableRecording: prepared.recordingEnabled && prepared.isMentor,
    });

    await ctx.runMutation(internal.rooms.markJoined, {
      roomId: args.roomId,
      memberId: prepared.memberId,
    });

    return {
      token: token.token,
      roomUrl: roomUrl ?? token.roomUrl,
      expiresAt: token.expiresAt,
      provider: token.provider,
    };
  },
});
