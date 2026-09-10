import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { insertMember, serializeMember } from "./members";
import { sha256Hex } from "../lib/domain/crypto";
import { DEFAULT_RETENTION } from "../lib/privacy/retention";
import { assignPracticeRoles } from "../lib/domain/roles";
import {
  getDefaultOrganization,
  getMemberByIdentity,
  identityEmail,
  requireIdentity,
  requireMentor,
} from "./authz";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { writeAudit } from "./audit";

const DEMO_LAB_TITLE = "Wednesday Practice Lab";

const DEMO_ROOMS = [
  {
    ordinal: 1,
    title: "Empathic Reflection",
    module: "Radical Marriage · Module 4",
    attentionState: "on_track" as const,
    elapsedSeconds: 146,
    studentEmails: ["alex@rci.local", "taylor@rci.local", "sam@rci.local"],
  },
  {
    ordinal: 2,
    title: "Staying with Emotion",
    module: "Conscious Dating · Module 3",
    attentionState: "needs_attention" as const,
    elapsedSeconds: 708,
    insight: "Client showed frustration; coach gave advice twice.",
    studentEmails: ["jordan@rci.local", "riley@rci.local", "casey@rci.local"],
  },
];

async function memberByEmail(ctx: MutationCtx, email: string) {
  return ctx.db
    .query("members")
    .withIndex("by_email", (q) => q.eq("email", email))
    .unique();
}

const DEFAULT_METRICS = [
  {
    code: "avoid_advice",
    name: "Avoid advice-giving",
    description:
      "Coach supports client discovery instead of prescribing solutions.",
    weight: 2,
    scoreMin: 1,
    scoreMax: 5,
    expectedScore: 3,
    evaluatorInstructions:
      "1 = repeatedly prescribes solutions. 3 = occasional slips. 5 = consistently elicits client perspective. Cite at least two quotes for scores <=2 or >=5.",
  },
  {
    code: "empathy_reflection",
    name: "Empathy and reflection",
    description: "Coach reflects emotion and meaning accurately.",
    weight: 2,
    scoreMin: 1,
    scoreMax: 5,
    expectedScore: 3,
    evaluatorInstructions:
      "Look for accurate emotion reflections and summaries before moving on.",
  },
  {
    code: "open_questions",
    name: "Open questions",
    description: "Coach uses open, one-at-a-time questions.",
    weight: 1,
    scoreMin: 1,
    scoreMax: 5,
    expectedScore: 3,
    evaluatorInstructions:
      "Flag stacked questions and closed questions that steer the client.",
  },
  {
    code: "presence_silence",
    name: "Presence with silence",
    description: "Coach allows silence and does not fill space with advice.",
    weight: 1,
    scoreMin: 1,
    scoreMax: 5,
    expectedScore: 3,
    evaluatorInstructions:
      "Extended coach monologues or rushing after silence should lower the score.",
  },
  {
    code: "safety",
    name: "Psychological safety",
    description: "Language stays respectful and non-escalating.",
    weight: 2,
    scoreMin: 1,
    scoreMax: 5,
    expectedScore: 5,
    evaluatorInstructions:
      "Any hostile or unsafe language is a critical flag, scored separately from coaching technique.",
  },
];

