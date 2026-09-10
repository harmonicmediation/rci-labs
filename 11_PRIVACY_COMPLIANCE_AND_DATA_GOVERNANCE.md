# 11 — Privacy, Compliance & Data Governance

**Status:** Normative V1 addendum  
**Priority:** Effective immediately. If this document conflicts with an earlier handoff document on privacy, data handling, logging, consent, retention, or access control, **this document controls**.  
**Reason for addendum:** RCI is a U.S.-based company and the platform will process sensitive coaching conversations, transcripts, AI analysis, mentor reports, and eventually client notes. The coding implementation has already begun, so this document adds requirements without changing the existing product roadmap.

> This is an engineering/data-governance specification, not a legal conclusion that RCI is or is not subject to any particular law. Counsel should determine RCI's obligations for particular products, jurisdictions, customers, and contracts.

---

## 1. Core design rule

Treat coaching content as **highly sensitive data even when HIPAA does not legally apply**.

The system must be designed so that a future regulated/HIPAA deployment can be introduced without rebuilding the core application. Do **not** enable or pay for HIPAA-specific vendor plans in V1 unless RCI separately determines they are required.

HIPAA/BAA capability is therefore a **deployment/configuration requirement for the future**, not a V1 claim of compliance.

---

## 2. V1 data classifications

Every persisted field and major event stream should fit one of these categories:

1. **Public/non-sensitive** — product copy, generic lesson metadata, public event information.
2. **Account data** — name, email, authentication identifiers, membership status, roles.
3. **Operational data** — room IDs, attendance, timers, assignment state, technical telemetry.
4. **Sensitive coaching data** — transcripts, recordings, client notes, participant disclosures, AI observations, mentor notes, competency evidence, reports, fictional/real client history.
5. **Security/audit data** — authentication events, privileged actions, sensitive-record access, exports/deletions, moderator overrides.

Sensitive coaching data must never be treated as ordinary telemetry.

---

## 3. Data ownership boundaries

### Clerk
Clerk owns authentication identity/session concerns only. Do not make Clerk the canonical RCI member/business database.

### Convex
Convex is the canonical application datastore for RCI membership, roles, entitlements, lab/event state, permissions, reports, and other RCI-owned structured records unless a later provider boundary explicitly says otherwise.

### Daily
Daily handles realtime media and related media/transcription capabilities. Do not use Daily as the long-term source of truth for RCI membership, coaching records, or reports.

### Pipecat observer workers
Observers process only the data required for their assigned room/task. Workers must not receive broad database credentials. Use narrowly scoped server credentials/functions.

### AI model providers
Send the minimum context required for the requested analysis. Do not send unrelated member/profile information merely because it is available.

### Sentry / application logs
Sensitive coaching content is prohibited from normal error logs, traces, breadcrumbs, analytics payloads, console logging, and exception metadata.

---

## 4. Consent gate — required in V1

Before entering an AI-monitored practice/coaching room, the user must encounter a clear consent state appropriate to the session configuration.

The system must be able to separately represent whether the session uses:

- audio/video communication;
- recording;
- realtime transcription;
- AI monitoring/analysis;
- mentor review/reporting;
- retention of transcript/report/recording.

Do not hard-code one universal consent sentence. Store a versioned consent policy/configuration so RCI can change wording and requirements without a schema migration.

Persist at minimum:

- member/user ID;
- event/lab/session ID;
- consent policy version;
- individual consent flags required by that policy;
- timestamp;
- source/client metadata sufficient to audit the action.

If required consent is declined, the application must enforce the configured policy rather than silently proceeding. Possible policies include deny entry, allow non-recorded participation, observer-only, or route to an alternate room. The policy is an admin configuration, not an AI decision.

---

## 5. Authorization and roles

Authorization must be enforced server-side. Hiding a button is not authorization.

At minimum support:

- member/student/consumer;
- observer (session role, not necessarily an account-wide role);
- mentor;
- moderator;
- admin;
- system/service identity.

Use least privilege. A mentor/moderator must not automatically receive access to every historical coaching record simply because they can supervise a current room.

