import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireMentor } from "./authz";
import { writeAudit } from "./audit";
import {
  extraCoachingRecommended,
  readinessStatus,
  weightedOverall,
} from "../lib/domain/scoring";

export const listForMember = query({
  args: { memberId: v.id("members") },
  handler: async (ctx, args) => {
    await requireMentor(ctx);
    return ctx.db
      .query("mentorReports")
      .withIndex("by_coach", (q) => q.eq("coachMemberId", args.memberId))
      .collect();
  },
});

export const get = query({
  args: { reportId: v.id("mentorReports") },
  handler: async (ctx, args) => {
    await requireMentor(ctx);
    const report = await ctx.db.get(args.reportId);
    if (!report) return null;
    const scores = await ctx.db
      .query("mentorReportScores")
      .withIndex("by_report", (q) => q.eq("reportId", args.reportId))
      .collect();
    return { ...report, scores };
  },
});

export const generateDraft = mutation({
  args: {
    roomId: v.id("practiceRooms"),
    roundId: v.optional(v.id("rounds")),
  },
  handler: async (ctx, args) => {
    const { member } = await requireMentor(ctx);
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");
    const round = args.roundId
      ? await ctx.db.get(args.roundId)
      : room.currentRoundId
        ? await ctx.db.get(room.currentRoundId)
        : null;
    if (!round?.coachMemberId) throw new Error("Round has no coach");
    const rubricId = room.rubricId;
    if (!rubricId) throw new Error("Room has no rubric");
    const rubric = await ctx.db.get(rubricId);
    if (!rubric) throw new Error("Rubric not found");
    const metrics = await ctx.db
      .query("rubricMetrics")
      .withIndex("by_rubric", (q) => q.eq("rubricId", rubricId))
      .collect();

    const scored = metrics.map((metric) => ({
      ...metric,
      score: metric.expectedScore ?? (metric.scoreMin + metric.scoreMax) / 2,
      confidence: 0.4,
    }));
    const overall = weightedOverall(
      scored.map((metric) => ({
        code: metric.code,
        weight: metric.weight,
        score: metric.score,
        scoreMin: metric.scoreMin,
        scoreMax: metric.scoreMax,
      })),
    );
    const readiness = readinessStatus(overall, rubric.readinessThreshold);

    const reportId = await ctx.db.insert("mentorReports", {
      coachMemberId: round.coachMemberId,
      practiceRoomId: args.roomId,
      roundId: round._id,
      rubricId,
      overallScore: overall,
      expectedScore: rubric.readinessThreshold,
      readinessStatus: readiness,
      aiSummary:
        "Draft generated without a live AI pass. Connect OpenAI to replace this placeholder with evidence-backed scores.",
      habitsToWorkOn: [],
      strengths: [],
      confidence: 0.4,
      generationModel: "stub",
      extraCoachingRecommended: extraCoachingRecommended(readiness),
      status: "draft",
    });

    for (const metric of scored) {
      await ctx.db.insert("mentorReportScores", {
        reportId,
        rubricMetricId: metric._id,
        score: metric.score,
        confidence: metric.confidence,
        evidence: [],
      });
    }

    const lab = await ctx.db.get(room.labSessionId);
    if (lab) {
      await writeAudit(ctx, {
        organizationId: lab.organizationId,
        actorType: "member",
        actorId: member._id,
        action: "report.generate_draft",
        entityType: "mentor_report",
        entityId: reportId,
      });
    }

    return reportId;
  },
});

export const update = mutation({
  args: {
    reportId: v.id("mentorReports"),
    mentorComments: v.optional(v.string()),
    readinessStatus: v.optional(
      v.union(
        v.literal("on_track"),
        v.literal("watch"),
        v.literal("extra_coaching_recommended"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const { member } = await requireMentor(ctx);
    const report = await ctx.db.get(args.reportId);
    if (!report) throw new Error("Report not found");
    await ctx.db.insert("reportRevisions", {
      reportId: args.reportId,
      actorMemberId: member._id,
      before: {
        mentorComments: report.mentorComments,
        readinessStatus: report.readinessStatus,
      },
      after: {
        mentorComments: args.mentorComments,
        readinessStatus: args.readinessStatus,
      },
      createdAt: Date.now(),
    });
    await ctx.db.patch(args.reportId, {
      mentorComments: args.mentorComments ?? report.mentorComments,
      readinessStatus: args.readinessStatus ?? report.readinessStatus,
      status: "reviewed",
      reviewedBy: member._id,
      reviewedAt: Date.now(),
    });
    return args.reportId;
  },
});

export const approve = mutation({
  args: { reportId: v.id("mentorReports") },
  handler: async (ctx, args) => {
    const { member } = await requireMentor(ctx);
    await ctx.db.patch(args.reportId, {
      status: "approved",
      reviewedBy: member._id,
      reviewedAt: Date.now(),
    });
    return args.reportId;
  },
});
