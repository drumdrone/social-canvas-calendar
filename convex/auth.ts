import { action } from "./_generated/server";
import { v } from "convex/values";

// Simple shared-password gate, porting the existing SimpleAuthGate behaviour.
// The password is stored as a Convex environment variable (Dashboard →
// Settings → Environment Variables), NOT in code:
//   APP_PASSWORD=your-shared-password
//
// The client calls this action and, on success, stores a flag in localStorage
// (same UX as today). This is intentionally lightweight — swap for Convex Auth
// later if per-user accounts are needed.

export const verifyPassword = action({
  args: { password: v.string() },
  handler: async (_ctx, { password }) => {
    const expected = process.env.APP_PASSWORD;
    if (!expected) {
      throw new Error("APP_PASSWORD is not configured on the Convex deployment");
    }
    return { ok: password === expected };
  },
});