Access to sensitive coaching data should be scoped by organization/program/event/session/client relationship and explicit administrative privilege.

All privileged overrides introduced elsewhere in the handoff — moving users, changing breakout preferences, changing roles, accessing reports, etc. — must be authorized server-side.

---

## 6. Sensitive-data audit trail

Create an append-oriented audit mechanism for security/privacy-relevant actions. At minimum record:

- actor ID / service identity;
- action;
- target type and ID;
- timestamp;
- relevant organization/event/session context;
- reason where a moderator/admin override requires one;
- success/failure.

Audit events should cover at least:

- viewing/downloading/exporting sensitive reports, transcripts, recordings, or client notes;
- deleting sensitive records;
- administrative role/permission changes;
- moderator overrides of participant settings where relevant;
- recording/transcription/AI-monitoring start/stop state changes;
- bulk exports;
- impersonation, if ever implemented.

Do not put the sensitive content itself into the audit event.

---

## 7. Logging rule — implement now

Create a centralized logging/redaction utility and use it instead of arbitrary logging of objects.

Never log:

- transcript text;
- recording contents;
- client notes;
- AI report prose;
- prompts containing participant disclosures;
- full request/response bodies for sensitive endpoints;
- authentication secrets/tokens;
- Daily/Clerk/OpenAI/Convex secrets.

Identifiers may be logged where operationally necessary, but prefer internal opaque IDs over email addresses/names.

Sentry must use `beforeSend`/equivalent sanitization and should default to dropping request bodies and sensitive fields from affected routes.

---

## 8. Retention architecture

Do not scatter retention logic throughout the codebase. Create a retention-policy abstraction.

Each sensitive artifact type should support a policy such as:

- do not persist;
- retain for session only;
- retain N days;
- retain until course/program completion;
- retain until account/client relationship ends;
- retain until manually deleted, where legally/contractually appropriate.

Artifact types include at minimum:

- recordings;
- raw transcripts;
- normalized transcript segments;
- AI intermediate observations;
- final mentor reports;
- client notes (future);
- generated practice-client state (future).

Deletion jobs must delete or request deletion from downstream vendors/storage as applicable, not merely remove the Convex pointer.

Default V1 principle: **retain the least amount of raw sensitive data needed to deliver and validate the product.** Final reports/evidence may have a different retention policy from raw transcripts/recordings.

---

## 9. Export and deletion primitives

Build service-layer primitives now, even if the polished self-service UI arrives later:

- export member/account data;
- export applicable coaching/session data;
- delete/anonymize member data subject to configured retention/legal holds;
- delete a specific session artifact;
- enumerate where a member's data exists.

These functions must be callable through privileged admin workflows and later reusable by member-facing privacy controls.

Deletion must preserve required security/audit evidence without retaining the deleted sensitive content itself.

---

## 10. Vendor/data-flow registry

Maintain a machine-readable or structured configuration/document describing which vendors can receive each data class.

For each provider track:

- provider name;
- purpose;
- data categories sent;
- whether data is persisted;
- configured retention;
- region/data-residency configuration where relevant;
- contract/DPA status;
- BAA capability/status where relevant;
- deletion mechanism;
- environment (development/staging/production).

Initial providers likely include Clerk, Convex, Daily, Pipecat hosting/container provider, OpenAI, Sentry, and deployment/CDN infrastructure.

This registry is essential before declaring any future regulated/HIPAA mode.

---

## 11. Development and test data

Do not use real sensitive coaching transcripts or client notes in local development, automated tests, demos, screenshots, or seed databases unless RCI has explicitly approved a controlled dataset for that purpose.

Use synthetic coaching conversations and fictional identities by default.

Production data must not be casually copied into staging/development.

---

## 12. AI moderation/report requirements

AI output is potentially sensitive coaching data.

For every stored AI mentor/evaluation report, preserve enough provenance to understand:

- which session it came from;
- model/provider and model version where available;
- rubric/version;
- generation timestamp;
- evidence references/timestamps where applicable;
- whether a human reviewed/edited/approved it;
- final status.

