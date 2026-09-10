export type PublicEnvStatus = {
  convexUrl: boolean;
  clerkPublishableKey: boolean;
  clerkSecretKey: boolean;
  clerkIssuer: boolean;
  daily: boolean;
  openai: boolean;
  sentry: boolean;
};

export function readPublicEnv(): PublicEnvStatus {
  return {
    convexUrl: Boolean(process.env.NEXT_PUBLIC_CONVEX_URL),
    clerkPublishableKey: Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY),
    clerkSecretKey: Boolean(process.env.CLERK_SECRET_KEY),
    clerkIssuer: Boolean(process.env.CLERK_JWT_ISSUER_DOMAIN),
    daily: Boolean(process.env.DAILY_API_KEY && process.env.DAILY_DOMAIN),
    openai: Boolean(process.env.OPENAI_API_KEY),
    sentry: Boolean(
      process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,
    ),
  };
}

export function isAuthConfigured(env: PublicEnvStatus = readPublicEnv()): boolean {
  return env.convexUrl && env.clerkPublishableKey;
}

export function missingSetupItems(env: PublicEnvStatus = readPublicEnv()): string[] {
  const items: string[] = [];
  if (!env.convexUrl) items.push("NEXT_PUBLIC_CONVEX_URL");
  if (!env.clerkPublishableKey) items.push("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
  if (!env.clerkSecretKey) items.push("CLERK_SECRET_KEY");
  if (!env.clerkIssuer) items.push("CLERK_JWT_ISSUER_DOMAIN");
  if (!env.daily) items.push("DAILY_API_KEY + DAILY_DOMAIN");
  if (!env.openai) items.push("OPENAI_API_KEY");
  return items;
}
