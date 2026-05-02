#!/usr/bin/env bash
# Vendor the STAC 1.1.0 JSON Schemas (Item + Collection + Catalog + transitive
# sub-schemas) under services/stac/tests/fixtures/stac-schemas/v1.1.0/.
#
# Why vendored: the schema-adherence test must pass offline (Article I.1) and
# must fail loudly (Article I.3). Fetching schemas at test time silently skips
# when the network is down. Vendoring removes the network from the critical
# path; bumps to a new STAC version are deliberate (re-run this script, review
# the diff, commit).
#
# To bump the pinned version: edit STAC_VERSION below, re-run, commit the
# resulting tree under v<NEW>/. Old pinned versions can be retained for
# compatibility tests or deleted.
#
# Re-runs of this script overwrite the existing files in-place; the directory
# tree is git-managed so the diff is reviewable.

set -euo pipefail

STAC_VERSION="1.1.0"
DEST_ROOT="services/stac/tests/fixtures/stac-schemas/v${STAC_VERSION}"
BASE_URL="https://schemas.stacspec.org/v${STAC_VERSION}"

# Resolve repo root regardless of caller's cwd.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

mkdir -p "${DEST_ROOT}"

# Map of relative-path-on-disk → URL. The set covers the Item + Collection
# top-level schemas plus the transitive sub-schemas they $ref into.
declare -a SCHEMAS=(
  "item-spec/json-schema/item.json:${BASE_URL}/item-spec/json-schema/item.json"
  "item-spec/json-schema/common.json:${BASE_URL}/item-spec/json-schema/common.json"
  "item-spec/json-schema/bands.json:${BASE_URL}/item-spec/json-schema/bands.json"
  "item-spec/json-schema/basics.json:${BASE_URL}/item-spec/json-schema/basics.json"
  "item-spec/json-schema/data-values.json:${BASE_URL}/item-spec/json-schema/data-values.json"
  "item-spec/json-schema/datetime.json:${BASE_URL}/item-spec/json-schema/datetime.json"
  "item-spec/json-schema/instrument.json:${BASE_URL}/item-spec/json-schema/instrument.json"
  "item-spec/json-schema/licensing.json:${BASE_URL}/item-spec/json-schema/licensing.json"
  "item-spec/json-schema/provider.json:${BASE_URL}/item-spec/json-schema/provider.json"
  "collection-spec/json-schema/collection.json:${BASE_URL}/collection-spec/json-schema/collection.json"
  "catalog-spec/json-schema/catalog.json:${BASE_URL}/catalog-spec/json-schema/catalog.json"
)

# GeoJSON schemas referenced by item.json — vendored alongside so validation
# stays fully offline. These live one level up so the v<STAC>/ tree stays
# pure-STAC; the validation harness is responsible for mapping URLs → paths.
GEOJSON_DEST="services/stac/tests/fixtures/stac-schemas/geojson"
declare -a GEOJSON_SCHEMAS=(
  "Feature.json:https://geojson.org/schema/Feature.json"
  "Geometry.json:https://geojson.org/schema/Geometry.json"
)

for entry in "${SCHEMAS[@]}"; do
  rel="${entry%%:*}"
  url="${entry#*:}"
  dest="${DEST_ROOT}/${rel}"
  mkdir -p "$(dirname "${dest}")"
  echo "Fetching ${url} → ${dest}"
  curl --fail --silent --show-error --location --output "${dest}" "${url}"
done

# Sanity-check that what we fetched looks like JSON Schema (top-level $schema or
# $id). If not, fail loudly so a silent 404-page-as-200 doesn't poison the cache.
for entry in "${SCHEMAS[@]}"; do
  rel="${entry%%:*}"
  dest="${DEST_ROOT}/${rel}"
  if ! grep -q '"\$schema"\|"\$id"' "${dest}"; then
    echo "ERROR: ${dest} does not look like a JSON Schema (no \$schema/\$id field)" >&2
    exit 1
  fi
done

mkdir -p "${GEOJSON_DEST}"
for entry in "${GEOJSON_SCHEMAS[@]}"; do
  rel="${entry%%:*}"
  url="${entry#*:}"
  dest="${GEOJSON_DEST}/${rel}"
  echo "Fetching ${url} → ${dest}"
  curl --fail --silent --show-error --location --output "${dest}" "${url}"
  if ! grep -q '"\$schema"\|"\$id"' "${dest}"; then
    echo "ERROR: ${dest} does not look like a JSON Schema (no \$schema/\$id field)" >&2
    exit 1
  fi
done

echo "Vendored ${#SCHEMAS[@]} STAC ${STAC_VERSION} schemas under ${DEST_ROOT}/"
echo "Vendored ${#GEOJSON_SCHEMAS[@]} GeoJSON schemas under ${GEOJSON_DEST}/"
