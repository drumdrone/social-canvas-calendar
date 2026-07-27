import { v } from 'convex/values';
import { action } from './_generated/server';

/**
 * Shared team password. The password itself lives in the Convex environment
 * variable APP_PASSWORD (Convex dashboard → Settings → Environment Variables),
 * so it is not shipped in the browser bundle.
 */
export const verifyPassword = action({
  args: { password: v.string() },
  handler: async (_ctx, args) => {
    const expected = process.env.APP_PASSWORD;

    if (!expected) {
      // Fallback keeps a fresh deployment usable before the variable is set.
      return { ok: args.password === 'socka', configured: false };
    }

    return { ok: args.password === expected, configured: true };
  },
});
