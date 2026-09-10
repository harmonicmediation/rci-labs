# RCI Labs API Specification

## General rules
- Base path: `/api/v1`
- JSON only unless streaming/event endpoint explicitly documented.
- OAuth/JWT authenticated for user requests.
- Service-to-service API keys for trusted external provisioning.
- Idempotency key required on externally callable create/update operations where duplication is harmful.
- Every response includes `request_id`.
- Never return Daily/OpenAI secret keys.

## Roles
- `member`: self-service endpoints.
- `mentor`: live-lab moderation endpoints.
- `admin`: member/mentor/lab/rubric management.
- `service`: external provisioning integration.

## Member-management endpoints — build in V1
These are intentionally generic so MemberClicks, Stripe, GHL or a future app can provision access.

### POST `/members`
Create member.
Request:
```json
{
  "email": "person@example.com",
  "first_name": "Sam",
  "last_name": "Lee",
  "status": "active",
  "member_kind": "consumer",
  "external_identities": [
    {"provider":"stripe","external_id":"cus_123"}
  ]
}
```

### GET `/members/{id}`
Read member.

### GET `/members?email=&status=&kind=&cursor=`
Search/list members.

### PATCH `/members/{id}`
Update profile/status.

### POST `/members/{id}/deactivate`
Revoke access without destroying history.

### POST `/members/{id}/reactivate`
Restore access.

### DELETE `/members/{id}`
Admin-only soft-delete/anonymization workflow; do not hard-delete operational/audit records by default.

### PUT `/members/{id}/roles`
Set roles using explicit full replacement semantics.

### PUT `/members/{id}/external-identities/{provider}`
Upsert provider mapping.

## Mentor CRUD
### POST `/mentors`
Create a member with mentor role + mentor profile.

### GET `/mentors`
List/search mentors.

### GET `/mentors/{id}`

### PATCH `/mentors/{id}`

### DELETE `/mentors/{id}`
Deactivate mentor role/profile while retaining past report attribution.

## Lab session endpoints
### POST `/labs`
Create lab session.

### GET `/labs/{id}`

### POST `/labs/{id}/open`
Creates moderator Daily room and opens participant queue.

### POST `/labs/{id}/close`
Ends queue, closes rooms according to policy and starts final report jobs.

### POST `/labs/{id}/join`
Member joins lobby. Returns lobby state and eventually room assignment.

### GET `/labs/{id}/state`
Mentor/admin operational state.

## Matching/rooms
### POST `/labs/{id}/match`
Mentor/admin trigger; normal mode also runs automatically.

### POST `/rooms/{room_id}/join-token`
Server issues role-scoped Daily token.

### POST `/rooms/{room_id}/move-participant`
```json
{"member_id":"...","target_room_id":"..."}
```

### POST `/rooms/{room_id}/message`
Mentor/system message. Payload must include audience (`all` or member IDs) and persistence policy.

### POST `/rooms/{room_id}/claim`
Mentor claims attention/ownership.

### POST `/rooms/{room_id}/release`

### POST `/rooms/{room_id}/request-help`
Member-initiated; creates urgent/attention alert.


## V2 event/breakout orchestration endpoints
Design these contracts now even if implementation lands in V2.

### PUT `/events/{event_id}/me/breakout-preference`
Participant updates own state.
```json
{ "mode": "available" }
```
Allowed: `available`, `observer_only`, `no_breakouts`.

### PUT `/events/{event_id}/members/{member_id}/breakout-preference`
Moderator/admin updates on participant's behalf. Audit actor and previous value.

### POST `/events/{event_id}/breakouts/generate`
```json
{
  "group_size": 3,
  "strategy": "random",
  "respect_pairing_preferences": true,
  "observer_slots_per_room": 1,
  "seed": "optional-reproducible-seed"
}
```
Creates/assigns breakout rooms, excluding `no_breakouts` and honoring observer-only rules.

### POST `/events/{event_id}/breakouts/regroup`
Generate a fresh assignment using current preferences/constraints.

