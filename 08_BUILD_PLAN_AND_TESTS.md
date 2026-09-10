# Build Plan and Test Strategy

## Phase 0 — repository and foundations
- Create Git repository.
- Set up Next.js + TypeScript.
- Configure Convex development/staging deployment and Clerk development app.
- Add migrations and seed data.
- Add lint/typecheck/test CI.
- Add provider interfaces and environment validation.
- Add Sentry.

Definition of done: app boots locally/staging; auth works; migrations reproducible; no vendor secrets in browser bundle.

## Phase 1 — members/admin API
- members table/profile/roles/entitlements.
- admin member CRUD UI.
- mentor CRUD UI.
- `/api/v1/members` service endpoints.
- service API authentication + idempotency.
- audit log.

Why first: every later room/report record needs stable identities.

## Phase 2 — Daily single-room vertical slice
- create private Daily room server-side;
- create short-lived member token;
- custom video UI;
- mute/video/leave;
- participant presence mapping;
- reconnect handling.

Prototype moderator + practice dual-context behavior here before building the full dashboard.

## Phase 3 — labs, queue, matching, timers
- lab creation/open/close;
- lobby/queue;
- groups of 3;
- room creation;
- Coach/Client/Observer role assignment;
- server-authoritative timers;
- pause/resume/reset with confirmation;
- mentor move participant;
- participant help request.

## Phase 4 — multi-mentor moderator dashboard
- moderator Daily room;
- mentor presence;
- room cards/status filters;
- claim/release attention;
- mentor chat/notes;
- enter practice room while preserving moderator context;
- status showing which mentor is in which room.

## Phase 5 — transcription + observer
- self-managed Pipecat observer proof of concept on one room;
- receive `on_transcription_message`;
- map participant IDs;
- persist final transcript segments;
- lifecycle/heartbeat;
- scale test multiple observer agents.

## Phase 6 — AI live moderation
- V1 rubric editor/seed rubric;
- rolling evaluation service;
- strict structured outputs;
- deterministic alert rules;
- cooldown/dedupe;
- mentor alert UX;
- harmful-content moderation path.

## Phase 7 — mentor reports
- final transcript assembly;
- score metrics against rubric;
- deterministic weighted score/readiness;
- strengths/habits generation;
- evidence citations;
- draft/review/override/approve UI;
- report history for member.

## Phase 8 — recording/webhooks/operations
- recording lifecycle if RCI enables recording;
- Daily webhooks;
- transcript storage/retention;
- error monitoring;
- retry queues;
- admin operational status.

## Phase 9 — load/reliability validation
Test at least:
- 50 concurrent practice rooms represented in app state;
- 150 participant identities + multiple mentors;
- rapid joins/leaves;
- disconnect/reconnect;
- incomplete groups;
- simultaneous timer changes blocked/serialized correctly;
- observer restart;
- AI provider timeout;
- duplicate webhook deliveries;
- member API duplicate requests with same idempotency key.


## V2 event orchestration implementation increment
After V1 is stable:
- event main-room mode;
- participant breakout preference control;
- moderator override control;
- configurable opt-out destination policy;
- random groups of X;
- observer-only assignment logic;
- persistent/private prefer-again and avoid-again matching preferences;
- room assignment engine with deterministic seed;
- manual move/swap/bulk move;
- regroup/rebalance/merge/dissolve/return-main;
- assignment audit history;
- scale test at hundreds/thousands of participant state records independent of media-provider load testing.

### V2 matching tests
- `no_breakouts` is never assigned to a breakout unless moderator explicitly overrides;
- `observer_only` never receives an active practice role by default;
- `avoid_again` pair never lands together when a valid alternative exists;
- multiple conflicting `prefer_again` requests degrade gracefully;
- matching minimizes repeats when no preferences exist;
- same seed + same state produces same assignments;
- regroup changes assignments when requested;
- remainder group policy works for N % group_size != 0;
- moderator move detects and warns about violated constraints;
- participant preference changes do not leak to other participants;
- bulk move remains atomic or reports partial failure explicitly;
- participant toggling opt-out during an active breakout is handled according to event policy;
- moderator can clear/set preferences on behalf of participant with audit trail.

## Critical automated tests
### Unit
- matching algorithm;
- timer transitions;
- report weighted score;
- readiness threshold;
- role/entitlement authorization;
- alert cooldown/dedupe.

### Integration
- Daily room/token adapter mocked + one live staging smoke test;
- webhook verification/idempotency;
- AI response schema validation;
- observer event ingestion;
- Convex authorization tests for member/mentor/admin/super-admin boundaries.

### End-to-end
1. Admin creates 6 members and 2 mentors.
2. Open lab.
3. Both mentors enter moderator room.
4. Six members join lobby and become two rooms.
5. Timer starts.
6. Member requests help.
7. Mentor claims and joins room.
8. Mentor returns to collaboration context.
9. Round ends.
10. Report generated and approved.

## AI evaluation validation
Create a labelled test corpus of past/current lab transcripts where qualified humans score the same rubric. Track:
- agreement by metric;
- false positive alert rate;
- false negative critical alert rate;
- mentor override rate;
- score bias by speaker/room conditions where measurable.

Do not expand AI authority until performance is demonstrably acceptable.
