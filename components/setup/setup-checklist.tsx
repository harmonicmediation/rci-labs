import { missingSetupItems, readPublicEnv } from "@/lib/env";

const items = [
  {
    key: "convexUrl",
    label: "Convex deployment",
    detail: "Create a Convex project, then add NEXT_PUBLIC_CONVEX_URL and run npx convex dev.",
  },
  {
    key: "clerkPublishableKey",
    label: "Clerk publishable key",
    detail: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY from the Clerk dashboard.",
  },
  {
    key: "clerkSecretKey",
    label: "Clerk secret key",
    detail: "CLERK_SECRET_KEY. Also set CLERK_JWT_ISSUER_DOMAIN on the Convex deployment.",
  },
  {
    key: "daily",
    label: "Daily API key + domain",
    detail: "Needed for live video. Until then, rooms use a stub media provider.",
  },
  {
    key: "openai",
    label: "OpenAI API key",
    detail: "Needed for live AI alerts and scored mentor reports.",
  },
] as const;

export function SetupChecklist() {
  const env = readPublicEnv();
  const missing = missingSetupItems(env);

  return (
    <section className="rounded-2xl border border-line bg-card p-6 shadow-[var(--shadow)]">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
        What I need from you
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight">
        Accounts and keys to unlock the live stack
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
        The app, schema, APIs, matching, timers, and UI shells are already in
        the repo. Paste these into <code className="rounded bg-surface px-1.5 py-0.5">.env.local</code>{" "}
        and the Convex dashboard. Until then you can review the screens via the
        preview routes.
      </p>
      <ul className="mt-6 space-y-3">
        {items.map((item) => {
          const ready = env[item.key];
          return (
            <li
              key={item.key}
              className="flex gap-3 rounded-xl border border-line px-4 py-3"
            >
              <span
                className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${
                  ready ? "bg-accent" : "bg-warn"
                }`}
              >
                {ready ? "✓" : "!"}
              </span>
              <div>
                <p className="font-medium">{item.label}</p>
                <p className="text-sm text-muted">{item.detail}</p>
              </div>
            </li>
          );
        })}
      </ul>
      {missing.length > 0 ? (
        <p className="mt-4 text-sm text-muted">
          Still missing: {missing.join(", ")}
        </p>
      ) : (
        <p className="mt-4 text-sm text-accent">All required local keys look present.</p>
      )}
    </section>
  );
}