Do not let an AI-generated report silently overwrite the human-reviewed version. Preserve revision/provenance history.

V1 AI recommendations are advisory unless a separate product rule explicitly authorizes automated action. Formal progression/certification decisions should retain human confirmation as specified elsewhere in the handoff.

---

## 13. Future client notes

When real-client notes are added in later versions, treat them as a separate sensitive domain rather than simply adding a `notes` field to the member record.

The data model must support:

- client identity separated from coach identity;
- coach/client access relationships;
- granular note ownership/access;
- note history/audit metadata;
- export/deletion;
- retention policy;
- explicit distinction between real clients and fictional practice clients.

Do not expose client notes to AI moderation by default. AI access must be purpose-specific and explicitly configured.

---

## 14. Future regulated / HIPAA mode

The architecture must make it possible to introduce a regulated deployment mode with provider-specific configuration.

Do not represent the application as "HIPAA compliant" merely because one vendor signs a BAA.

Before enabling such a mode, RCI must review the complete data path, including at minimum:

`browser/app -> identity -> realtime media -> transcription -> observer worker -> AI provider -> application database/storage -> logging/monitoring -> backups/exports`

The implementation should therefore avoid hard dependencies that make a single non-qualifying vendor impossible to replace.

Provider interfaces should remain abstract where practical:

- `MediaProvider`
- `TranscriptionProvider`
- `ObserverRuntime`
- `AIProvider`
- `StorageProvider` where sensitive binary artifacts require it

A future regulated configuration may use different provider plans or entirely different providers from ordinary RCI coaching.

---

## 15. Security implementation baseline

V1 must include:

- TLS for network traffic;
- secrets stored only in deployment/server secret stores, never client bundles or source control;
- short-lived/scoped room access tokens where supported;
- server-side authorization for every sensitive mutation/query;
- rate limiting/abuse controls for public/member APIs where appropriate;
- dependency/security update process;
- production/staging separation;
- secure webhook signature verification for providers that support it;
- idempotency/replay protection for consequential webhook processing;
- backup/recovery plan for canonical application data;
- documented incident-response contact/process before production use with real coaching data.

---

## 16. API requirement for future consumer membership

The `/api/v1/members` and entitlement architecture described elsewhere remains correct.

Privacy operations should use the same stable member identity and expose protected service endpoints such as:

- `GET /api/v1/admin/members/:id/data-map`
- `POST /api/v1/admin/members/:id/export`
- `POST /api/v1/admin/members/:id/delete-request`
- `DELETE /api/v1/admin/sessions/:id/artifacts/:artifactId`

Exact URL naming can change to fit the implementation, but these capabilities must exist at the service layer.

Do not expose privileged privacy endpoints using ordinary member API credentials.

---

## 17. Definition of done for this addendum

Before V1 is considered production-ready with real participants, the coding agent should be able to demonstrate:

- [ ] consent policy is versioned, recorded, and enforced;
- [ ] sensitive routes enforce server-side authorization;
- [ ] transcripts/reports/client content do not appear in Sentry or ordinary logs;
- [ ] privileged sensitive-data access creates audit events;
- [ ] raw artifact retention can be configured and deletion can be executed;
- [ ] member data can be enumerated/exported/deleted through admin/service primitives;
- [ ] provider data-flow registry exists;
- [ ] production secrets are not present in source/client bundles;
- [ ] synthetic data is used in development/tests by default;
- [ ] AI reports preserve model/rubric/evidence/human-review provenance;
- [ ] production/staging environments and permissions are separated;
- [ ] webhook verification is implemented where applicable;
- [ ] future regulated/HIPAA mode does not require redesigning the domain model.

---

## 18. Immediate instruction to the coding agent

Do **not** pause implementation of the overall V1.

Review current work against Sections 3–9 and 15 first. If the current schema, logging, authorization, or transcript/report storage violates these requirements, correct those foundations before building substantially more functionality on top of them.

Do not purchase or enable HIPAA-specific vendor plans solely because of this addendum. The purpose now is to make V1 appropriately protective and to preserve a clean path to a regulated deployment if RCI later requires one.