export const seedDevelopment = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("organizations").first();
    if (existing) {
      return { ok: true, alreadySeeded: true, organizationId: existing._id };
    }

    const organizationId = await ctx.db.insert("organizations", {
      name: "Relationship Coaching Institute",
      slug: "rci",
      status: "active",
    });

    const programId = await ctx.db.insert("programs", {
      organizationId,
      name: "Core Labs",
      status: "active",
    });

    const consentPolicyId = await ctx.db.insert("consentPolicies", {
      version: "v1",
      name: "RCI Labs practice session notice",
      body:
        "This session may include live audio/video, optional recording, realtime transcription, AI monitoring for mentor support, and mentor review of practice reports. RCI stores the minimum coaching evidence needed to run the lab. You can decline; access then follows the configured lab policy.",
      active: true,
      requiredFlags: [
        "audioVideo",
        "recording",
        "transcription",
        "aiMonitoring",
        "mentorReporting",
        "retention",
      ],
      declinedPolicy: "deny_entry",
      updatedAt: Date.now(),
    });
    for (const policy of DEFAULT_RETENTION) {
      await ctx.db.insert("retentionPolicies", {
        artifactType: policy.artifactType,
        mode: policy.mode,
        retainDays: policy.retainDays,
        updatedAt: Date.now(),
      });
    }

    const rubricId = await ctx.db.insert("rubrics", {
      programId,
      name: "V1 Practice Lab Rubric",
      version: 1,
      active: true,
      readinessThreshold: 3.5,
      escalationThresholds: { watch: 3.0, extra_coaching: 2.5 },
    });
    for (const metric of DEFAULT_METRICS) {
      await ctx.db.insert("rubricMetrics", { rubricId, ...metric });
    }

    const adminId = await insertMember(ctx, {
      organizationId,
      email: "admin@rci.local",
      firstName: "RCI",
      lastName: "Admin",
      memberKind: "admin",
      roles: ["member", "admin", "super_admin"],
      actorType: "system",
    });
    await ctx.db.insert("entitlements", {
      memberId: adminId,
      entitlement: "admin_access",
      grantedAt: Date.now(),
    });

    const mentorSeeds = [
      ["mentor.one@rci.local", "Celicia", "Chen"],
      ["mentor.two@rci.local", "Marcus", "Cole"],
    ] as const;
    for (const [email, firstName, lastName] of mentorSeeds) {
      const mentorId = await insertMember(ctx, {
        organizationId,
        email,
        firstName,
        lastName,
        memberKind: "mentor",
        roles: ["member", "mentor"],
        actorType: "system",
      });
      await ctx.db.insert("mentorProfiles", {
        memberId: mentorId,
        active: true,
        specialties: ["relationship coaching"],
      });
      await ctx.db.insert("entitlements", {
        memberId: mentorId,
        entitlement: "mentor_access",
        grantedAt: Date.now(),
      });
    }

    const students = [
      ["alex@rci.local", "Alex", "Rivera"],
      ["taylor@rci.local", "Taylor", "Morgan"],
      ["sam@rci.local", "Sam", "Patel"],
      ["jordan@rci.local", "Jordan", "Lee"],
      ["riley@rci.local", "Riley", "Nguyen"],
      ["casey@rci.local", "Casey", "Brooks"],
    ] as const;
    for (const [email, firstName, lastName] of students) {
      const memberId = await insertMember(ctx, {
        organizationId,
        email,
        firstName,
        lastName,
        memberKind: "student",
        roles: ["member"],
        actorType: "system",
      });
      await ctx.db.insert("entitlements", {
        memberId,
        entitlement: "rci_student_labs",
        grantedAt: Date.now(),
      });
    }

    const serviceKey = process.env.RCI_DEV_SERVICE_API_KEY ?? "rci_svc_dev_local_only";
    await ctx.db.insert("serviceApiKeys", {
      name: "local-dev-members",
      keyHash: await sha256Hex(serviceKey),
      scopes: ["members:write", "members:read"],
      active: true,
      createdAt: Date.now(),
    });
    const privacyKey =
      process.env.RCI_DEV_PRIVACY_API_KEY ?? "rci_privacy_dev_local_only";
    await ctx.db.insert("serviceApiKeys", {
      name: "local-dev-privacy",
      keyHash: await sha256Hex(privacyKey),
      scopes: ["privacy:admin"],
      active: true,
      createdAt: Date.now(),
    });

    return {
      ok: true,
      alreadySeeded: false,
      organizationId,
      rubricId,
      consentPolicyId,
      serviceKeyHint: "hashed RCI_DEV_SERVICE_API_KEY from env",
    };
  },
});

export const claimLocalMentor = mutation({
  args: {
    email: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const existing = await getMemberByIdentity(ctx);
    if (existing && existing.status !== "deleted") {
      await grantMentorAccess(ctx, existing._id, identity.subject);
      return serializeMember(ctx, existing._id);
    }

    const verifiedEmail = identityEmail(identity);
    const offeredEmail = args.email?.trim().toLowerCase();
    let email =
      verifiedEmail ??
      (offeredEmail && offeredEmail.includes("@") ? offeredEmail : undefined) ??
      `user-${identity.subject.replace(/[^a-zA-Z0-9]/g, "").slice(-16)}@rci.labs`;

    const byEmail = await memberByEmail(ctx, email);
    if (byEmail && byEmail.status !== "deleted") {
      if (!byEmail.authUserId || byEmail.authUserId === identity.subject) {
        if (verifiedEmail === email) {
          await grantMentorAccess(ctx, byEmail._id, identity.subject);
          return serializeMember(ctx, byEmail._id);
        }
      }
      email = `user-${identity.subject.replace(/[^a-zA-Z0-9]/g, "").slice(-16)}@rci.labs`;
    }

    const org = await getDefaultOrganization(ctx);
    const nameParts = (identity.name ?? "RCI Mentor").split(" ").filter(Boolean);
    const firstName =
      args.firstName?.trim() ||
      (typeof identity.givenName === "string" ? identity.givenName : undefined) ||
      nameParts[0] ||
      "RCI";
    const lastName =
      args.lastName?.trim() ||
      (typeof identity.familyName === "string" ? identity.familyName : undefined) ||
      nameParts.slice(1).join(" ") ||
      "Mentor";

    const memberId = await insertMember(ctx, {
      organizationId: org._id,
      email,
      firstName,
      lastName,
      memberKind: "admin",
      roles: ["member", "mentor", "admin"],
      actorType: "system",
    });
    await grantMentorAccess(ctx, memberId, identity.subject);
    return serializeMember(ctx, memberId);
  },
});