### POST `/events/{event_id}/breakouts/rebalance`
Fix undersized/oversized rooms while minimizing unnecessary moves.

### POST `/events/{event_id}/breakouts/return-main`
Return selected or all eligible participants to main room.

### POST `/events/{event_id}/breakouts/move`
Supports single or bulk manual movement.
```json
{
  "member_ids": ["..."],
  "target_room_id": "...",
  "override_constraints": false
}
```
If the move violates `avoid_again`, role requirements or a lock, return a conflict response requiring explicit override.

### POST `/events/{event_id}/breakouts/swap`
Swap two participants while preserving room size.

### POST `/events/{event_id}/breakouts/merge`
Merge one or more rooms subject to capacity.

### POST `/events/{event_id}/breakouts/dissolve`
Dissolve room and apply specified destination policy.

### PUT `/pairing-preferences/{other_member_id}`
Participant privately sets relationship preference.
```json
{ "preference": "avoid_again", "scope": "event", "scope_id": "..." }
```
Allowed: `neutral`, `prefer_again`, `avoid_again`.

### PUT `/members/{member_id}/pairing-preferences/{other_member_id}`
Moderator/admin version for setting/clearing preference on a participant's behalf.

### GET `/events/{event_id}/matching-state`
Moderator-only. Returns current rooms, unassigned people, breakout preferences, applicable constraints and conflict warnings. Do not expose one participant's private pairing preference to other participants.

### POST `/events/{event_id}/constraints`
Moderator creates temporary lock/keep-with/keep-apart/role constraint.

### DELETE `/events/{event_id}/constraints/{constraint_id}`
Remove temporary constraint.

## Timer endpoints
### POST `/rounds/{round_id}/timer/start`
### POST `/rounds/{round_id}/timer/pause`
### POST `/rounds/{round_id}/timer/resume`
### POST `/rounds/{round_id}/timer/reset`
Requires request body `{ "confirm": true, "duration_seconds": 900 }`.
### POST `/rounds/{round_id}/timer/adjust`
Mentor/admin only. `{ "delta_seconds": 300 }`
### POST `/rounds/{round_id}/end`

All timer mutations are transactional and append a `timer_event`.

## AI alert endpoints
### GET `/labs/{id}/alerts?status=open`
### POST `/alerts/{id}/claim`
### POST `/alerts/{id}/resolve`
### POST `/alerts/{id}/dismiss`

Observer pushes internal events to:
### POST `/internal/observer/events`
Authenticated service endpoint. Accepts participant/presence/transcript/health events.

## Mentor report endpoints
### POST `/reports/generate`
Internal/admin trigger.

### GET `/members/{member_id}/reports`

### GET `/reports/{id}`

### PATCH `/reports/{id}`
Mentor edits comments/readiness or approved human overrides. AI scores should retain original value and human override separately when possible.

### POST `/reports/{id}/approve`

## Rubric endpoints
V1 admin configuration.
### POST `/rubrics`
### GET `/rubrics`
### GET `/rubrics/{id}`
### PATCH `/rubrics/{id}`
### POST `/rubrics/{id}/versions`
Avoid silently modifying historical rubric definitions used by old reports; version them.

## Webhooks
### POST `/webhooks/daily`
Verify provider signature according to Daily's current method; idempotently process meeting/participant/recording/transcript lifecycle events.

### POST `/webhooks/stripe`
Build route and verification scaffolding in V1 even if consumer billing is not launched. Later process subscription lifecycle and provision/revoke entitlements.

### POST `/webhooks/memberclicks`
Only if/when MemberClicks provides an appropriate webhook. Otherwise use scheduled sync/API polling.

## Entitlements
Add from V1 even if initially administered manually.
### GET `/members/{id}/entitlements`
### PUT `/members/{id}/entitlements/{entitlement}`
Examples:
- `rci_student_labs`
- `consumer_group_coaching`
- `mentor_access`

Do not derive access directly from `member_kind`; use explicit entitlements/roles.
