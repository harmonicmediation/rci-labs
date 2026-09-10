# RCI Labs

V1 practice-lab platform. Product specs live in `00_README.md` through `10_PROVIDER_COST_RECHECK.md`.

## Local preview (no vendor keys)

```bash
npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) (or 3000). Preview routes use fixture data:

- `/preview/mentor` — moderator dashboard
- `/preview/admin` — members / mentors / rubrics / labs
- `/preview/student` — lobby + practice room

Live mentor dashboard (Clerk + Convex):

1. Open `/mentor` and sign in.
2. If this email is not a seeded mentor, click **Use this account as local mentor**.
3. Click **Open Wednesday demo lab**. Join, reset/extend/end timers, move a student, and mentor chat write to Convex.

## Connect the live stack

1. Copy `.env.example` to `.env.local` and fill in Clerk, Convex, Daily, and OpenAI values.
2. Create a Convex project and run `npx convex dev`.
3. Set `CLERK_JWT_ISSUER_DOMAIN` on the Convex deployment.
4. Seed: `npx convex run seed:seedDevelopment`.

`npm test`, `npm run typecheck`, and `npm run lint` are wired for CI.

## Hosting

Production target: [https://app.fulfillmentbuilder.com](https://app.fulfillmentbuilder.com) on Cloudflare Workers via OpenNext.

```bash
npm run deploy
```

Set Clerk, Convex, and other `NEXT_PUBLIC_*` values as Cloudflare Worker build/runtime variables before deploying. Add `https://app.fulfillmentbuilder.com` to Clerk allowed origins.
