# Services, Accounts and Signup Checklist

## Required now

### 1. Daily
Purpose: video/audio rooms, room/token APIs, transcription, recording, participant events.

Create an account and project/domain:
- https://dashboard.daily.co/
- Docs: https://docs.daily.co/
- Pricing: https://www.daily.co/pricing/video-sdk/

Coder needs:
- Daily API key (server secret)
- Daily domain/subdomain
- staging/production convention

Relevant docs:
- Create room: https://docs.daily.co/reference/rest-api/rooms/create-room
- Meeting tokens: https://docs.daily.co/reference/rest-api/meeting-tokens/create-meeting-token
- Webhooks: https://docs.daily.co/reference/rest-api/webhooks
- Transcription: https://docs.daily.co/docs/guides/features/transcription
- Recording: https://docs.daily.co/docs/guides/features/recording
- App messages: https://docs.daily.co/reference/daily-js/instance-methods/send-app-message

### 2. Convex
Purpose: primary application backend: reactive database, realtime mentor/room state, server functions, scheduled work, HTTP API/webhook endpoints, audit/report data and application file metadata.

Sign up/create deployment:
- https://dashboard.convex.dev/
- Docs: https://docs.convex.dev/
- Pricing: https://www.convex.dev/pricing

Coder needs:
- Convex deployment URL/name
- deploy key for CI/CD
- separate dev/staging/production deployments

Use Convex for durable RCI application state and live dashboards. Convex HTTP actions provide externally callable endpoints for future member provisioning and third-party webhooks.

Important limitation: do **not** host the long-lived room observer inside a Convex action. Current Convex runtime actions are capped at 30 minutes and Node actions at 10 minutes, so media observers belong in container workers.

Important storage limitation: Convex file storage is fine for reports, exports and modest protected files, but recordings can be large. Do not route large recordings through Convex HTTP actions (20 MB response limit). In V1, keep recordings with Daily unless/until retention/export requirements justify Cloudflare R2/S3.

### 3. Clerk
Purpose: production authentication and account identity for students, mentors, admins and later consumer members.

- Sign up: https://clerk.com/
- Convex integration: https://docs.convex.dev/auth/clerk

Why separate auth: Convex Auth exists but remains beta. Clerk has a mature Convex integration, Next.js/React support and stronger ready-made account security. Keep RCI roles, permissions and entitlements in Convex rather than relying on Clerk metadata as the authorization source of truth.

Coder needs:
- Clerk publishable key
- Clerk secret key
- Clerk issuer/domain for Convex auth config
- webhook signing secret if syncing user lifecycle into Convex

### 4. OpenAI API
Purpose: live text evaluation, report generation, structured scoring, safety checks, later AI practice partners.

- Platform: https://platform.openai.com/
- API docs: https://platform.openai.com/docs
- API keys: https://platform.openai.com/api-keys

Coder needs:
- server-side API key
- project/budget limits
- model names configured through environment variables, not hard-coded throughout business logic

### 5. Pipecat — self-managed by default
Purpose in V1: run one non-speaking server-side observer per active Daily practice room; receive realtime Daily transcription/participant/app events and forward structured moderation events to Convex.

Pipecat is open source (BSD-2-Clause) and can run on self-managed cloud infrastructure; Pipecat's own deployment docs explicitly list Fly.io, AWS, Google Cloud Run and custom infrastructure as options.

- Docs: https://docs.pipecat.ai/
- Deployment overview: https://docs.pipecat.ai/pipecat/deployment/overview
- Daily transport: https://docs.pipecat.ai/api-reference/server/services/transport/daily
- Source: https://github.com/pipecat-ai/pipecat

Recommended V1 deployment approach:
- containerized Python observer service;
- start one worker/job per active room;
- scale workers from a small pool/on demand;
- observer publishes no audio/video;
- observer receives transcript/events and sends compact structured events into Convex;
- use a provider with programmatic container start/stop and predictable CPU billing.

Pipecat Cloud remains an optional shortcut for the prototype or if operations burden outweighs savings:
- https://pipecat.daily.co/
- pricing: https://www.daily.co/pricing/pipecat-cloud/

Pipecat Cloud currently charges $0.01 per active agent minute for its smallest profile. Self-managing removes that Pipecat Cloud hosting surcharge; RCI instead pays ordinary container compute plus Daily/transcription/model costs.

### 6. Container host for observer workers
Choose one only; do not sign up for several before the proof of concept.

Good initial candidates:
- Fly.io: https://fly.io/
- Google Cloud Run: https://cloud.google.com/run
- AWS ECS/Fargate: https://aws.amazon.com/fargate/

Selection criteria: fast startup, API-driven scaling, minimum warm-worker cost, logs/metrics, region availability, secrets, and straightforward Docker deploys. For a small V1 I would start with Fly.io or Cloud Run and measure actual observer CPU/memory before optimizing.

### 7. GitHub
Purpose: source control, pull requests, CI, AI coding workflow.
- https://github.com/

Create a private repository and protect production branch.

### 8. Sentry
Purpose: error/exception monitoring for browser, Convex-facing client logic, API integrations and observer components.
- https://sentry.io/
- Docs: https://docs.sentry.io/

Recommended now, not logically required for a local prototype.

## Existing service to configure now

### MemberClicks MC Professional
No new vendor signup if RCI already has it.

An Authorized Service Administrator can create an API client under Account Settings > API Management. Public docs show MC Professional uses OAuth 2.0 and exposes profiles, groups, member types/statuses and other resources.

- API overview: https://help.memberclicks.com/hc/en-us/articles/15442882637453-API-Overview
- API management: https://help.memberclicks.com/hc/en-us/articles/18581108667021-API-Management
- API resources: https://help.memberclicks.com/hc/en-us/articles/15442876413197-API-Resources

Create an RCI Labs API client, but lesson/Classroom access should remain a V2 investigation because the public MC Professional API documentation does not establish full Classroom lesson-content endpoints.

## Needed when consumer $29/month program is connected

### Stripe
Purpose: subscriptions, billing lifecycle and automated entitlement provisioning.
- Dashboard: https://dashboard.stripe.com/
- Subscription integration: https://docs.stripe.com/billing/subscriptions/build-subscriptions
- Subscription webhooks: https://docs.stripe.com/billing/subscriptions/webhooks

V1 should already expose authenticated/versioned member and entitlement endpoints through Convex HTTP actions so Stripe, GHL, MemberClicks or another system can provision access later without changing the member model.

## Deployment
The web frontend can use RCI's existing hosting if it supports the chosen React/Next.js shape. Convex owns application backend state/functions; the Pipecat observer workers require a container-capable host and should not run as ordinary request/response serverless functions.

## Credentials checklist for the coder
Provide through a password manager/secret store, never paste into source files:
- `DAILY_API_KEY`
- `DAILY_DOMAIN`
- Convex deploy key / deployment configuration
- `CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- Clerk webhook secret/issuer as applicable
- `OPENAI_API_KEY`
- observer container-host credentials/deploy token
- Sentry DSN
- MemberClicks org ID + OAuth client ID/secret (when lesson/member sync begins)
- Stripe secret/webhook secret (when billing starts)

## Do not sign up for yet unless a real requirement appears
- separate database/realtime vendor: Convex is the system of record;
- separate object storage: keep recordings with Daily in V1; add R2/S3 only when retention/export economics justify it;
- Pipecat Cloud: optional, not required if self-managed observers work reliably;
- Twilio/Vonage/Agora/Zoom Video SDK: not needed if Daily remains the media provider;
- dedicated queue vendor: start with Convex scheduler/functions plus the observer worker orchestrator; add a queue only if load proves necessary.