async function grantMentorAccess(
  ctx: MutationCtx,
  memberId: Id<"members">,
  authUserId: string,
) {
  await ctx.db.patch(memberId, {
    authUserId,
    memberKind: "admin",
    updatedAt: Date.now(),
  });

  const roles = await ctx.db
    .query("memberRoles")
    .withIndex("by_member", (q) => q.eq("memberId", memberId))
    .collect();
  const have = new Set(roles.map((row) => row.role));
  for (const role of ["member", "mentor", "admin"] as const) {
    if (!have.has(role)) {
      await ctx.db.insert("memberRoles", { memberId, role });
    }
  }

  const profile = await ctx.db
    .query("mentorProfiles")
    .withIndex("by_member", (q) => q.eq("memberId", memberId))
    .unique();
  if (!profile) {
    await ctx.db.insert("mentorProfiles", {
      memberId,
      active: true,
      specialties: ["relationship coaching"],
    });
  }

  const entitlements = await ctx.db
    .query("entitlements")
    .withIndex("by_member", (q) => q.eq("memberId", memberId))
    .collect();
  const entitled = new Set(entitlements.map((row) => row.entitlement));
  for (const entitlement of ["mentor_access", "admin_access"]) {
    if (!entitled.has(entitlement)) {
      await ctx.db.insert("entitlements", {
        memberId,
        entitlement,
        grantedAt: Date.now(),
      });
    }
  }
}

