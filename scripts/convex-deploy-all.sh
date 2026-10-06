#!/usr/bin/env bash
# Pushes convex/ to every company's Convex project (see src/config/tenants.ts).
# Same backend code everywhere — only the data differs. Each project's deploy
# key is a Netlify env var CONVEX_DEPLOY_KEY_<SLUG>; a company whose key isn't
# set yet is skipped. Apotheke falls back to the original CONVEX_DEPLOY_KEY.
set -euo pipefail

deployed=0
deploy() {
  local slug="$1" key="$2"
  if [ -z "$key" ]; then
    echo "convex-deploy-all: no deploy key for '$slug', skipping"
    return
  fi
  echo "convex-deploy-all: deploying '$slug'"
  CONVEX_DEPLOY_KEY="$key" npx convex deploy
  deployed=$((deployed + 1))
}

deploy apotheke "${CONVEX_DEPLOY_KEY_APOTHEKE:-${CONVEX_DEPLOY_KEY:-}}"
deploy anna "${CONVEX_DEPLOY_KEY_ANNA:-}"

if [ "$deployed" -eq 0 ]; then
  echo "convex-deploy-all: no deploy keys set at all" >&2
  exit 1
fi
