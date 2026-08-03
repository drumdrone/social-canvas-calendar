import { ConvexReactClient } from "convex/react";

// Convex deployment URL, written to .env.local by `npx convex dev`:
//   VITE_CONVEX_URL=https://<your-deployment>.convex.cloud
const CONVEX_URL = import.meta.env.VITE_CONVEX_URL as string;

if (!CONVEX_URL) {
  // Fail loudly in dev if the deployment hasn't been linked yet.
  console.warn(
    "VITE_CONVEX_URL is not set. Run `npx convex dev` to create/link a deployment.",
  );
}

export const convex = new ConvexReactClient(CONVEX_URL);
