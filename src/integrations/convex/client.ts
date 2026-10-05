import { ConvexReactClient } from "convex/react";
import { currentTenant } from "@/config/tenants";

// Each company has its own Convex project; the URL comes from the hardcoded
// tenant list (src/config/tenants.ts), picked by the first path segment.
// In local dev, VITE_CONVEX_URL (written to .env.local by `npx convex dev`)
// overrides it so you work against the dev deployment instead of prod.
const devOverride = import.meta.env.DEV
  ? (import.meta.env.VITE_CONVEX_URL as string | undefined)
  : undefined;

const CONVEX_URL = devOverride || currentTenant?.convexUrl || "";

export const convex = CONVEX_URL ? new ConvexReactClient(CONVEX_URL) : null;
