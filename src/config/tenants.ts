// Hardcoded list of companies ("tenants"). Each one lives under its own path
// prefix (socka.site/<slug>) and talks to its own Convex project, so data,
// file storage, users/passwords and backups are fully separate.
//
// Adding a company:
//   1. Create a new Convex project, copy its production URL here.
//   2. Add its deploy key to Netlify as CONVEX_DEPLOY_KEY_<SLUG> and add the
//      slug to scripts/convex-deploy-all.sh.
//   3. Set APP_URL=https://socka.site/<slug> (+ mail vars) in its Convex env.

export interface Tenant {
  slug: string;
  name: string;
  convexUrl: string;
}

const TENANTS: Tenant[] = [
  {
    slug: 'apotheke',
    name: 'Apotheke',
    convexUrl: 'https://fine-tiger-542.eu-west-1.convex.cloud',
  },
  {
    slug: 'anna',
    name: 'Anna',
    // TODO: fill in once the Convex project for Anna is created.
    convexUrl: '',
  },
];

// The company that owned the app before the split — its old un-prefixed
// localStorage entries are carried over to the namespaced keys.
const LEGACY_TENANT_SLUG = 'apotheke';
const LEGACY_STORAGE_KEYS = ['simple_auth_verified', 'current_user_id', 'planning-notes'];

function resolveTenant(pathname: string): Tenant | null {
  const slug = pathname.split('/')[1]?.toLowerCase();
  return TENANTS.find((t) => t.slug === slug) ?? null;
}

export const currentTenant = resolveTenant(window.location.pathname);

// Router basename and prefix for absolute URLs, e.g. "/apotheke".
export const tenantBasePath = currentTenant ? `/${currentTenant.slug}` : '';

// All tenants share one origin (socka.site), hence one localStorage — every
// key must be namespaced, or logging into one company would unlock the other.
export function tenantStorageKey(key: string): string {
  return `${currentTenant?.slug ?? 'none'}:${key}`;
}

export function migrateLegacyStorage(): void {
  if (currentTenant?.slug !== LEGACY_TENANT_SLUG) return;
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
