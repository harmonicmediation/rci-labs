import type { AuthConfig } from "convex/server";

const issuers = [
  process.env.CLERK_JWT_ISSUER_DOMAIN,
  "https://clerk.fulfillmentbuilder.com",
].filter((domain, index, all): domain is string => {
  return Boolean(domain) && all.indexOf(domain) === index;
});

export default {
  providers: issuers.map((domain) => ({
    domain,
    applicationID: "convex",
  })),
} satisfies AuthConfig;