export const seedDemoLab = mutation({
  args: {},
  handler: async (ctx) => {
    const { member } = await requireMentor(ctx);
    const org = await getDefaultOrganization(ctx);
    const labs = await ctx.db
      .query("labSessions")
      .withIndex("by_org_status", (q) => q.eq("organizationId", org._id))
      .collect();
    const existing = labs.find(
      (lab) =>
        lab.title === DEMO_LAB_TITLE &&
        (lab.status === "open" || lab.status === "live"),
    );
    if (existing) {
      const rooms = await ctx.db
        .query("practiceRooms")
        .withIndex("by_session", (q) => q.eq("labSessionId", existing._id))
        .collect();
      if (rooms.length > 0) {
        return { labId: existing._id, alreadySeeded: true };
      }
    }

    const rubric = await ctx.db
      .query("rubrics")
      .withIndex("by_active", (q) => q.eq("active", true))
      .first();
    const consent = await ctx.db
      .query("consentPolicies")
      .withIndex("by_active", (q) => q.eq("active", true))
      .first();

    const labId =
      existing?._id ??
      (await ctx.db.insert("labSessions", {
        organizationId: org._id,
        title: DEMO_LAB_TITLE,
        status: "live",
        desiredRoomSize: 3,
        sessionKind: "lab",
        defaultRoundSeconds: 900,
        recordingEnabled: false,
        transcriptionEnabled: true,
        createdBy: member._id,
        rotateRoles: true,
        rubricId: rubric?._id,
        consentPolicyId: consent?._id,
        consentNoticeVersion: consent?.version ?? "v1",
        startsAt: Date.now(),
        moderatorDailyRoomName: "rci-moderator-demo",
      }));

    if (existing) {
      await ctx.db.patch(labId, { status: "live" });
    }

    const now = Date.now();
    const durationSeconds = 900;

    for (const demo of DEMO_ROOMS) {
      const students = [];
      for (const email of demo.studentEmails) {
        const student = await memberByEmail(ctx, email);
        if (!student) {
          throw new Error(`Seed student missing: ${email}. Run seed:seedDevelopment first.`);
        }
        students.push(student);
      }

      const roomId = await ctx.db.insert("practiceRooms", {
        labSessionId: labId,
        ordinal: demo.ordinal,
        dailyRoomName: `rci-lab-${labId}-room-${demo.ordinal}`,
        dailyRoomUrl: `https://stub.daily.co/rci-lab-${labId}-room-${demo.ordinal}`,
        roomKind: "practice",
        status: "live",
        rubricId: rubric?._id,
        attentionState: demo.attentionState,
        attentionReasonSummary: demo.insight,
        sharedNote: `${demo.title} · ${demo.module}`,
        aiAvailable: false,
      });

      const roles = assignPracticeRoles(students.map((student) => student._id));
      for (const assignment of roles) {
        await ctx.db.insert("roomParticipants", {
          practiceRoomId: roomId,
          labSessionId: labId,
          memberId: assignment.memberId as Id<"members">,
          role: assignment.role,
          actorType: "human",
          joinStatus: "joined",
          joinedAt: now,
        });
        await ctx.db.insert("lobbyQueue", {
          labSessionId: labId,
          memberId: assignment.memberId as Id<"members">,
          joinedAt: now,
          status: "assigned",
          assignedRoomId: roomId,
        });
      }

      const coach = roles.find((row) => row.role === "coach");
      const client = roles.find((row) => row.role === "client");
      const observer = roles.find((row) => row.role === "observer");
      const roundId = await ctx.db.insert("rounds", {
        practiceRoomId: roomId,
        sequenceNumber: 1,
        status: "running",
        durationSeconds,
        remainingSeconds: durationSeconds,
        startedAt: now - demo.elapsedSeconds * 1000,
        coachMemberId: coach ? (coach.memberId as Id<"members">) : undefined,
        clientMemberId: client ? (client.memberId as Id<"members">) : undefined,
        observerMemberId: observer
          ? (observer.memberId as Id<"members">)
          : undefined,
      });
      await ctx.db.patch(roomId, { currentRoundId: roundId });

      if (demo.insight) {
        await ctx.db.insert("roomAlerts", {
          practiceRoomId: roomId,
          labSessionId: labId,
          roundId,
          source: "ai",
          severity: "attention",
          category: "advice_giving",
          summary: demo.insight,
          status: "open",
          createdAt: now,
        });
      }
    }

    const waitingRoomId = await ctx.db.insert("practiceRooms", {
      labSessionId: labId,
      ordinal: 7,
      roomKind: "practice",
      status: "forming",
      attentionState: "waiting",
      sharedNote: "Self Empathy · Conscious Dating · Module 2",
      aiAvailable: false,
    });
    const waitingRoundId = await ctx.db.insert("rounds", {
      practiceRoomId: waitingRoomId,
      sequenceNumber: 1,
      status: "pending",
      durationSeconds,
      remainingSeconds: durationSeconds,
    });
    await ctx.db.patch(waitingRoomId, { currentRoundId: waitingRoundId });

    const mentorEmails = ["mentor.one@rci.local", "mentor.two@rci.local"];
    const mentorIds = new Set<Id<"members">>([member._id]);
    for (const email of mentorEmails) {
      const mentor = await memberByEmail(ctx, email);
      if (mentor) mentorIds.add(mentor._id);
    }

    const room2 = await ctx.db
      .query("practiceRooms")
      .withIndex("by_session_ordinal", (q) =>
        q.eq("labSessionId", labId).eq("ordinal", 2),
      )
      .unique();
    const marcus = await memberByEmail(ctx, "mentor.two@rci.local");

    for (const mentorId of mentorIds) {
      const already = await ctx.db
        .query("labSessionMentors")
        .withIndex("by_session_mentor", (q) =>
          q.eq("labSessionId", labId).eq("mentorId", mentorId),
        )
        .unique();
      if (already) continue;
      await ctx.db.insert("labSessionMentors", {
        labSessionId: labId,
        mentorId,
        status: "joined",
        joinedAt: now,
        currentPracticeRoomId:
          marcus && mentorId === marcus._id ? room2?._id : undefined,
      });
    }

    const celicia = await memberByEmail(ctx, "mentor.one@rci.local");
    if (celicia) {
      await ctx.db.insert("moderatorMessages", {
        labSessionId: labId,
        authorMemberId: celicia._id,
        body: "Room 2 looks tricky. I'm going to listen for a minute.",
        createdAt: now - 120_000,
      });
    }
    if (marcus) {
      await ctx.db.insert("moderatorMessages", {
        labSessionId: labId,
        authorMemberId: marcus._id,
        body: "I can jump in if needed.",
        createdAt: now - 90_000,
      });
    }
    await ctx.db.insert("moderatorMessages", {
      labSessionId: labId,
      authorMemberId: member._id,
      body: "I'll take Room 1 unless someone is already there.",
      createdAt: now - 30_000,
    });

    await writeAudit(ctx, {
      organizationId: org._id,
      actorType: "member",
      actorId: member._id,
      action: "lab.seed_demo",
      entityType: "lab",
      entityId: labId,
    });

    return { labId, alreadySeeded: false };
  },
});

