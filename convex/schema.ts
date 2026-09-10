import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const memberStatus = v.union(
  v.literal("active"),
  v.literal("inactive"),
  v.literal("suspended"),
  v.literal("deleted"),
);

const memberKind = v.union(
  v.literal("student"),
  v.literal("consumer"),
  v.literal("mentor"),
  v.literal("admin"),
  v.literal("multi"),
);

const appRole = v.union(
  v.literal("member"),
  v.literal("mentor"),
  v.literal("admin"),
  v.literal("super_admin"),
);

export default defineSchema({
  organizations: defineTable({
    name: v.string(),
    slug: v.string(),
    status: v.union(v.literal("active"), v.literal("inactive")),
  }).index("by_slug", ["slug"]),

  members: defineTable({
    authUserId: v.optional(v.string()),
    organizationId: v.id("organizations"),
    externalMemberclicksId: v.optional(v.string()),
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    displayName: v.string(),
    status: memberStatus,
    memberKind: memberKind,
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_auth_user", ["authUserId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_org_kind", ["organizationId", "memberKind"]),

  memberRoles: defineTable({
    memberId: v.id("members"),
    role: appRole,
    scope: v.optional(v.string()),
  })
    .index("by_member", ["memberId"])
    .index("by_role", ["role"]),

  mentorProfiles: defineTable({
    memberId: v.id("members"),
    bio: v.optional(v.string()),
    active: v.boolean(),
    specialties: v.array(v.string()),
    capacity: v.optional(v.number()),
    settings: v.optional(v.any()),
  })
    .index("by_member", ["memberId"])
    .index("by_active", ["active"]),

  entitlements: defineTable({
    memberId: v.id("members"),
    entitlement: v.string(),
    grantedAt: v.number(),
    grantedBy: v.optional(v.id("members")),
  })
    .index("by_member", ["memberId"])
    .index("by_member_entitlement", ["memberId", "entitlement"]),

  programs: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    status: v.union(v.literal("active"), v.literal("inactive")),
  }).index("by_org", ["organizationId"]),

  rubrics: defineTable({
    programId: v.optional(v.id("programs")),
    name: v.string(),
    version: v.number(),
    active: v.boolean(),
    readinessThreshold: v.number(),
    escalationThresholds: v.any(),
  })
    .index("by_active", ["active"])
    .index("by_name_version", ["name", "version"]),

  rubricMetrics: defineTable({
    rubricId: v.id("rubrics"),
    code: v.string(),
    name: v.string(),
    description: v.string(),
    weight: v.number(),
    scoreMin: v.number(),
    scoreMax: v.number(),
    expectedScore: v.optional(v.number()),
    evaluatorInstructions: v.string(),
    alertRules: v.optional(v.any()),
  })
    .index("by_rubric", ["rubricId"])
    .index("by_rubric_code", ["rubricId", "code"]),

  labSessions: defineTable({
    organizationId: v.id("organizations"),
    programId: v.optional(v.id("programs")),
    title: v.string(),
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
    status: v.union(
      v.literal("draft"),
      v.literal("open"),
      v.literal("live"),
      v.literal("closing"),
      v.literal("closed"),
    ),
    desiredRoomSize: v.number(),
    sessionKind: v.union(
      v.literal("lab"),
      v.literal("event"),
      v.literal("consumer_group"),
    ),
    breakoutOptOutPolicy: v.optional(
      v.union(v.literal("keep_main"), v.literal("non_participating_room")),
    ),
    mainDailyRoomName: v.optional(v.string()),
    mainDailyRoomId: v.optional(v.string()),
    nonParticipatingDailyRoomName: v.optional(v.string()),
    nonParticipatingDailyRoomId: v.optional(v.string()),
    defaultRoundSeconds: v.number(),
    recordingEnabled: v.boolean(),
    transcriptionEnabled: v.boolean(),
    moderatorDailyRoomName: v.optional(v.string()),
    moderatorDailyRoomId: v.optional(v.string()),
    rubricId: v.optional(v.id("rubrics")),
    createdBy: v.id("members"),
    rotateRoles: v.boolean(),
    warningRemainingSeconds: v.optional(v.array(v.number())),
    incompleteGroupTimeoutSeconds: v.optional(v.number()),
    consentPolicyId: v.optional(v.id("consentPolicies")),
    consentNoticeVersion: v.optional(v.string()),
  }).index("by_org_status", ["organizationId", "status"]),

  labSessionMentors: defineTable({
    labSessionId: v.id("labSessions"),
    mentorId: v.id("members"),
    joinedAt: v.optional(v.number()),
    leftAt: v.optional(v.number()),
    status: v.union(v.literal("invited"), v.literal("joined"), v.literal("left")),
    currentPracticeRoomId: v.optional(v.id("practiceRooms")),
  })
    .index("by_session", ["labSessionId"])
    .index("by_mentor", ["mentorId"])
    .index("by_session_mentor", ["labSessionId", "mentorId"]),

  practiceRooms: defineTable({
    labSessionId: v.id("labSessions"),
    ordinal: v.number(),
    dailyRoomName: v.optional(v.string()),
    dailyRoomId: v.optional(v.string()),
    dailyRoomUrl: v.optional(v.string()),
    roomKind: v.union(
      v.literal("practice"),
      v.literal("breakout"),
      v.literal("main"),
      v.literal("moderator"),
      v.literal("non_participating"),
    ),
    status: v.union(
      v.literal("forming"),
      v.literal("ready"),
      v.literal("live"),
      v.literal("paused"),
      v.literal("completed"),
      v.literal("cancelled"),
    ),
    rubricId: v.optional(v.id("rubrics")),
    currentRoundId: v.optional(v.id("rounds")),
    assignedMentorId: v.optional(v.id("members")),
    attentionState: v.union(
      v.literal("on_track"),
      v.literal("waiting"),
      v.literal("needs_attention"),
      v.literal("mentor_requested"),
      v.literal("completed"),
    ),
    attentionReasonSummary: v.optional(v.string()),
    sharedNote: v.optional(v.string()),
    aiAvailable: v.boolean(),
  })
    .index("by_session", ["labSessionId"])
    .index("by_session_ordinal", ["labSessionId", "ordinal"]),

  roomParticipants: defineTable({
    practiceRoomId: v.id("practiceRooms"),
    labSessionId: v.id("labSessions"),
    memberId: v.id("members"),
    role: v.union(
      v.literal("coach"),
      v.literal("client"),
      v.literal("observer"),
      v.literal("mentor"),
      v.literal("ai_observer"),
    ),
    actorType: v.union(v.literal("human"), v.literal("ai")),
    joinStatus: v.union(
      v.literal("assigned"),
      v.literal("joining"),
      v.literal("joined"),
      v.literal("left"),
      v.literal("disconnected"),
    ),
    dailySessionId: v.optional(v.string()),
    joinedAt: v.optional(v.number()),
    leftAt: v.optional(v.number()),
  })
    .index("by_room", ["practiceRoomId"])
    .index("by_member_session", ["memberId", "labSessionId"])
    .index("by_session_status", ["labSessionId", "joinStatus"]),

  lobbyQueue: defineTable({
    labSessionId: v.id("labSessions"),
    memberId: v.id("members"),
    joinedAt: v.number(),
    status: v.union(v.literal("waiting"), v.literal("assigned"), v.literal("left")),
    assignedRoomId: v.optional(v.id("practiceRooms")),
  })
    .index("by_session_status", ["labSessionId", "status"])
    .index("by_session_member", ["labSessionId", "memberId"]),

  rounds: defineTable({
    practiceRoomId: v.id("practiceRooms"),
    sequenceNumber: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("paused"),
      v.literal("complete"),
      v.literal("cancelled"),
    ),
    durationSeconds: v.number(),
    remainingSeconds: v.number(),
    startedAt: v.optional(v.number()),
    pausedAt: v.optional(v.number()),
    endedAt: v.optional(v.number()),
    coachMemberId: v.optional(v.id("members")),
    clientMemberId: v.optional(v.id("members")),
    observerMemberId: v.optional(v.id("members")),
  }).index("by_room", ["practiceRoomId"]),

  timerEvents: defineTable({
    roundId: v.id("rounds"),
    action: v.union(
      v.literal("start"),
      v.literal("pause"),
      v.literal("resume"),
      v.literal("reset"),
      v.literal("add"),
      v.literal("subtract"),
      v.literal("end"),
    ),
    actorMemberId: v.optional(v.id("members")),
    previousValue: v.number(),
    newValue: v.number(),
    createdAt: v.number(),
  }).index("by_round", ["roundId"]),

  roomAlerts: defineTable({
    practiceRoomId: v.id("practiceRooms"),
    labSessionId: v.id("labSessions"),
    roundId: v.optional(v.id("rounds")),
    source: v.union(
      v.literal("participant"),
      v.literal("ai"),
      v.literal("system"),
      v.literal("mentor"),
    ),
    severity: v.union(
      v.literal("info"),
      v.literal("watch"),
      v.literal("attention"),
      v.literal("urgent"),
    ),
    category: v.string(),
    summary: v.string(),
    evidence: v.optional(v.any()),
    status: v.union(
      v.literal("open"),
      v.literal("claimed"),
      v.literal("resolved"),
      v.literal("dismissed"),
    ),
    claimedBy: v.optional(v.id("members")),
    createdAt: v.number(),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_lab_status", ["labSessionId", "status"])
    .index("by_room_status", ["practiceRoomId", "status"]),

  transcripts: defineTable({
    practiceRoomId: v.id("practiceRooms"),
    roundId: v.optional(v.id("rounds")),
    vendor: v.string(),
    vendorTranscriptId: v.optional(v.string()),
    storagePath: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("complete"),
      v.literal("failed"),
    ),
    startedAt: v.optional(v.number()),
    endedAt: v.optional(v.number()),
  }).index("by_room", ["practiceRoomId"]),

  transcriptSegments: defineTable({
    transcriptId: v.id("transcripts"),
    speakerMemberId: v.optional(v.id("members")),
    speakerVendorId: v.optional(v.string()),
    startedAtMs: v.number(),
    endedAtMs: v.optional(v.number()),
    text: v.string(),
    isFinal: v.boolean(),
  }).index("by_transcript", ["transcriptId"]),

  mentorReports: defineTable({
    coachMemberId: v.id("members"),
    practiceRoomId: v.id("practiceRooms"),
    roundId: v.optional(v.id("rounds")),
    rubricId: v.id("rubrics"),
    overallScore: v.number(),
    expectedScore: v.optional(v.number()),
    readinessStatus: v.union(
      v.literal("on_track"),
      v.literal("watch"),
      v.literal("extra_coaching_recommended"),
    ),
    aiSummary: v.string(),
    habitsToWorkOn: v.array(v.any()),
    strengths: v.array(v.any()),
    confidence: v.number(),
    generationModel: v.string(),
    extraCoachingRecommended: v.boolean(),
    mentorComments: v.optional(v.string()),
    status: v.union(v.literal("draft"), v.literal("reviewed"), v.literal("approved")),
    reviewedBy: v.optional(v.id("members")),
    reviewedAt: v.optional(v.number()),
  })
    .index("by_coach", ["coachMemberId"])
    .index("by_room", ["practiceRoomId"]),

  mentorReportScores: defineTable({
    reportId: v.id("mentorReports"),
    rubricMetricId: v.id("rubricMetrics"),
    score: v.number(),
    mentorOverrideScore: v.optional(v.number()),
    confidence: v.number(),
    evidence: v.any(),
    comment: v.optional(v.string()),
  }).index("by_report", ["reportId"]),

  reportRevisions: defineTable({
    reportId: v.id("mentorReports"),
    actorMemberId: v.id("members"),
    before: v.any(),
    after: v.any(),
    createdAt: v.number(),
  }).index("by_report", ["reportId"]),

  breakoutPreferences: defineTable({
    labSessionId: v.id("labSessions"),
    memberId: v.id("members"),
    mode: v.union(
      v.literal("available"),
      v.literal("observer_only"),
      v.literal("no_breakouts"),
    ),
    source: v.union(
      v.literal("participant"),
      v.literal("moderator"),
      v.literal("system"),
    ),
    setByMemberId: v.optional(v.id("members")),
    updatedAt: v.number(),
  }).index("by_session_member", ["labSessionId", "memberId"]),

  pairingPreferences: defineTable({
    organizationId: v.id("organizations"),
    memberAId: v.id("members"),
    memberBId: v.id("members"),
    preference: v.union(
      v.literal("neutral"),
      v.literal("prefer_again"),
      v.literal("avoid_again"),
    ),
    scope: v.union(
      v.literal("event"),
      v.literal("session"),
      v.literal("program"),
      v.literal("organization"),
    ),
    scopeId: v.optional(v.string()),
    source: v.union(
      v.literal("participant"),
      v.literal("moderator"),
      v.literal("system"),
    ),
    setByMemberId: v.optional(v.id("members")),
    note: v.optional(v.string()),
    active: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_org_pair", ["organizationId", "memberAId", "memberBId"])
    .index("by_member_a", ["memberAId"]),

  roomAssignmentEvents: defineTable({
    labSessionId: v.id("labSessions"),
    memberId: v.id("members"),
    fromRoomId: v.optional(v.id("practiceRooms")),
    toRoomId: v.optional(v.id("practiceRooms")),
    reason: v.string(),
    actorType: v.union(
      v.literal("participant"),
      v.literal("moderator"),
      v.literal("system"),
    ),
    actorId: v.optional(v.string()),
    assignmentBatchId: v.optional(v.string()),
    matchingSeed: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_session", ["labSessionId"])
    .index("by_member", ["memberId"]),

  roomConstraints: defineTable({
    labSessionId: v.id("labSessions"),
    memberId: v.id("members"),
    constraintType: v.union(
      v.literal("lock_room"),
      v.literal("keep_with"),
      v.literal("keep_apart"),
      v.literal("role_lock"),
    ),
    relatedMemberId: v.optional(v.id("members")),
    roomId: v.optional(v.id("practiceRooms")),
    expiresAt: v.optional(v.number()),
    createdBy: v.id("members"),
  }).index("by_session", ["labSessionId"]),

  auditEvents: defineTable({
    organizationId: v.id("organizations"),
    actorType: v.union(
      v.literal("member"),
      v.literal("service"),
      v.literal("system"),
    ),
    actorId: v.optional(v.string()),
    action: v.string(),
    entityType: v.string(),
    entityId: v.string(),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_entity", ["entityType", "entityId"]),

  externalIdentities: defineTable({
    memberId: v.id("members"),
    provider: v.string(),
    externalId: v.string(),
    metadata: v.optional(v.any()),
  })
    .index("by_member", ["memberId"])
    .index("by_provider_external", ["provider", "externalId"]),

  serviceApiKeys: defineTable({
    name: v.string(),
    keyHash: v.string(),
    scopes: v.array(v.string()),
    active: v.boolean(),
    createdAt: v.number(),
    lastUsedAt: v.optional(v.number()),
  }).index("by_hash", ["keyHash"]),

  idempotencyKeys: defineTable({
    key: v.string(),
    method: v.string(),
    path: v.string(),
    responseStatus: v.number(),
    responseBody: v.any(),
    createdAt: v.number(),
  }).index("by_key_method_path", ["key", "method", "path"]),

  webhookEvents: defineTable({
    provider: v.string(),
    eventId: v.string(),
    eventType: v.string(),
    processedAt: v.number(),
    payload: v.any(),
  }).index("by_provider_event", ["provider", "eventId"]),

  consentPolicies: defineTable({
    version: v.string(),
    name: v.string(),
    body: v.string(),
    active: v.boolean(),
    requiredFlags: v.array(
      v.union(
        v.literal("audioVideo"),
        v.literal("recording"),
        v.literal("transcription"),
        v.literal("aiMonitoring"),
        v.literal("mentorReporting"),
        v.literal("retention"),
      ),
    ),
    declinedPolicy: v.union(
      v.literal("deny_entry"),
      v.literal("allow_non_recorded"),
      v.literal("observer_only"),
      v.literal("alternate_room"),
    ),
    updatedAt: v.number(),
  }).index("by_version", ["version"]).index("by_active", ["active"]),

  consents: defineTable({
    memberId: v.id("members"),
    labSessionId: v.optional(v.id("labSessions")),
    policyId: v.optional(v.id("consentPolicies")),
    policyVersion: v.string(),
    noticeVersion: v.string(),
    flags: v.object({
      audioVideo: v.boolean(),
      recording: v.boolean(),
      transcription: v.boolean(),
      aiMonitoring: v.boolean(),
      mentorReporting: v.boolean(),
      retention: v.boolean(),
    }),
    recording: v.boolean(),
    transcription: v.boolean(),
    aiEvaluation: v.boolean(),
    declined: v.boolean(),
    outcome: v.union(
      v.literal("entered"),
      v.literal("deny_entry"),
      v.literal("allow_non_recorded"),
      v.literal("observer_only"),
      v.literal("alternate_room"),
    ),
    source: v.optional(v.string()),
    clientMetadata: v.optional(v.any()),
    acceptedAt: v.number(),
  }).index("by_member_session", ["memberId", "labSessionId"]).index("by_member", ["memberId"]),

  retentionPolicies: defineTable({
    artifactType: v.string(),
    mode: v.union(
      v.literal("do_not_persist"),
      v.literal("session_only"),
      v.literal("days"),
      v.literal("until_program_complete"),
      v.literal("until_relationship_ends"),
      v.literal("until_manual_delete"),
    ),
    retainDays: v.optional(v.number()),
    updatedAt: v.number(),
  }).index("by_artifact", ["artifactType"]),

  privacyJobs: defineTable({
    kind: v.union(
      v.literal("export"),
      v.literal("delete_request"),
      v.literal("delete_artifact"),
    ),
    memberId: v.optional(v.id("members")),
    labSessionId: v.optional(v.id("labSessions")),
    artifactType: v.optional(v.string()),
    artifactId: v.optional(v.string()),
    status: v.union(
      v.literal("queued"),
      v.literal("complete"),
      v.literal("failed"),
    ),
    result: v.optional(v.any()),
    requestedBy: v.string(),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  }).index("by_member", ["memberId"]),

  moderatorMessages: defineTable({
    labSessionId: v.id("labSessions"),
    authorMemberId: v.id("members"),
    body: v.string(),
    createdAt: v.number(),
  }).index("by_session", ["labSessionId"]),

  roomMessages: defineTable({
    practiceRoomId: v.id("practiceRooms"),
    authorMemberId: v.optional(v.id("members")),
    audience: v.union(v.literal("all"), v.literal("targeted")),
    audienceMemberIds: v.optional(v.array(v.id("members"))),
    body: v.string(),
    persist: v.boolean(),
    createdAt: v.number(),
  }).index("by_room", ["practiceRoomId"]),

  rateLimits: defineTable({
    key: v.string(),
    windowStart: v.number(),
    count: v.number(),
  }).index("by_key", ["key"]),
});
