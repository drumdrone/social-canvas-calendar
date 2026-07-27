import { ConvexReactClient } from 'convex/react';
import { api } from '../../convex/_generated/api';

export { api };

/**
 * Single Convex client for the whole app.
 *
 * Components use it both through `<ConvexProvider>` (for reactive `useQuery`)
 * and directly as `convex.query(...)` / `convex.mutation(...)` / `convex.action(...)`
 * inside imperative handlers.
 *
 * The deployment URL comes from VITE_CONVEX_URL (`.env.local` locally,
 * repository variable in the GitHub Pages workflow).
 */
export const CONVEX_URL = import.meta.env.VITE_CONVEX_URL as string | undefined;

if (!CONVEX_URL) {
  console.error(
    'VITE_CONVEX_URL is not set. Create .env.local with VITE_CONVEX_URL=https://<deployment>.convex.cloud'
  );
}

export const convex = new ConvexReactClient(
  CONVEX_URL ?? 'https://missing-convex-url.convex.cloud'
);
