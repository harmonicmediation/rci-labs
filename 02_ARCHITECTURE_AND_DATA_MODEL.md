# Architecture and Data Model

## High-level architecture

```text
Web Client (Student / Mentor / Admin)
        |
        | HTTPS + realtime state
        v
RCI App/API -------------------------> Convex database/realtime/functions
   |                                         |
   |                                         +--> durable app state / audit / reports
   |                                         +--> Clerk authentication
   |
   +--> Daily Service Adapter -------> Daily REST + Daily Video SDK
   |
   +--> AI Service Adapter ----------> OpenAI API
   |
   +--> Observer Orchestrator -------> self-managed Pipecat worker per active room
   |                                      |
   |                                      +--> Daily transcription events
   |
   +--> Member Provider Adapter -----> MemberClicks (future sync)
   |
   +--> Billing Adapter -------------> Stripe (future provisioning)
```

## Why an observer process exists
Daily realtime transcription is broadcast to call participants as transcription events. For reliable server-side moderation, V1 should run a non-speaking observer participant per active practice room. Pipecat's Daily transport can receive `on_transcription_message`, participant events and app messages. Keep this observer behind an `ObserverProvider` interface so self-managed Pipecat, Pipecat Cloud, or another observer implementation can be swapped without changing lab logic.

The observer should not publish camera/audio. It should subscribe only to the information required for moderation. Confirm billing implications during prototype and log actual Daily usage.

## Moderator multi-room behavior
Daily rooms are separate sessions:
- one `moderator_room` per lab session;
- many `practice_room`s per lab session.

A mentor client maintains moderator-room context while entering a practice room. Implementation options, in preferred order:
1. two independent Daily call instances if supported safely by browser/device constraints;
2. moderator collaboration persists as data/chat and paused media while mentor joins practice room, then instantly restores media;
3. open practice room in a separate controlled window/tab.

Prototype option 1 early because simultaneous microphone/camera access by two call instances may require careful muting and device handling. UX requirement is more important than a literal technical implementation: mentors should not feel they have left the moderator collaboration space.

## Core tables
Use Convex document IDs, UTC timestamps, soft-deletion where relevant, explicit authorization checks in every public query/mutation/action, and narrow internal functions for privileged writes.

### organizations
- id
- name
- slug
- status

### members
- id
- auth_user_id
- organization_id
- external_memberclicks_id nullable
- email
- first_name
- last_name
- display_name
- status: active/inactive/suspended/deleted
- member_kind: student/consumer/mentor/admin/multi
- created_at/updated_at

### member_roles
- member_id
- role: member/mentor/admin/super_admin
- scope nullable

### mentor_profiles
- member_id
- bio nullable
- active
- specialties jsonb
- capacity/settings jsonb

### programs
V1 can contain a generic/default program record; populated properly in later lesson integration.
- id
- name
- status

### rubrics
- id
- program_id nullable
- name
- version
- active
- readiness_threshold
- escalation_thresholds jsonb

### rubric_metrics
- id
- rubric_id
- code
- name
- description
- weight
- score_min
- score_max
- expected_score nullable
- evaluator_instructions
- alert_rules jsonb

### lab_sessions
- id
- program_id nullable
- title
- starts_at/ends_at nullable
- status
- desired_room_size default 3
- session_kind: lab/event/consumer_group
- breakout_opt_out_policy: keep_main/non_participating_room nullable
- main_daily_room_name/id nullable
- non_participating_daily_room_name/id nullable
- default_round_seconds
- recording_enabled
- transcription_enabled
- moderator_daily_room_name/id
- created_by

### lab_session_mentors
- lab_session_id
- mentor_id
- joined_at/left_at
- status

### practice_rooms
- id
- lab_session_id
- ordinal
- daily_room_name/id
- room_kind: practice/breakout/main/moderator/non_participating
- status: forming/ready/live/paused/completed/cancelled
- rubric_id
- current_round_id nullable
- assigned_mentor_id nullable
- attention_state
- attention_reason_summary

### room_participants
- id
- practice_room_id
- member_id
- role: coach/client/observer/mentor/ai_observer
- join_status
- daily_session_id nullable
- joined_at/left_at

### rounds
- id
- practice_room_id
- sequence_number
- status
- duration_seconds
- remaining_seconds snapshot
- started_at
- paused_at
- ended_at
- coach_member_id nullable
- client_member_id nullable
- observer_member_id nullable

### timer_events
- id
- round_id
- action: start/pause/resume/reset/add/subtract/end
- actor_member_id
- previous_value
- new_value
- created_at

### room_alerts
- id
- practice_room_id
- round_id nullable
- source: participant/ai/system/mentor
- severity: info/watch/attention/urgent
- category
- summary
- evidence jsonb
- status: open/claimed/resolved/dismissed
- claimed_by nullable
- created_at/resolved_at

