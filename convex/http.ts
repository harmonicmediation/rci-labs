import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { createRequestId, sha256Hex } from "../lib/domain/crypto";

const http = httpRouter();

const v1 = httpAction(async (ctx, request) => {
  const requestId =
    request.headers.get("x-request-id") ?? createRequestId();
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  try {
    const auth = await authorizeService(ctx, request);
    if (!auth.ok) {
      return json(401, requestId, { error: auth.error });
    }

    if (await rateLimited(ctx, auth.keyId)) {
      return json(429, requestId, { error: "Rate limit exceeded" });
    }

    const method = request.method;
    const idempotencyKey = request.headers.get("idempotency-key");
    if (
      ["POST", "PATCH", "PUT"].includes(method) &&
      path.startsWith("/api/v1/members") &&
      !idempotencyKey
    ) {
      return json(400, requestId, {
        error: "Idempotency-Key header is required",
      });
    }

    if (idempotencyKey) {
      const replay = await ctx.runQuery(internal.httpHelpers.getIdempotent, {
        key: idempotencyKey,
        method,
        path,
      });
      if (replay) {
        return json(replay.responseStatus, requestId, replay.responseBody);
      }
    }

    const result = await routeV1(ctx, request, path, method, auth.actorId, auth.scopes);
    if (idempotencyKey && result.persist) {
      await ctx.runMutation(internal.httpHelpers.saveIdempotent, {
        key: idempotencyKey,
        method,
        path,
        responseStatus: result.status,
        responseBody: result.body,
      });
    }
    return json(result.status, requestId, result.body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return json(500, requestId, { error: message });
  }
});

for (const method of ["GET", "POST", "PATCH", "PUT", "DELETE"] as const) {
  http.route({ pathPrefix: "/api/v1/", method, handler: v1 });
}

http.route({
  path: "/internal/observer/events",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const requestId = createRequestId();
    const secret = process.env.OBSERVER_SHARED_SECRET;
    const provided = request.headers.get("x-observer-secret");
    if (!secret || provided !== secret) {
      return json(401, requestId, { error: "Unauthorized observer" });
    }
    const payload = await request.json();
    await ctx.runMutation(internal.observer.ingest, { payload });
    return json(200, requestId, { ok: true });
  }),
});

http.route({
  path: "/webhooks/daily",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const requestId = createRequestId();
    const payload = await request.json();
    await ctx.runMutation(internal.webhooks.record, {
      provider: "daily",
      eventId: String(payload.id ?? payload.event_id ?? requestId),
      eventType: String(payload.type ?? payload.event ?? "unknown"),
      payload,
    });
    return json(200, requestId, { ok: true });
  }),
});

http.route({
  path: "/webhooks/stripe",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const requestId = createRequestId();
    const payload = await request.json();
    await ctx.runMutation(internal.webhooks.record, {
      provider: "stripe",
      eventId: String(payload.id ?? requestId),
      eventType: String(payload.type ?? "unknown"),
      payload,
    });
    return json(202, requestId, { ok: true, deferred: true });
  }),
});

