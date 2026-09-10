# RCI Labs — AI Coder Handoff Package

## Purpose
Build a production-ready RCI Labs platform that replaces the current Zoom-based practice-lab workflow first, then grows into the core practice and coaching platform for RCI students and the future $29/month consumer group-coaching program.

Version 1 must be useful without MemberClicks lesson integration. It must handle live video rooms, multiple mentors collaborating in a persistent moderator room, student/client matching, configurable lab timers, AI moderation, mentor reports, admin CRUD for mentors and clients/members, recordings/transcripts, and stable member-management APIs.

## Recommended baseline stack
- Front end: Next.js + TypeScript + React
- Video: Daily Video SDK / daily-js
- Backend/data/realtime/API: Convex (reactive database, queries/mutations/actions, HTTP actions, scheduler and file metadata)
- Authentication: Clerk + Convex integration for V1; keep auth provider replaceable
- AI: OpenAI API for live moderation decisions, structured report generation, and later simulated practice clients
- AI room observer: Pipecat + Daily transport, deployed as self-managed container workers by default; Pipecat Cloud remains an optional managed shortcut
- Error monitoring: Sentry
- Payments later: Stripe subscriptions + webhooks
- Current curriculum/member source: MemberClicks, connected later through MC Professional API and/or a small sync layer
- Deployment: use the team's existing Netlify setup unless the coding agent identifies a concrete blocker; otherwise Vercel is an acceptable alternative

## Non-negotiable architecture principles
1. Daily, OpenAI, MemberClicks and Stripe must sit behind provider/service adapters. Do not scatter vendor-specific calls through the UI.
2. RCI's database is the source of truth for lab state, memberships, scores, mentor reports, practice history and fictional-client state.
3. MemberClicks is temporary/upstream curriculum infrastructure, not the long-term core database.
4. AI moderation may recommend/escalate and score against configured rubrics, but Version 1 does not autonomously issue certification pass/fail decisions.
5. All destructive actions require confirmation where specified. Timer reset requires confirmation.
6. The moderator room is persistent. Mentors can enter a practice room without losing the moderator-room experience.
7. Build all member-management capabilities through versioned APIs from day one because external systems will eventually provision $29/month consumer members.

## Documents
- `01_PRODUCT_SPEC_V1.md` — exact V1 scope and acceptance criteria
- `02_ARCHITECTURE_AND_DATA_MODEL.md` — architecture, tables, room/session model
- `03_API_SPEC.md` — public/internal API contract, including member APIs
- `04_AI_MODERATION_AND_REPORTING.md` — realtime AI observer, scoring and reports
- `05_UI_UX_AND_ROOM_BEHAVIOR.md` — student, mentor and admin behavior
- `06_ROADMAP_V2_PLUS.md` — logical next versions: lessons, notes, fictional clients, rewind, difficulty, AI partner
- `07_SECURITY_PRIVACY_AND_OPERATIONS.md` — security, recording consent, auditability, operations
- `08_BUILD_PLAN_AND_TESTS.md` — implementation order and test plan
- `09_SERVICES_AND_SIGNUPS.md` — accounts, keys, URLs and what to configure
- `11_PRIVACY_COMPLIANCE_AND_DATA_GOVERNANCE.md` — consent, retention, logging, export/deletion, vendor registry
- `mentor_dashboard_mockup.png` — visual reference only; implementation should follow behavior specs, not blindly copy pixels

## V2 event mode update
The package now includes large-event breakout orchestration: participant opt-out/observer-only modes, moderator overrides, private prefer/avoid future pairing controls, random groups of X, rapid manual movement, regrouping/rebalancing, and assignment audit history. See `06_ROADMAP_V2_PLUS.md`, `03_API_SPEC.md`, `02_ARCHITECTURE_AND_DATA_MODEL.md`, and `05_UI_UX_AND_ROOM_BEHAVIOR.md`.
