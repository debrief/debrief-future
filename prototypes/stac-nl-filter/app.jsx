/* STAC Catalog NL Filter — Discovery PoC
 *
 * Single-page React app that lets analysts discover plots via natural
 * language queries. The LLM interprets the query against an embedded
 * catalog reference and returns chips + matching plot IDs.
 */

const { useState, useEffect, useCallback, useMemo } = React;

// ===== Storage wrapper (fire-and-forget, silently swallow errors) =====
// Matches SRD §5 spec. Uses window.localStorage as the underlying store.
const storage = {
  get(key) {
    try { return window.localStorage.getItem(key); } catch { return null; }
  },
  set(key, value) {
    try { window.localStorage.setItem(key, value); } catch { /* ignore */ }
  },
  remove(key) {
    try { window.localStorage.removeItem(key); } catch { /* ignore */ }
  },
};

const STORAGE_KEYS = {
  lastQuery: 'filters:last_query',
  lastResults: 'filters:last_results',
  lastChips: 'filters:last_chips',
  history: 'filters:history',
  apiKey: 'filters:api_key',
};

// ===== Catalog helpers =====
const ITEMS_BY_ID = Object.fromEntries(
  window.CATALOG_FULL.map(item => [item.id, item])
);

const TOTAL_ITEMS = window.CATALOG_FULL.length;

// ===== Shared library (buildSystemPrompt + extractJson) =====
// Lives in lib.js so test-harness.mjs can load it too. See index.html.
const { buildSystemPrompt, extractJson } = window.NLFilterLib;

// ===== Year helpers =====
function getYear(item) {
  const dt = item.start_datetime || item.datetime || item.end_datetime;
  if (!dt) return null;
  const y = parseInt(dt.slice(0, 4), 10);
  return Number.isFinite(y) ? y : null;
}

// ===== Components =====

function ApiKeyBar({ apiKey, setApiKey }) {
  const [value, setValue] = useState(apiKey);
  const saved = Boolean(apiKey);

  const handleSave = () => {
    setApiKey(value);
    storage.set(STORAGE_KEYS.apiKey, value);
  };

  const handleClear = () => {
    setValue('');
    setApiKey('');
    storage.remove(STORAGE_KEYS.apiKey);
  };

  return (
    <div className={'api-key-bar' + (saved ? ' saved' : '')}>
      <label>Anthropic API key:</label>
      <input
        type="password"
        placeholder="sk-ant-…"
        value={value}
        onChange={e => setValue(e.target.value)}
      />
      {saved
        ? <button className="clear-all" onClick={handleClear}>Clear</button>
        : <button className="clear-all" onClick={handleSave} disabled={!value}>Save</button>
      }
    </div>
  );
}

function QueryBar({ query, setQuery, onSearch, loading, disabled }) {
  const handleKey = (e) => {
    if (e.key === 'Enter' && !loading && !disabled) onSearch();
  };
  return (
    <div className="query-bar">
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={handleKey}
        placeholder="e.g. NATO ASW exercises in the North Atlantic after 2010 with Astute-class submarines"
        disabled={loading}
      />
      <button onClick={onSearch} disabled={loading || disabled || !query.trim()}>
        {loading ? 'Searching…' : 'Search'}
      </button>
    </div>
  );
}

function RecentSearches({ history, onPick }) {
  if (history.length === 0) return null;
  return (
    <div className="recent-bar">
      <span>Recent:</span>
      <select
        value=""
        onChange={e => { if (e.target.value) onPick(e.target.value); }}
      >
        <option value="">— pick a recent search —</option>
        {history.map((q, i) => (
          <option key={i} value={q}>{q}</option>
        ))}
      </select>
    </div>
  );
}

function StatusLine({ loading, error }) {
  if (loading) {
    return (
      <div className="status-line">
        <div className="spinner" />
        <span>Searching…</span>
      </div>
    );
  }
  if (error) {
    return <div className="status-line error">Error: {error}</div>;
  }
  return <div className="status-line" />;
}

function ChipsBar({ chips, onClear }) {
  const items = [];
  if (chips.nationality) {
    chips.nationality.forEach((v, i) => items.push({ type: 'nationality', label: 'nationality', value: v, key: `n-${i}` }));
  }
  if (chips.vesselType) {
    chips.vesselType.forEach((v, i) => items.push({ type: 'vesselType', label: 'vessel', value: v, key: `v-${i}` }));
  }
  if (chips.exercise) {
    chips.exercise.forEach((v, i) => items.push({ type: 'exercise', label: 'exercise', value: v, key: `e-${i}` }));
  }
  if (chips.tag) {
    chips.tag.forEach((v, i) => items.push({ type: 'tag', label: 'tag', value: v, key: `t-${i}` }));
  }
  if (chips.year) {
    const { from, to } = chips.year;
    const label = from === to ? `${from}` : `${from ?? '…'}–${to ?? '…'}`;
    items.push({ type: 'year', label: 'year', value: label, key: 'y' });
  }

  if (items.length === 0) return null;

  return (
    <div className="chips-bar">
      {items.map(c => (
        <span key={c.key} className={`chip chip-${c.type}`}>
          <span className="chip-label">{c.label}:</span>{c.value}
        </span>
      ))}
      <button className="clear-all" onClick={onClear}>Clear all</button>
    </div>
  );
}

function truncate(s, n) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s;
}

function leafClass(path) {
  const parts = path.split('/');
  return parts[parts.length - 1];
}