async function routeV1(
  ctx: {
    runQuery: (...args: any[]) => Promise<any>;
    runMutation: (...args: any[]) => Promise<any>;
  },
  request: Request,
  path: string,
  method: string,
  actorId: string,
  scopes: string[],
) {
  const parts = path.replace(/^\/api\/v1\//, "").split("/").filter(Boolean);
  const body = ["GET", "DELETE"].includes(method)
    ? {}
    : await request.json().catch(() => ({}));

  if (parts[0] === "members" && method === "POST" && parts.length === 1) {
    const member = await ctx.runMutation(internal.httpHelpers.createMember, {
      ...body,
      actorId,
    });
    return { status: 201, body: { member }, persist: true };
  }

  if (parts[0] === "members" && method === "GET" && parts.length === 1) {
    const url = new URL(request.url);
    const members = await ctx.runQuery(internal.httpHelpers.listMembers, {
      email: url.searchParams.get("email") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      kind: url.searchParams.get("kind") ?? undefined,
    });
    return { status: 200, body: { members }, persist: false };
  }

  if (parts[0] === "members" && parts[1] && parts.length === 2 && method === "GET") {
    const member = await ctx.runQuery(internal.httpHelpers.getMember, {
      memberId: parts[1],
    });
    if (!member) return { status: 404, body: { error: "Not found" }, persist: false };
    return { status: 200, body: { member }, persist: false };
  }

  if (parts[0] === "members" && parts[1] && parts.length === 2 && method === "PATCH") {
    const member = await ctx.runMutation(internal.httpHelpers.updateMember, {
      memberId: parts[1],
      patch: body,
      actorId,
    });
    return { status: 200, body: { member }, persist: true };
  }

  if (parts[0] === "members" && parts[2] === "deactivate" && method === "POST") {
    const member = await ctx.runMutation(internal.httpHelpers.deactivateMember, {
      memberId: parts[1],
      actorId,
    });
    return { status: 200, body: { member }, persist: true };
  }

  if (parts[0] === "members" && parts[2] === "reactivate" && method === "POST") {
    const member = await ctx.runMutation(internal.httpHelpers.reactivateMember, {
      memberId: parts[1],
      actorId,
    });
    return { status: 200, body: { member }, persist: true };
  }

  if (parts[0] === "members" && parts.length === 2 && method === "DELETE") {
    const member = await ctx.runMutation(internal.httpHelpers.softDeleteMember, {
      memberId: parts[1],
      actorId,
    });
    return { status: 200, body: { member }, persist: true };
  }

  if (parts[0] === "members" && parts[2] === "roles" && method === "PUT") {
    const member = await ctx.runMutation(internal.httpHelpers.setRoles, {
      memberId: parts[1],
      roles: body.roles ?? [],
      actorId,
    });
    return { status: 200, body: { member }, persist: true };
  }

  if (parts[0] === "members" && parts[2] === "entitlements" && method === "GET") {
    const entitlements = await ctx.runQuery(internal.httpHelpers.listEntitlements, {
      memberId: parts[1],
    });
    return { status: 200, body: { entitlements }, persist: false };
  }

  if (parts[0] === "members" && parts[2] === "entitlements" && method === "PUT") {
    const entitlements = await ctx.runMutation(internal.httpHelpers.setEntitlement, {
      memberId: parts[1],
      entitlement: parts[3],
      granted: body.granted !== false,
      actorId,
    });
    return { status: 200, body: { entitlements }, persist: true };
  }

  if (parts[0] === "admin" && !scopes.includes("privacy:admin")) {
    return { status: 403, body: { error: "privacy:admin scope required" }, persist: false };
  }

  if (parts[0] === "admin" && parts[1] === "members" && parts[3] === "data-map" && method === "GET") {
    const dataMap = await ctx.runMutation(internal.privacy.viewMemberDataMapInternal, {
      memberId: parts[2],
      actorId,
    });
    return { status: 200, body: { dataMap }, persist: false };
  }

  if (parts[0] === "admin" && parts[1] === "members" && parts[3] === "export" && method === "POST") {
    const result = await ctx.runMutation(internal.privacy.exportMemberInternal, {
      memberId: parts[2],
      actorId,
    });
    return { status: 200, body: result, persist: true };
  }

  if (parts[0] === "admin" && parts[1] === "members" && parts[3] === "delete-request" && method === "POST") {
    const result = await ctx.runMutation(internal.privacy.deleteMemberInternal, {
      memberId: parts[2],
      actorId,
    });
    return { status: 200, body: result, persist: true };
  }

  if (parts[0] === "admin" && parts[1] === "sessions" && parts[3] === "artifacts" && method === "DELETE") {
    const result = await ctx.runMutation(internal.privacy.deleteArtifactInternal, {
      labSessionId: parts[2],
      artifactId: parts[4],
      artifactType: body.artifact_type ?? "transcript_segments",
      actorId,
    });
    return { status: 200, body: result, persist: true };
  }

  return {
    status: 404,
    body: { error: `No V1 route for ${method} ${path}` },
    persist: false,
  };
}

async function authorizeService(
  ctx: { runQuery: (...args: any[]) => Promise<any> },
  request: Request,
) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return { ok: false as const, error: "Missing bearer token" };
  const keyHash = await sha256Hex(token);
  const key = await ctx.runQuery(internal.httpHelpers.getServiceKey, { keyHash });
  if (!key || !key.active) {
    return { ok: false as const, error: "Invalid service API key" };
  }
  return { ok: true as const, keyId: key._id as string, actorId: key._id as string, scopes: key.scopes as string[] };
}

async function rateLimited(
  ctx: { runMutation: (...args: any[]) => Promise<any> },
  keyId: string,
) {
  return ctx.runMutation(internal.httpHelpers.hitRateLimit, {
    key: `svc:${keyId}`,
    limit: 60,
    windowMs: 60_000,
  });
}

function json(status: number, requestId: string, body: Record<string, unknown>) {
  return new Response(JSON.stringify({ request_id: requestId, ...body }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export default http;
