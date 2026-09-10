# Logical Roadmap After V1

The versions below are product increments, not calendar promises. Keep migrations backwards-compatible.

## V1 — Zoom replacement + AI moderation/reports
Scope is defined in `01_PRODUCT_SPEC_V1.md`.

## V1.1 — Operational hardening
- analytics/usage dashboard;
- mentor workload statistics;
- richer connection-quality diagnostics;
- automatic room recovery/retry;
- configurable retention/deletion;
- report calibration tools comparing AI vs mentor adjustments;
- export/reporting;
- optional notification/email service.


## V2 — Event mode + advanced breakout orchestration
### Goal
Support large live events with hundreds or thousands of participants, including fast movement between a main session and many custom breakout rooms.

### Participant breakout preferences
Every participant can change these at any time from a simple control in the main-room/event UI:
- `available`: include me in normal breakout matching;
- `observer_only`: place me in a breakout only as an observer/non-practicing participant;
- `no_breakouts`: do not place me into breakout exercises.

Host policy for `no_breakouts` participants is configurable per exercise:
- keep them in the main room; or
- move them together into a designated `non_participating` room.

Moderators can view and override any participant's current preference. Overrides must be explicit, auditable and easy to reverse.

### Breakout creation and assignment
- create random rooms of X participants;
- create role-aware rooms when the exercise requires coach/client/observer roles;
- exclude `no_breakouts`;
- place `observer_only` people only into observer slots unless a moderator overrides;
- auto-handle remainder groups according to event policy;
- return everyone to main room;
- regroup all participants into a fresh random set;
- rebalance undersized rooms;
- merge rooms;
- dissolve rooms;
- keep selected people together or apart.

### Pairing preference memory
While in a breakout room, a participant can privately mark another participant as:
- `prefer_again`: prefer to be matched together again;
- `avoid_again`: do not match us together again;
- neutral/no preference.

These controls must be quick, private and reversible. The other participant is never told that an avoid/prefer marker was set.

Moderators can create, change or clear these preferences on behalf of participants when needed.

Matching rules:
1. hard `avoid_again` constraints outrank soft preferences;
2. `prefer_again` is a soft weighting, not a guarantee;
3. moderator hard overrides outrank participant soft preferences but should not silently override participant `avoid_again` unless explicitly authorized by event policy;
4. matching should minimize repeat pairings by default when no positive preference exists;
5. the algorithm must remain deterministic/testable for a given seed + state so assignments can be reproduced in support/debugging.

### Moderator movement UX
Moderators need extremely fast room management:
- drag/drop participant between rooms on desktop plus an accessible Move action;
- multi-select participants and move as a group;
- `Move to...` search by room number/name;
- one-click `Swap`;
- one-click `Move to main`;
- one-click `Move to non-participating room`;
- ability to lock a participant to a room for the current exercise;
- visible warnings before violating an avoid constraint or role requirement.

### Scale architecture
The event orchestration engine belongs to RCI, not the media provider. Treat `main room`, `breakout room`, `non-participating room` and participant assignments as first-class RCI concepts. Media adapters only create/join/leave underlying media sessions. This keeps Daily replaceable and allows the same orchestration to support future providers.

## V3 — Curriculum-aware labs + MemberClicks connection
### Goal
Know what each coach should know at this point and what the current lesson requires.

### Features
- MemberClicks profile/group/member sync through MC Professional API.
- Investigate Classroom-specific lesson/module access; do not assume it exists in public MC Professional API.
- If lesson content is inaccessible, create RCI curriculum sync/import and make MemberClicks only identity/progress context.
- programs, courses, modules, lessons;
- lesson-specific lab specifications;
- prerequisites/skills already taught;
- lesson-specific rubric metrics and expected proficiency;
- mentor report tied to lesson level;
- progression/readiness flags;
- optional extra-coaching workflow when below threshold.

Important design: maintain an RCI `Lab Specification` per lesson rather than injecting entire lesson content into every AI evaluation.

## V4 — Real client notes / coach practice-management layer
### Goal
Create the client log that students can use during training and later as working coaches.

### Features
- client profiles owned/shared according to permissions;
- session notes;
- goals;
- homework;
- progress;
- next-session plan;
- attachments;
- coach-visible history;
- future Wheel of Life integration;
- strict privacy/access controls;
- distinguish real-client records from fictional training clients.

This becomes a reusable coach feature, not merely lab infrastructure.

## V5 — Persistent fictional practice clients
### Goal
Practice continuity independent of which human partner appears in the lab.

### Features
- admin/AI-generated fictional client/couple profiles;
- canonical background, traits, goals, secrets, relationship context;
- lesson/scenario suitability tags;
- persistent client timeline;
- latest homework and AI-generated homework outcome;
- previous session summary;
- short private role briefing for whoever plays the client;
- observer briefing;
- coach sees only information they should legitimately know;
- AI can privately remind role-player during session.

Critical rule: structured canonical state is authoritative. AI generates briefs from state; it must not freely rewrite client history.

## V6 — Practice selector, difficulty modifiers and rewind/do-over
### Practice selector
Coach can choose:
- normal curriculum practice;
- specific lesson/skill;
- specific fictional client;
- scenario;
- custom duration;
- difficulty level;
- surprise me.

### Difficulty modifiers
Examples:
- interrupts frequently;
- repeatedly asks for advice;
- one-word answers;
- changes subject;
- becomes defensive;
- very talkative;
- strong emotion;
- distrusts coaching;
- partner dominates;
- one partner withdraws;
- surprise me.

AI delivers private role instructions and subtle reminders during session.

### Rewind/do-over
Represent fictional-client history as canonical timeline + practice branches.
- rewind to earlier lesson/session state;
- replay without changing canonical history;
- optionally choose a successful branch as new canonical state if appropriate;
- later allow rewind to an AI-identified moment within a session.

## V7 — AI practice partner
### Goal
Allow useful practice when no human practice partners are available.

### Modes
1. One human coach + AI client.
2. Human coach + AI client + AI observer.
3. Human coach + AI couple (two AI personas) when technically robust.
4. Two humans + AI fills missing third role.

### Architecture
- Pipecat/Daily agent joins as actor.
- AI actor gets fictional-client structured state, scenario/difficulty controls and only information the character should know.
- Real-time STT/LLM/TTS pipeline.
- Separate evaluator process/prompt from role-player process to avoid self-grading bias.
- AI actor state update written to practice branch after session.

### Guardrail
Do not have the same unconstrained prompt simultaneously role-play the client and decide final coach competency. Separate contexts/services.

## V8 — Consumer $29/month group coaching
Reuse the same member APIs, Daily rooms, scheduling/queueing and mentor operations.

Differences from certification labs:
- consumers are clients, not coach trainees;
- no trainee competency scoring;
- group coaching plans/topics;
- different privacy rules and reports;
- Stripe entitlement `consumer_group_coaching`;
- automated subscription provisioning/deprovisioning;
- consumer app navigation.

## V9 — Consolidated RCI platform
Gradually replace MemberClicks:
- curriculum delivery;
- discussions/community;
- assignments/homework;
- lab scheduling;
- certifications;
- mentor workflow;
- consumer coaching;
- client logs;
- Wheel of Life integrations;
- unified member identity and billing.
