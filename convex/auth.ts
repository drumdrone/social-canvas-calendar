import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Per-user password gate: each user_profiles row carries its own password.
// Entering it both unlocks the app (replacing the old shared APP_PASSWORD)
// and identifies who's commenting — no separate login step needed.
// Intentionally lightweight (plaintext comparison, same trust level as the
// old shared password) — swap for Convex Auth later if real accounts are needed.

export const verifyPassword = action({
  args: { password: v.string() },
  handler: async (ctx, { password }) => {
    const user = await ctx.runQuery(internal.userProfiles.findByPassword, { password });
    if (!user) return { ok: false as const };
    return { ok: true as const, userId: user._id, fullName: user.fullName };
  },
});