### transcripts
- id
- practice_room_id
- round_id nullable
- vendor
- vendor_transcript_id nullable
- storage_path nullable
- status
- started_at/ended_at

### transcript_segments
Use if live segments are persisted. If volume becomes large, partition or move to object storage with indexed metadata.
- id
- transcript_id
- speaker_member_id nullable
- speaker_vendor_id nullable
- started_at_ms
- ended_at_ms nullable
- text
- is_final

### mentor_reports
- id
- coach_member_id
- practice_room_id
- round_id nullable
- rubric_id
- overall_score
- readiness_status
- ai_summary
- habits_to_work_on jsonb
- strengths jsonb
- confidence
- generation_model
- status: draft/reviewed/approved
- reviewed_by nullable
- reviewed_at nullable

### mentor_report_scores
- report_id
- rubric_metric_id
- score
- confidence
- evidence jsonb
- comment

### report_revisions
- id
- report_id
- actor_member_id
- before jsonb
- after jsonb
- created_at


### breakout_preferences
V2 event mode. Current per-event participant choice, not a permanent personality/profile attribute.
- id
- lab_session_id/event_id
- member_id
- mode: available/observer_only/no_breakouts
- source: participant/moderator/system
- set_by_member_id nullable
- created_at/updated_at

### pairing_preferences
V2 event/lab matching memory. Store canonical unordered member pair so A/B and B/A cannot diverge accidentally.
- id
- organization_id
- member_a_id
- member_b_id
- preference: neutral/prefer_again/avoid_again
- scope: event/session/program/organization
- scope_id nullable
- source: participant/moderator/system
- set_by_member_id nullable
- note nullable, moderator-only
- active
- created_at/updated_at

Privacy rule: participant-authored pair preferences are private metadata. Do not reveal them to the paired participant.

### room_assignment_events
Append-only V2 orchestration history.
- id
- lab_session_id/event_id
- member_id
- from_room_id nullable
- to_room_id nullable
- reason: initial_match/manual_move/rebalance/regroup/return_main/opt_out/observer_only/moderator_override/etc
- actor_type: participant/moderator/system
- actor_id nullable
- assignment_batch_id nullable
- matching_seed nullable
- created_at

### room_constraints
V2 temporary event constraints.
- id
- lab_session_id/event_id
- member_id
- constraint_type: lock_room/keep_with/keep_apart/role_lock
- related_member_id nullable
- room_id nullable
- expires_at nullable
- created_by

### audit_events
- id
- organization_id
- actor_type
- actor_id nullable
- action
- entity_type
- entity_id
- metadata jsonb
- created_at

### external_identities
For future MemberClicks/Stripe/API provisioning.
- id
- member_id
- provider
- external_id
- metadata jsonb

## Realtime state
Use Convex reactive queries/subscriptions for operational room metadata, not for raw high-volume audio/video. Daily handles media. Convex realtime state can carry:
- queue updates;
- room membership;
- timers;
- alerts;
- mentor claims;
- round state;
- moderator coordination state.

## Provider interfaces
Create interfaces at the service layer:
- `VideoProvider`: createRoom, deleteRoom, createToken, getPresence, startRecording, stopRecording.
- `ObserverProvider`: startObserver, stopObserver, health.
- `AIProvider`: evaluateWindow, generateReport, moderationCheck.
- `MembershipProvider`: getMember, syncMember, getGroups, getProgress later.
- `BillingProvider`: getEntitlement, handleWebhook later.

## Background jobs
Do not run long-lived observer sessions inside Convex actions: current Convex action runtimes are bounded and are not intended to hold a multi-hour media participant. Run observers as long-lived/on-demand container workers. Convex actions and HTTP actions are appropriate for webhooks, token issuance, CRUD/API orchestration and bounded AI requests.

## Backend decision: Convex
Convex is the V1 system of record. It is a strong fit for the live moderator dashboard because queries are reactive/subscribable and mutations are transactional. External systems can call versioned endpoints through Convex HTTP actions.

Do not reproduce SQL concepts mechanically. In particular:
- use Convex document IDs, schema validators and indexes rather than UUID/foreign-key assumptions;
- centralize authorization helpers and call them from every public function;
- use internal queries/mutations for privileged server-only operations;
- store RCI roles/entitlements in Convex;
- use Clerk only to establish identity;
- keep high-volume/large media out of Convex.

### Long-running process boundary
Convex actions are bounded-duration compute (currently up to 30 minutes in the Convex runtime and 10 minutes in the Node runtime). A practice session can exceed those limits, so AI room observers must run outside Convex in container workers. They communicate with Convex through authenticated HTTP actions or the Convex client.
