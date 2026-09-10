# Security, Privacy and Operations

## Core security requirements
- Daily API key, OpenAI API key, MemberClicks secret and Stripe secret are server-side secrets only.
- Daily meeting tokens are short-lived and room-scoped.
- Use unique RCI member IDs as stable identities; do not rely on display names.
- Enforce authorization in every public Convex query/mutation/action. Use internal functions for privileged writes and verify Clerk identity plus RCI role/entitlement server-side.
- Admin/mentor permissions checked server-side, not only hidden in UI.
- External service API authentication must be revocable and scoped.
- Audit high-impact actions: role change, member deactivation, room reassignment, timer reset, report override, recording changes.

## Recording/transcription privacy
Before production, RCI must define:
- whether labs are always recorded, optionally recorded or transcription-only;
- participant notice/consent wording;
- retention period;
- who can access recordings/transcripts;
- deletion policy;
- whether recordings can be used for model/evaluator calibration;
- whether users can opt out and what happens if they do.

The application must store consent/notice version and timestamp when required by policy.

## AI transparency
Participants should be told that AI may transcribe/evaluate practice sessions. Mentor reports should clearly distinguish AI-generated evaluation from mentor-reviewed/approved evaluation.

## Data minimization
V1 should not collect sensitive real-client notes because client-note functionality is not yet required. When V3 adds client logs, perform a new privacy/security review before storing real coaching-client content.

## Report auditability
Persist:
- rubric version;
- model identifier;
- generated timestamp;
- cited transcript segment IDs;
- AI score;
- mentor override;
- revision history.

## Failure behavior
### Daily outage
- show service unavailable;
- do not create duplicate sessions repeatedly;
- preserve lab queue state;
- allow mentors to communicate fallback instructions outside video if configured later.

### AI outage
- video/lab continues;
- mark AI monitoring unavailable;
- queue report regeneration after transcript is available.

### Observer crash
- heartbeat detects loss;
- restart once automatically;
- alert mentor/admin if repeated failure;
- no duplicate observer processes for same room.

## Monitoring
Use Sentry (or equivalent) for:
- browser errors;
- server errors;
- failed Daily API calls;
- observer failures;
- AI schema failures;
- webhook failures.

Add structured logs with correlation IDs: lab_id, room_id, round_id, member_id where appropriate.

## Rate limiting
Rate-limit:
- token issuance;
- external member CRUD;
- help requests;
- room messages;
- AI generation endpoints;
- login attempts according to auth provider controls.

## Backups
Use Convex production backups/exports appropriate to the selected plan. Reports and audit records must be durable documents and must not depend solely on ephemeral client state.

## Environment separation
Maintain separate Daily/Convex/Clerk/OpenAI configuration for development, staging and production where practical. Never use production API keys in local code committed to Git.

## Pairing and breakout preference privacy (V2)
- `avoid_again` and `prefer_again` are private scheduling metadata, not social feedback.
- Never notify another participant that someone preferred or avoided them.
- Participant endpoints may read/write only their own preference values; moderator/admin access is role-gated and audited.
- UI should avoid stigmatizing labels; moderators should see only the minimum information needed to prevent unwanted pairing.
- Define retention policy separately from mentor reports. Pairing preferences may need expiry by event/program unless the organization intentionally chooses a longer scope.
- Moderator overrides of `no_breakouts`, `observer_only`, `avoid_again`, or temporary room locks must be auditable.
- For consumer events, consent/terms should explain that private matching preferences are used to form future rooms.

