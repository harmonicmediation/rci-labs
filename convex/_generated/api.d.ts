/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as alerts from "../alerts.js";
import type * as audit from "../audit.js";
import type * as authz from "../authz.js";
import type * as entitlements from "../entitlements.js";
import type * as http from "../http.js";
import type * as httpHelpers from "../httpHelpers.js";
import type * as labs from "../labs.js";
import type * as members from "../members.js";
import type * as mentors from "../mentors.js";
import type * as observer from "../observer.js";
import type * as privacy from "../privacy.js";
import type * as reports from "../reports.js";
import type * as rooms from "../rooms.js";
import type * as rounds from "../rounds.js";
import type * as rubrics from "../rubrics.js";
import type * as seed from "../seed.js";
import type * as videoActions from "../videoActions.js";
import type * as webhooks from "../webhooks.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  alerts: typeof alerts;
  audit: typeof audit;
  authz: typeof authz;
  entitlements: typeof entitlements;
  http: typeof http;
  httpHelpers: typeof httpHelpers;
  labs: typeof labs;
  members: typeof members;
  mentors: typeof mentors;
  observer: typeof observer;
  privacy: typeof privacy;
  reports: typeof reports;
  rooms: typeof rooms;
  rounds: typeof rounds;
  rubrics: typeof rubrics;
  seed: typeof seed;
  videoActions: typeof videoActions;
  webhooks: typeof webhooks;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
