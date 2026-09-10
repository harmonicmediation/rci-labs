import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { shouldRaiseAlert } from "../lib/domain/alerts";
import { logEvent } from "../lib/privacy/log";
import type { Id } from "./_generated/dataModel";

export const ingest = internalMutation({
  args: { payload: v.any() },
  handler: async (ctx, args) => {
    const event = args.payload as {
      type?: string;
      practiceRoomId?: string;
      roundId?: string;
      speakerVendorId?: string;
      speakerMemberId?: string;
      text?: string;
      startedAtMs?: number;
      endedAtMs?: number;
      isFinal?: boolean;
      room_state?: "normal" | "watch" | "mentor_suggested" | "urgent";
      category?: string;
      summary?: string;
      confidence?: number;
    };

    if (!event.practiceRoomId) return;
    logEvent({
      level: "info",
      message: "observer.event",
      roomId: event.practiceRoomId,
      type: event.type,
    });
    const room = await ctx.db.get(event.practiceRoomId as Id<"practiceRooms">);
    if (!room) return;

    if (event.type === "transcript" && event.text) {
      let transcript = await ctx.db
        .query("transcripts")
        .withIndex("by_room", (q) => q.eq("practiceRoomId", room._id))
        .first();
      if (!transcript) {
        const transcriptId = await ctx.db.insert("transcripts", {
          practiceRoomId: room._id,
          roundId: room.currentRoundId,
          vendor: "daily",
          status: "active",
          startedAt: Date.now(),
        });
        transcript = await ctx.db.get(transcriptId);
      }
      if (transcript) {
        await ctx.db.insert("transcriptSegments", {
          transcriptId: transcript._id,
          speakerMemberId: event.speakerMemberId as Id<"members"> | undefined,
          speakerVendorId: event.speakerVendorId,
          startedAtMs: event.startedAtMs ?? Date.now(),
          endedAtMs: event.endedAtMs,
          text: event.text,
          isFinal: event.isFinal ?? true,
        });
      }
    }

    if (event.type === "evaluation" && event.room_state && event.room_state !== "normal") {
      const openAlerts = await ctx.db
        .query("roomAlerts")
        .withIndex("by_room_status", (q) => q.eq("practiceRoomId", room._id))
        .collect();
      const decision = shouldRaiseAlert(
        {
          category: event.category ?? event.room_state,
          severity:
            event.room_state === "urgent"
              ? "urgent"
              : event.room_state === "watch"
                ? "watch"
                : "attention",
          confidence: event.confidence ?? 0.7,
          source: "ai",
        },
        openAlerts.map((alert) => ({
          category: alert.category,
          createdAt: alert.createdAt,
          status: alert.status,
        })),
        {
          now: Date.now(),
          cooldownMs: 90_000,
          minConfidence: 0.6,
          previousWindowHadSameCategory: true,
        },
      );
      if (decision.emit) {
        await ctx.db.insert("roomAlerts", {
          practiceRoomId: room._id,
          labSessionId: room.labSessionId,
          roundId: room.currentRoundId,
          source: "ai",
          severity: event.room_state === "urgent" ? "urgent" : "attention",
          category: event.category ?? event.room_state,
          summary: event.summary ?? "AI suggested mentor attention",
          status: "open",
          createdAt: Date.now(),
        });
        await ctx.db.patch(room._id, {
          attentionState: "needs_attention",
          attentionReasonSummary: event.summary ?? "AI suggested mentor attention",
          aiAvailable: true,
        });
      }
    }

    if (event.type === "health" && event.summary === "unavailable") {
      await ctx.db.patch(room._id, { aiAvailable: false });
    }
  },
});
