import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { AppRole } from "../lib/domain/types";

type Ctx = QueryCtx | MutationCtx;

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 403) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

export async function requireIdentity(ctx: Ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new AuthError("Authentication required", 401);
  }
  return identity;
}

export function identityEmail(identity: {
  email?: string | null;
  [key: string]: unknown;
}): string | undefined {
  const candidates = [
    identity.email,
    identity.email_address,
    identity.emailAddress,
    identity.primary_email_address,
    identity.primaryEmailAddress,
  ];
  for (const value of candidates) {
    if (typeof value === "string" && value.includes("@")) {
      return value.trim().toLowerCase();
    }
  }
  return undefined;
}

export function resolveAccountEmail(
  identity: { subject: string; email?: string | null; [key: string]: unknown },
  offered?: string,
): string {
  const verified = identityEmail(identity);
  if (verified) return verified;
  const offeredEmail = offered?.trim().toLowerCase();
  if (offeredEmail?.includes("@")) return offeredEmail;
  return `user-${identity.subject.replace(/[^a-zA-Z0-9]/g, "").slice(-16)}@rci.labs`;
}

export async function getMemberByIdentity(ctx: Ctx) {
  const identity = await requireIdentity(ctx);
  const byAuth = await ctx.db
    .query("members")
    .withIndex("by_auth_user", (q) => q.eq("authUserId", identity.subject))
    .unique();
  if (byAuth) return byAuth;

  const email = identityEmail(identity);
  if (!email) return null;

  const byEmail = await ctx.db
    .query("members")
    .withIndex("by_email", (q) => q.eq("email", email))
    .unique();
  return byEmail;
}

export async function requireMember(ctx: QueryCtx | MutationCtx) {
  const identity = await requireIdentity(ctx);
  const member = await getMemberByIdentity(ctx);
  if (!member || member.status === "deleted") {
    throw new AuthError("No RCI member record is linked to this account", 403);
  }
  if (member.status !== "active") {
    throw new AuthError("Member account is not active", 403);
  }
  if (!member.authUserId && "insert" in ctx.db) {
    await (ctx as MutationCtx).db.patch(member._id, {
      authUserId: identity.subject,
      updatedAt: Date.now(),
    });
  }
  return member;
}

export async function requireLinkedMember(ctx: MutationCtx) {
  const identity = await requireIdentity(ctx);
  const member = await requireMember(ctx);
  if (!member.authUserId) {
    await ctx.db.patch(member._id, {
      authUserId: identity.subject,
      updatedAt: Date.now(),
    });
  }
  return member;
}

export async function getMemberRoles(ctx: Ctx, memberId: Id<"members">) {
  const rows = await ctx.db
    .query("memberRoles")
    .withIndex("by_member", (q) => q.eq("memberId", memberId))
    .collect();
  return rows.map((row) => row.role);
}

export async function requireRole(ctx: Ctx, allowed: AppRole[]) {
  const member = await requireMember(ctx as MutationCtx);
  const roles = await getMemberRoles(ctx, member._id);
  if (!roles.some((role) => allowed.includes(role))) {
    throw new AuthError("Insufficient permissions", 403);
  }
  return { member, roles };
}

export async function requireMentor(ctx: Ctx) {
  return requireRole(ctx, ["mentor", "admin", "super_admin"]);
}

export async function requireAdmin(ctx: Ctx) {
  return requireRole(ctx, ["admin", "super_admin"]);
}

export async function getDefaultOrganization(ctx: Ctx) {
  const orgs = await ctx.db.query("organizations").collect();
  const active = orgs.find((org) => org.status === "active") ?? orgs[0];
  if (!active) {
    throw new AuthError("No organization is configured", 500);
  }
  return active;
}
