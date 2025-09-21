/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as burnout from "../burnout.js";
import type * as github from "../github.js";
import type * as http from "../http.js";
import type * as linear from "../linear.js";
import type * as linearActions from "../linearActions.js";
import type * as router from "../router.js";
import type * as wakatime from "../wakatime.js";
import type * as webcam from "../webcam.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  burnout: typeof burnout;
  github: typeof github;
  http: typeof http;
  linear: typeof linear;
  linearActions: typeof linearActions;
  router: typeof router;
  wakatime: typeof wakatime;
  webcam: typeof webcam;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
