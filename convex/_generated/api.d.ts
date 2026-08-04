/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as authors from "../authors.js";
import type * as comments from "../comments.js";
import type * as files from "../files.js";
import type * as migrate from "../migrate.js";
import type * as misc from "../misc.js";
import type * as posts from "../posts.js";
import type * as recurringActions from "../recurringActions.js";
import type * as taxonomy from "../taxonomy.js";
import type * as userProfiles from "../userProfiles.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  authors: typeof authors;
  comments: typeof comments;
  files: typeof files;
  migrate: typeof migrate;
  misc: typeof misc;
  posts: typeof posts;
  recurringActions: typeof recurringActions;
  taxonomy: typeof taxonomy;
  userProfiles: typeof userProfiles;
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
