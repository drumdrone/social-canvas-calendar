// Hardcoded list of companies ("tenants"). Apotheke is the original company
// and stays at the site root (socka.site/...) so all its existing URLs keep
// working. Every other company is served under its own path prefix
// (socka.site/anna/...) and talks to its own Convex project, so data, file
// storage, users/passwords and backups are fully separate.
//
// Adding a company:
//   1. Create a new Convex project, copy its production URL here.
//   2. Add its deploy key to Netlify as CONVEX_DEPLOY_KEY_<SLUG> and add the
//      slug to scripts/convex-deploy-all.sh.
//   3. Set APP_URL=https://<domain>/<slug> (+ mail vars) in its Convex env.

export interface Tenant {
  slug: string;
  name: string;
  convexUrl: string;
  // The root company is served at "/" with no path prefix. Exactly one tenant
  // should set this.
  isRoot?: boolean;
}

const TENANTS: Tenant[] = [
  {
    slug: 'apotheke',
    name: 'Apotheke',
    convexUrl: 'https://fine-tiger-542.eu-west-1.convex.cloud',
    isRoot: true,
  },
  {
    slug: 'anna',
    name: 'Anna',
    convexUrl: 'https://dashing-dotterel-28.eu-west-1.convex.cloud',
  },
];

const rootTenant = TENANTS.find((t) => t.isRoot)!;

// The first path segment picks a prefixed company (e.g. /anna); anything else
// — including "/" and Apotheke's own routes like /calendar — is the root
// company, Apotheke.
function resolveTenant(pathname: string): Tenant {
  const slug = pathname.split('/')[1]?.toLowerCase();
  return TENANTS.find((t) => !t.isRoot && t.slug === slug) ?? rootTenant;
}

export const currentTenant = resolveTenant(window.location.pathname);

// Router basename and prefix for absolute URLs: "" for Apotheke, "/anna" etc.
export const tenantBasePath = currentTenant.isRoot ? '' : `/${currentTenant.slug}`;

// All companies share one origin, hence one localStorage — every key is
// namespaced per company, or logging into one would unlock another.
export function tenantStorageKey(key: string): string {
  return `${currentTenant.slug}:${key}`;
}

// Apotheke used un-prefixed localStorage keys before the split; carry them over
// to its namespaced keys so nobody has to log in again.
const LEGACY_STORAGE_KEYS = ['simple_auth_verified', 'current_user_id', 'planning-notes'];

export function migrateLegacyStorage(): void {
  if (!currentTenant.isRoot) return;
  try {
    for (const key of LEGACY_STORAGE_KEYS) {
      const value = localStorage.getItem(key);
      if (value === null) continue;
      if (localStorage.getItem(tenantStorageKey(key)) === null) {
        localStorage.setItem(tenantStorageKey(key), value);
      }
      localStorage.removeItem(key);
    }
  } catch {
    // Storage unavailable — user just logs in again.
  }
}
