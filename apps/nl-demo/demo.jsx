/* @jsxRuntime classic */
/**
 * NL Demo — root component.
 *
 * Babel transforms this file in the browser at runtime. We import library
 * symbols via the importmap defined in index.html:
 *
 *   - react / react-dom/client → CDN ESM (esm.sh)
 *   - @debrief/nl-demo/lib     → ./data/debrief-lib.js (esbuild bundle)
 *
 * Local helpers are loaded as ESM modules from ./lib/.
 */

import * as React from "react";
import { createRoot } from "react-dom/client";
import {
  generateCql2,
  createRecordedLLMClient,
  createLiveLLMClient,
  validateLiveConfig,
  filterByCql2Json,
  canonicalisePhrase,
  vesselClassTreeToTaxonomy,
} from "@debrief/nl-demo/lib";

import { colourFor } from "./lib/colour.mjs";
import {
  buildVesselTypeIndex,
  projectCard,
  truncateDescription,
} from "./lib/projection.mjs";
import { cql2FromChips } from "./lib/recompute.mjs";

const { useCallback, useEffect, useMemo, useRef, useState } = React;

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------

/** Fetch JSON or throw with a clear message about the path. */
async function fetchJson(path) {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`failed to fetch ${path}: HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Convert a raw STAC item.json into the shape the filter-engine expects
 * (StacBrowserItem + camelCase + raw properties retained for card rendering).
 */
function toBrowserItem(rawItem) {
  const props = rawItem.properties ?? {};
  return {
    id: rawItem.id,
    title: props.title ?? rawItem.id,
    itemPath: `items/${rawItem.id}.json`,
    bbox: rawItem.bbox ?? null,
    datetime: props.datetime ?? null,
    startDatetime: props.start_datetime ?? null,
    endDatetime: props.end_datetime ?? null,
    platforms: props["debrief:platforms"] ?? [],
    tags: props["debrief:tags"] ?? [],
    featureTags: props["debrief:feature_tags"] ?? [],
    author: props["debrief:author"] ?? null,
    collection: rawItem.collection ?? null,
    modified: props.updated ?? null,
    properties: props,
  };
}

// ---------------------------------------------------------------------------
// Chip projection (LozengeSeed[] -> ChipDescriptor[])
// ---------------------------------------------------------------------------

function describeChip(seed, vesselTypeIndex) {
  const filterType = seed.filterType;
  const value = String(seed.value ?? "");
  const negated = Boolean(seed.negated);

  let label = value;
  if (filterType === "nationality") {
    label = value === "GB" ? "UK" : value.toUpperCase();
  } else if (filterType === "vessel-class") {
    label = vesselTypeIndex.get(value) ?? value;
  }

  return {
    id: `${filterType}:${value}:${negated ? "n" : "y"}`,
    label,
    filterType,
    value,
    negated,
    colour: colourFor(filterType),
  };
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function QueryBar({ value, onChange, onSubmit, disabled, busy }) {
  function handleKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      onSubmit(value);
    }
  }
  return (
    <form
      className="query-bar"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(value);
      }}
    >
      <input
        type="text"
        autoFocus
        placeholder="Try: UK submarines"
        value={value}
        disabled={disabled}
        data-testid="query-input"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <button type="submit" disabled={disabled || busy} data-testid="query-submit">
        {busy ? "Searching…" : "Search"}
      </button>
    </form>
  );
}

function Chip({ chip, onRemove }) {
  return (
    <span
      className={`chip chip--${chip.colour}`}
      data-testid={`chip-${chip.filterType}-${chip.value}`}
      data-chip-colour={chip.colour}
    >
      <span className="chip__label">{chip.label}</span>
      <button
        className="chip__remove"
        type="button"
        aria-label={`Remove ${chip.label}`}
        onClick={() => onRemove(chip)}
      >
        ×
      </button>
    </span>
  );
}

function ChipBar({ chips, onRemoveChip, onClearAll }) {
  if (!chips || chips.length === 0) return null;
  return (
    <div className="chip-bar" data-testid="chip-bar">
      {chips.map((chip) => (
        <Chip key={chip.id} chip={chip} onRemove={onRemoveChip} />
      ))}
      <button type="button" className="clear-all" onClick={onClearAll}>
        Clear all
      </button>
    </div>
  );
}

function ResultsCount({ shown, total, filtered }) {
  if (filtered) {
    return (
      <div className="results-count" data-testid="results-count">
        <strong>{shown}</strong> of {total} plots
      </div>
    );
  }
  return (
    <div className="results-count" data-testid="results-count">
      <strong>{total}</strong> plots
    </div>
  );
}

function Card({ projection, activeChipFields }) {
  return (
    <article className="card" data-testid={`card-${projection.id}`}>
      <header>
        <h3 className="card__title">{projection.title}</h3>
        {projection.year ? <span className="card__year">{projection.year}</span> : null}
      </header>
      {projection.description ? (
        <p className="card__description">{projection.description}</p>
      ) : null}
      <div className="card__badges">
        {projection.nationalityBadges.map((label) => (
          <span
            key={`n:${label}`}
            className={
              "badge badge--nationality" +
              (activeChipFields.has("nationality") ? " is-active" : "")
            }
          >
            {label}
          </span>
        ))}
        {projection.vesselBadges.map((label) => (
          <span
            key={`v:${label}`}
            className={
              "badge badge--vessel" +
              (activeChipFields.has("vessel-class") ? " is-active" : "")
            }
          >
            {label}
          </span>
        ))}
        {projection.tagBadges.map((label) => (
          <span
            key={`t:${label}`}
            className={
              "badge badge--tag" +
              (activeChipFields.has("tag") ? " is-active" : "")
            }
          >
            {label}
          </span>
        ))}
      </div>
    </article>
  );
}

function CardGrid({ items, registry, chips }) {
  const activeChipFields = useMemo(
    () => new Set(chips.map((c) => c.filterType)),
    [chips],
  );
  const projections = useMemo(
    () => items.map((item) => projectCard(item, registry)),
    [items, registry],
  );
  return (
    <section className="card-grid" data-testid="card-grid">
      {projections.map((p) => (
        <Card key={p.id} projection={p} activeChipFields={activeChipFields} />
      ))}
    </section>
  );
}

function EmptyState({ onClearAll }) {
  return (
    <div className="empty-state" data-testid="empty-state">
      <strong>No plots match.</strong> Try rephrasing — for example, &ldquo;UK
      submarines&rdquo;.
      <div>
        <button type="button" className="clear-all" onClick={onClearAll}>
          Clear all
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Live-mode diagnostic banners (#190 US2 + US3)
// ---------------------------------------------------------------------------

/**
 * Per-outcome human-readable messages for non-success LiveOutcome kinds.
 * Keyed by `LiveOutcome["kind"]` after the #191 migration (Decision 6
 * renamed `usage-cap-reached` → `ceiling-reached` and folded
 * `oversize-response` into `malformed-response`).
 */
const LIVE_BANNER_MESSAGES = {
  "auth-failure":
    "Provider rejected the request — check credentials, then restart the proxy.",
  "rate-limit":
    "Provider rate limit hit — try again in a moment or use a different phrase.",
  "provider-error":
    "The language-model provider returned an error. Try a different phrase.",
  "transport-error":
    "Could not reach the language-model proxy. Is it running?",
  timeout:
    "The provider did not respond in time. Try a different phrase or retry.",
  "malformed-response":
    "The provider's response could not be processed. Try a different phrase.",
  "ceiling-reached":
    "Live-mode call limit reached — reload to reset.",
  "not-configured":
    "Live mode is not configured — turn it on and provide a key to proceed.",
};

function LiveConfigBanner({ message }) {
  return (
    <div className="banner banner--warn" data-testid="live-config-banner">
      <div className="banner__title">Live mode is not active</div>
      <div>{message}</div>
      <div style={{ marginTop: 6 }}>
        Running in fixture-only mode. See{" "}
        <code>specs/190-live-llm-transport/quickstart.md</code> to configure
        live mode.
      </div>
    </div>
  );
}

function LiveTransportBanner({ reason, message, onRetry }) {
  const userMessage = LIVE_BANNER_MESSAGES[reason] ?? message ?? "Live-mode call failed.";
  return (
    <div
      className="banner banner--error"
      data-testid="live-transport-banner"
      data-transport-reason={reason}
    >
      <div className="banner__title">Live-mode call failed</div>
      <div>{userMessage}</div>
      {onRetry && reason !== "ceiling-reached" ? (
        <div style={{ marginTop: 6 }}>
          <button type="button" className="clear-all" onClick={onRetry}>
            Try again
          </button>
        </div>
      ) : null}
    </div>
  );
}

function TransportModeIndicator({ model }) {
  return (
    <span
      className="transport-mode transport-mode--live"
      data-testid="transport-mode-indicator"
      data-mode="live"
    >
      Live · Anthropic · <code>{model}</code>
    </span>
  );
}

function OffCorpusBanner({ phrase, examples, onPick }) {
  return (
    <div className="banner banner--info" data-testid="off-corpus-banner">
      <div className="banner__title">
        Phrase &ldquo;{phrase}&rdquo; isn&apos;t in the demo corpus.
      </div>
      <div>
        This stakeholder demo runs offline against a hand-authored set of
        phrases. The live LLM transport is a separate item (#190). Try one of
        these supported phrases:
      </div>
      <div className="banner__examples">
        {examples.map((example) => (
          <button
            key={example}
            type="button"
            className="banner__example"
            data-testid={`example-${example}`}
            onClick={() => onPick(example)}
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}

function ErrorBanner({ message }) {
  return (
    <div className="banner banner--error" data-testid="error-banner">
      <div className="banner__title">Demo failed to load</div>
      <div>{message}</div>
      <div style={{ marginTop: 6 }}>
        Run <code>pnpm sync-data</code> from <code>apps/nl-demo/</code> and
        reload the page.
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------

function pickExamplePhrases(corpus, count = 5) {
  // Use the corpus's original phrasing (proper case) so the example buttons
  // match the recorded fixtures exactly.
  const phrases = corpus.map((r) => r.phrase);
  if (phrases.length <= count) return phrases;
  return phrases.slice(0, count);
}

/**
 * Build a map of canonicalised → original phrase. The recorded LLM client
 * canonicalises the typed phrase to look up a fixture, but generateCql2
 * builds the prompt using the RAW phrase verbatim — and the prompt-hash
 * recorded in responses.json was computed against the corpus's exact casing.
 *
 * Without this mapping, typing "uk submarines" (lowercase) hits the right
 * fixture key but fails the prompt-hash check. We use corpus.json to recover
 * the exact phrasing the fixtures were recorded against.
 */
function buildCanonicalIndex(corpus) {
  const index = new Map();
  for (const record of corpus) {
    const canonical = canonicalisePhrase(record.phrase);
    index.set(canonical, record.phrase);
  }
  return index;
}

async function loadLiveConfig() {
  let raw;
  try {
    const res = await fetch("./live-config.json", { cache: "no-store" });
    if (res.status === 404) return { state: "absent" };
    if (!res.ok) {
      return {
        state: "error",
        message: `live-config.json HTTP ${res.status}`,
      };
    }
    raw = await res.json();
  } catch (err) {
    // 404 with some servers throws; absent is the expected default, not a
    // warning. Only treat a malformed existing file as an error.
    if (err && typeof err === "object" && "message" in err && /JSON|parse/i.test(String(err.message))) {
      return { state: "error", message: `live-config.json is not valid JSON: ${err.message}` };
    }
    return { state: "absent" };
  }
  const validation = validateLiveConfig(raw);
  if (!validation.ok) {
    const first = validation.errors[0];
    return {
      state: "invalid",
      message: first
        ? `live-config.json → ${first.field}: ${first.message}`
        : "live-config.json is invalid.",
    };
  }
  if (!validation.value.enabled) {
    return { state: "disabled" };
  }
  return { state: "ok", config: validation.value };
}

async function healthCheck(config) {
  const proxyOrigin = new URL(config.proxyUrl).origin;
  const healthUrl = new URL("/health", proxyOrigin).toString();
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 2000);
  try {
    const headers = { Accept: "application/json" };
    if (config.proxyToken) headers["X-Proxy-Token"] = config.proxyToken;
    const res = await fetch(healthUrl, { signal: controller.signal, headers });
    clearTimeout(t);
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    const body = await res.json();
    if (body?.ok !== true) return { ok: false, reason: "health body did not report ok" };
    return { ok: true, body };
  } catch (err) {
    clearTimeout(t);
    return {
      ok: false,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

function App() {
  // ------------------------------------------------------------------------
  // Bootstrap state
  // ------------------------------------------------------------------------
  const [bootState, setBootState] = useState({ kind: "loading-fixtures" });
  const [allItems, setAllItems] = useState([]);
  const [vesselTypeIndex, setVesselTypeIndex] = useState(() => new Map());
  const [responses, setResponses] = useState(null);
  const [enums, setEnums] = useState(null);
  const [canonicalIndex, setCanonicalIndex] = useState(() => new Map());
  const [examplePhrases, setExamplePhrases] = useState([]);

  // Live-mode bootstrap state. Always defined — `mode` drives everything else.
  const [liveMode, setLiveMode] = useState({ mode: "fixture" });

  // ------------------------------------------------------------------------
  // Live UI state
  // ------------------------------------------------------------------------
  const [query, setQuery] = useState("");
  const [chips, setChips] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [filtered, setFiltered] = useState(false);
  const [zeroMatch, setZeroMatch] = useState(false);
  const [offCorpus, setOffCorpus] = useState(null); // { phrase } | null
  const [transportBanner, setTransportBanner] = useState(null); // { reason, message } | null
  const [busy, setBusy] = useState(false);

  // Stale-state guard — track an in-flight token, ignore stale results
  // (Edge case in spec).
  const submissionToken = useRef(0);
  const liveClientRef = useRef(null);

  // ------------------------------------------------------------------------
  // Bootstrap load
  // ------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [catalog, responsesJson, corpusJson, registry, enumBundle] =
          await Promise.all([
            fetchJson("./data/catalog.json"),
            fetchJson("./data/responses.json"),
            fetchJson("./data/corpus.json"),
            fetchJson("./data/platform-registry.json"),
            fetchJson("./data/enum-bundle.json"),
          ]);
        if (cancelled) return;

        const itemLinks = (catalog.links ?? []).filter(
          (l) => l.rel === "item" && typeof l.href === "string",
        );
        const items = await Promise.all(
          itemLinks.map(async (link) => {
            const path = "./data/items/" + link.href.split("/")[1] + ".json";
            const raw = await fetchJson(path);
            return toBrowserItem(raw);
          }),
        );
        if (cancelled) return;

        setAllItems(items);
        setFilteredItems(items);
        setResponses(responsesJson);
        setEnums(enumBundle);
        setVesselTypeIndex(buildVesselTypeIndex(registry));
        setCanonicalIndex(buildCanonicalIndex(corpusJson));
        setExamplePhrases(pickExamplePhrases(corpusJson));

        // #190: probe live-config.json and the proxy before activating live
        // mode. Any failure falls back to fixture mode — offline-by-default.
        const loaded = await loadLiveConfig();
        if (cancelled) return;
        if (loaded.state === "ok") {
          const health = await healthCheck(loaded.config);
          if (cancelled) return;
          if (health.ok) {
            liveClientRef.current = createLiveLLMClient(loaded.config);
            setLiveMode({
              mode: "live",
              config: loaded.config,
              model: health.body?.model ?? loaded.config.model,
            });
          } else {
            liveClientRef.current = null;
            setLiveMode({
              mode: "fixture",
              notice: `Live mode configured but proxy unreachable at ${loaded.config.proxyUrl} — running in fixture mode. Did you start scripts/live-proxy.mjs? (${health.reason})`,
            });
          }
        } else if (loaded.state === "invalid") {
          liveClientRef.current = null;
          setLiveMode({ mode: "fixture", notice: loaded.message });
        } else if (loaded.state === "error") {
          liveClientRef.current = null;
          setLiveMode({ mode: "fixture", notice: loaded.message });
        } else {
          // absent or disabled → silent fixture-mode default (SC-003).
          liveClientRef.current = null;
          setLiveMode({ mode: "fixture" });
        }

        setBootState({ kind: "ready" });
      } catch (err) {
        console.error("[nl-demo] bootstrap failed:", err);
        setBootState({ kind: "fixture-error", message: err.message ?? String(err) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ------------------------------------------------------------------------
  // Memoised LLM client + generate deps (built once after fixtures load)
  //
  // #190 FR-006: when live mode is active, every non-empty phrase routes
  // through the live client (not the recorded/fixture client). If live mode
  // was disabled, misconfigured, or its health check failed at boot, this
  // falls back to the recorded client — matching the #189 baseline.
  // ------------------------------------------------------------------------
  const generateDeps = useMemo(() => {
    if (!responses || !enums) return null;
    const client =
      liveMode.mode === "live" && liveClientRef.current
        ? liveClientRef.current
        : createRecordedLLMClient(responses);
    return { client, enums };
  }, [responses, enums, liveMode]);

  // Pre-compute filter-engine config so descendant expansion (vessel-class
  // hierarchies) works for chip-removal CQL2 evaluation.
  const filterConfig = useMemo(() => {
    if (!enums) return { taxonomy: [] };
    return { taxonomy: vesselClassTreeToTaxonomy(enums.vessel_class_tree) };
  }, [enums]);

  // ------------------------------------------------------------------------
  // Filter helpers
  // ------------------------------------------------------------------------
  const applyCql2 = useCallback(
    (cql2) => {
      if (cql2 === null) {
        setFilteredItems(allItems);
        setFiltered(false);
        setZeroMatch(false);
        return;
      }
      try {
        const result = filterByCql2Json(allItems, cql2, filterConfig);
        setFilteredItems(result);
        setFiltered(true);
        setZeroMatch(result.length === 0);
      } catch (err) {
        console.error("[nl-demo] filter evaluation failed:", err);
        setFilteredItems([]);
        setFiltered(true);
        setZeroMatch(true);
      }
    },
    [allItems, filterConfig],
  );

  const resetUnfiltered = useCallback(() => {
    setChips([]);
    setFilteredItems(allItems);
    setFiltered(false);
    setZeroMatch(false);
    setOffCorpus(null);
  }, [allItems]);

  // ------------------------------------------------------------------------
  // Submit flow (US1 + US2 + US3)
  //
  // Live mode: every submission goes through the live client. Transport
  // failures surface via GenerationResult.error.kind === "transport" (#190
  // FR-008) and render a per-reason banner.
  // Fixture mode: the RecordedLLMClient throws on miss — caught as before
  // and rendered as the off-corpus banner.
  // ------------------------------------------------------------------------
  const submitPhrase = useCallback(
    async (rawPhrase) => {
      if (!generateDeps) return;

      const phrase = (rawPhrase ?? "").trim();

      // FR-013: empty submission resets to unfiltered, no LLM call.
      if (phrase.length === 0) {
        resetUnfiltered();
        return;
      }

      const token = ++submissionToken.current;

      // FR-012: supersede any in-flight live call so earlier chip sets cannot
      // land after a newer phrase is submitted.
      if (liveMode.mode === "live" && liveClientRef.current) {
        liveClientRef.current.abort();
      }

      setBusy(true);
      setOffCorpus(null);
      setTransportBanner(null);

      // In live mode we forward the typed phrase verbatim — there is no
      // fixture to align case with.
      let submitted = phrase;
      if (liveMode.mode !== "live") {
        const canonical = canonicalisePhrase(phrase);
        submitted = canonicalIndex.get(canonical) ?? phrase;
      }

      try {
        const result = await generateCql2(submitted, generateDeps);
        if (submissionToken.current !== token) return; // stale

        if (result.error && result.error.kind === "transport") {
          const { outcome } = result.error;
          // Cancellations are silent by design — the token guard above
          // usually catches them first, but belt-and-braces.
          if (
            outcome.kind === "transport-error" &&
            outcome.reason === "cancelled"
          ) {
            return;
          }
          setTransportBanner({
            reason: outcome.kind,
            message: LIVE_BANNER_MESSAGES[outcome.kind] ?? "Live-mode call failed.",
          });
          return;
        }

        if (result.error && result.error.kind === "generation") {
          // In live mode a malformed JSON response from the provider lands
          // here — surface it as the malformed-response banner variant.
          // In fixture mode this path would have thrown.
          if (liveMode.mode === "live") {
            setTransportBanner({
              reason: "malformed-response",
              message: result.error.error.message,
            });
            return;
          }
          // Fixture mode: treat as off-corpus (graceful fallback).
          setOffCorpus({ phrase });
          return;
        }

        const newChips = result.lozenges.map((seed) =>
          describeChip(seed, vesselTypeIndex),
        );
        setChips(newChips);
        applyCql2(result.cql2);
      } catch (err) {
        if (submissionToken.current !== token) return;
        // RecordedLLMClient throws on corpus miss / hash mismatch — cue for
        // the off-corpus banner (FR-008). The live client never throws on a
        // normal transport failure; if we land here in live mode, something
        // unexpected happened.
        console.warn("[nl-demo] generate failed:", err?.message ?? err);
        if (liveMode.mode === "live") {
          setTransportBanner({
            reason: "transport-error",
            message: err?.message ?? "Live-mode call failed unexpectedly.",
          });
        } else {
          setOffCorpus({ phrase });
        }
      } finally {
        if (submissionToken.current === token) setBusy(false);
      }
    },
    [
      generateDeps,
      vesselTypeIndex,
      canonicalIndex,
      applyCql2,
      resetUnfiltered,
      liveMode,
    ],
  );

  // ------------------------------------------------------------------------
  // Chip removal
  // ------------------------------------------------------------------------
  const removeChip = useCallback(
    (chip) => {
      const remaining = chips.filter((c) => c.id !== chip.id);
      setChips(remaining);
      setOffCorpus(null);
      const cql2 = cql2FromChips(remaining);
      applyCql2(cql2);
    },
    [chips, applyCql2],
  );

  // ------------------------------------------------------------------------
  // Banner example pick
  // ------------------------------------------------------------------------
  const pickExample = useCallback(
    (example) => {
      setQuery(example);
      setOffCorpus(null);
      submitPhrase(example);
    },
    [submitPhrase],
  );

  // ------------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------------
  if (bootState.kind === "loading-fixtures") {
    return (
      <div className="demo-shell">
        <div className="boot-fallback">Loading sample catalog…</div>
      </div>
    );
  }

  if (bootState.kind === "fixture-error") {
    return (
      <div className="demo-shell">
        <ErrorBanner message={bootState.message} />
      </div>
    );
  }

  const total = allItems.length;
  const shown = filtered ? filteredItems.length : total;

  const isLive = liveMode.mode === "live";
  const subtitle = isLive
    ? "Demo: live LLM transport"
    : "Demo: hand-authored corpus, no live LLM";

  return (
    <div className="demo-shell">
      <header className="demo-header">
        <h1>Debrief — NL Catalog Search</h1>
        <span className="subtitle">{subtitle}</span>
        {isLive ? (
          <TransportModeIndicator model={liveMode.model ?? liveMode.config.model} />
        ) : null}
      </header>

      {!isLive && liveMode.notice ? (
        <LiveConfigBanner message={liveMode.notice} />
      ) : null}

      <QueryBar
        value={query}
        onChange={setQuery}
        onSubmit={submitPhrase}
        disabled={!generateDeps}
        busy={busy}
      />

      {transportBanner ? (
        <LiveTransportBanner
          reason={transportBanner.reason}
          message={transportBanner.message}
          onRetry={() => {
            setTransportBanner(null);
            if (query.trim().length > 0) submitPhrase(query);
          }}
        />
      ) : null}

      {offCorpus ? (
        <OffCorpusBanner
          phrase={offCorpus.phrase}
          examples={examplePhrases}
          onPick={pickExample}
        />
      ) : null}

      <ChipBar chips={chips} onRemoveChip={removeChip} onClearAll={resetUnfiltered} />

      <ResultsCount shown={shown} total={total} filtered={filtered} />

      {zeroMatch ? (
        <EmptyState onClearAll={resetUnfiltered} />
      ) : (
        <CardGrid items={filteredItems} registry={{ vesselTypeIndex }} chips={chips} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mount
// ---------------------------------------------------------------------------

const root = createRoot(document.getElementById("app"));
root.render(<App />);