function Card({ item }) {
  const year = getYear(item);
  const nationalities = item['debrief:nationalities'] || [];
  const vessels = (item['debrief:vessel_classes'] || []).map(leafClass);
  const uniqueVessels = [...new Set(vessels)];
  const tags = (item['debrief:tags'] || []).slice(0, 3);

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">{item.title}</div>
        {year && <div className="card-year">{year}</div>}
      </div>
      <div className="card-desc">{truncate(item.description, 110)}</div>
      <div className="card-badges">
        {nationalities.map(n => (
          <span key={`n-${n}`} className="badge badge-nationality">{n}</span>
        ))}
        {uniqueVessels.map(v => (
          <span key={`v-${v}`} className="badge badge-vessel">{v}</span>
        ))}
        {tags.map(t => (
          <span key={`t-${t}`} className="badge badge-tag">{t}</span>
        ))}
      </div>
    </div>
  );
}

function CardGrid({ results, query }) {
  if (results.length === 0) {
    return (
      <div className="empty-state">
        <div className="icon">🔍</div>
        <div>No plots matched your query.</div>
        {query && (
          <div className="hint">Try rephrasing — e.g. mention a nationality, vessel type, tag, or time range.</div>
        )}
      </div>
    );
  }
  return (
    <div className="card-grid">
      {results.map(item => <Card key={item.id} item={item} />)}
    </div>
  );
}

// ===== Main App =====
function App() {
  const [apiKey, setApiKey] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [chips, setChips] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [isFiltered, setIsFiltered] = useState(false);

  // Restore from storage on mount
  useEffect(() => {
    try {
      const raw = storage.get(STORAGE_KEYS.lastQuery);
      if (raw) setQuery(decodeURIComponent(raw));
    } catch { /* ignore */ }
    try {
      const raw = storage.get(STORAGE_KEYS.lastResults);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setResults(parsed);
          setIsFiltered(true);
        }
      }
    } catch { /* ignore */ }
    try {
      const raw = storage.get(STORAGE_KEYS.lastChips);
      if (raw) setChips(JSON.parse(raw));
    } catch { /* ignore */ }
    try {
      const raw = storage.get(STORAGE_KEYS.history);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setHistory(parsed);
      }
    } catch { /* ignore */ }
    try {
      const key = storage.get(STORAGE_KEYS.apiKey);
      if (key) setApiKey(key);
    } catch { /* ignore */ }
  }, []);

  const handleSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    if (!apiKey) {
      setError('Please enter an Anthropic API key above.');
      return;
    }

    // Clear results immediately (visual feedback per SRD §3.1)
    setResults([]);
    setChips({});
    setIsFiltered(false);
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 800,
          system: buildSystemPrompt(window.CATALOG_COMPACT, TOTAL_ITEMS),
          messages: [{ role: 'user', content: trimmed }],
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`API ${response.status}: ${text.slice(0, 200)}`);
      }

      const data = await response.json();
      const textBlock = (data.content || []).find(b => b.type === 'text');
      if (!textBlock) throw new Error('Response had no text content');

      const jsonText = extractJson(textBlock.text);
      let parsed;
      try {
        parsed = JSON.parse(jsonText);
      } catch (parseErr) {
        throw new Error(`Failed to parse response as JSON: ${parseErr.message}`);
      }

      const ids = Array.isArray(parsed.ids) ? parsed.ids : [];
      const matched = ids.map(id => ITEMS_BY_ID[id]).filter(Boolean);
      const nextChips = parsed.chips || {};

      setResults(matched);
      setChips(nextChips);
      setIsFiltered(true);

      // Update history
      const nextHistory = [trimmed, ...history.filter(h => h !== trimmed)].slice(0, 10);
      setHistory(nextHistory);

      // Persist (fire-and-forget)
      storage.set(STORAGE_KEYS.lastQuery, encodeURIComponent(trimmed));
      storage.set(STORAGE_KEYS.lastResults, JSON.stringify(matched));
      storage.set(STORAGE_KEYS.lastChips, JSON.stringify(nextChips));
      storage.set(STORAGE_KEYS.history, JSON.stringify(nextHistory));
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [query, apiKey, history]);

  const handleClearChips = useCallback(() => {
    setChips({});
    setResults([]);
    setIsFiltered(false);
    storage.remove(STORAGE_KEYS.lastResults);
    storage.remove(STORAGE_KEYS.lastChips);
  }, []);

  const displayed = isFiltered ? results : window.CATALOG_FULL;
  const countLabel = isFiltered
    ? `${displayed.length} of ${TOTAL_ITEMS} plots`
    : `${TOTAL_ITEMS} plots`;

  return (
    <div>
      <div className="header">
        <h1>STAC Catalog Browser</h1>
        <div className="subtitle">Natural language filter · {TOTAL_ITEMS} plots</div>
      </div>

      <ApiKeyBar apiKey={apiKey} setApiKey={setApiKey} />

      <QueryBar
        query={query}
        setQuery={setQuery}
        onSearch={handleSearch}
        loading={loading}
        disabled={!apiKey}
      />

      <RecentSearches history={history} onPick={setQuery} />

      <StatusLine loading={loading} error={error} />

      {!loading && isFiltered && <ChipsBar chips={chips} onClear={handleClearChips} />}

      <div className="results-count">{countLabel}</div>

      {!loading && <CardGrid results={displayed} query={isFiltered ? query : ''} />}
    </div>
  );
}

// ===== Mount =====
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
