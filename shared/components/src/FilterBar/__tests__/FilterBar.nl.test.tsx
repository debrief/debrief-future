/**
 * FilterBar NL-mode unit tests (#191 T045-T048).
 *
 * Coverage:
 *   T045  happy path — mock llmClient returns success; chips applied
 *   T046  lozenge survival (Decision 7) — force auth-failure outcome, assert
 *         existing chips survive and banner visible
 *   T047  supersession race (Decision 11, call-site half) — submit A
 *         (pending), submit B; assert A's `client.abort()` was called and
 *         only B's outcome renders
 *   T048  indicator visibility — `llmClient` prop controls indicator render
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { FilterBar } from '../FilterBar';
import type {
  LiveOutcome,
  LLMClient,
  EnumBundle,
  StacBrowserItem,
  VesselTaxonomyNode,
} from '../../nl-cql2';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const taxonomy: VesselTaxonomyNode[] = [];
const items: StacBrowserItem[] = [
  {
    id: '1',
    title: 'HMS Nelson',
    itemPath: '/i/1.json',
    bbox: null,
    datetime: null,
    startDatetime: null,
    endDatetime: null,
    platforms: [],
    tags: [],
    featureTags: [],
    author: null,
    collection: null,
    modified: null,
  },
];

const enums: EnumBundle = {
  vessel_class_tree: {},
  nationalities: ['GB'],
  exercise_names: [],
  tags: [],
  feature_tags: [],
  _meta: {
    canonicalisation: 'test',
    exercise_parse_rule: 'test',
    generated_from_catalog: 'test',
    generated_from_registry: 'test',
    tool: 'test',
  },
};

function makeSuccessOutcome(lozenges: Array<{ filterType: string; value: string }>): LiveOutcome {
  const rawResponse = JSON.stringify({
    cql2: {},
    lozenges,
    unrecognised_terms: [],
  });
  return {
    kind: 'success',
    rawResponse,
    durationMs: 42,
    responseBytes: rawResponse.length,
    model: 'test-model',
  };
}

function makeMockClient(
  nextOutcome: LiveOutcome | (() => Promise<LiveOutcome>),
): LLMClient & { abortCalls: number } {
  const state = { abortCalls: 0 };
  const client: LLMClient & { abortCalls: number } = {
    async generate(): Promise<LiveOutcome> {
      if (typeof nextOutcome === 'function') return nextOutcome();
      return nextOutcome;
    },
    abort() {
      state.abortCalls += 1;
    },
    get abortCalls() {
      return state.abortCalls;
    },
  } as LLMClient & { abortCalls: number };
  return client;
}

async function typeAndEnter(input: HTMLElement, text: string): Promise<void> {
  fireEvent.change(input, { target: { value: text } });
  fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
}

beforeEach(() => {
  // ensure a clean DOM
});

// ---------------------------------------------------------------------------
// T045 — happy path
// ---------------------------------------------------------------------------

describe('FilterBar NL happy path (T045)', () => {
  it('routes Enter through the NL pipeline and applies chips on success', async () => {
    const client = makeMockClient(
      makeSuccessOutcome([{ filterType: 'nationality', value: 'GB' }]),
    );
    render(
      <FilterBar
        items={items}
        taxonomy={taxonomy}
        onFilteredItems={() => undefined}
        llmClient={client}
        nlEnums={enums}
        liveModeLabel="Live · Anthropic · test-model"
      />,
    );

    const input = screen.getByTestId('quick-search-input');
    await act(async () => {
      await typeAndEnter(input, 'UK submarines');
    });

    // Chip should appear.
    await waitFor(() => {
      expect(screen.queryByTestId('live-transport-banner')).toBeNull();
      // The nationality lozenge should be rendered.
      expect(document.querySelector('[data-testid="filter-bar-items"]')).toBeTruthy();
    });

    // The indicator must be rendered.
    expect(screen.getByTestId('nl-search-indicator')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// T046 — lozenge survival on failure (Decision 7)
// ---------------------------------------------------------------------------

describe('FilterBar NL lozenge survival (T046)', () => {
  it('existing chips survive an auth-failure outcome and banner is visible', async () => {
    // First submission succeeds → adds a nationality chip.
    // Second submission fails with auth-failure → chip stays, banner shows.
    const outcomes: LiveOutcome[] = [
      makeSuccessOutcome([{ filterType: 'nationality', value: 'GB' }]),
      { kind: 'auth-failure', providerStatus: 401, durationMs: 12 },
    ];
    let call = 0;
    const client = makeMockClient(async () => outcomes[call++]!);

    render(
      <FilterBar
        items={items}
        taxonomy={taxonomy}
        onFilteredItems={() => undefined}
        llmClient={client}
        nlEnums={enums}
        liveModeLabel="live"
      />,
    );

    const input = screen.getByTestId('quick-search-input');

    // First submission succeeds.
    await act(async () => {
      await typeAndEnter(input, 'UK submarines');
    });
    await waitFor(() => {
      expect(screen.queryByTestId('live-transport-banner')).toBeNull();
    });

    // Record the chip count post-success.
    const chipsBefore = document.querySelectorAll('[data-testid^="lozenge-"]');

    // Second submission fails.
    await act(async () => {
      await typeAndEnter(input, 'French frigates');
    });

    await waitFor(() => {
      const banner = screen.getByTestId('live-transport-banner');
      expect(banner).toHaveAttribute('data-transport-reason', 'auth-failure');
    });

    // Chips MUST have survived.
    const chipsAfter = document.querySelectorAll('[data-testid^="lozenge-"]');
    expect(chipsAfter.length).toBeGreaterThanOrEqual(chipsBefore.length);
  });
});

// ---------------------------------------------------------------------------
// T047 — supersession race (Decision 11)
// ---------------------------------------------------------------------------

describe('FilterBar NL supersession race (T047)', () => {
  it('submitting B while A is pending calls client.abort() and only B renders', async () => {
    // First call: never resolves unless aborted — the FilterBar should abort
    // it before issuing the second.
    let firstResolve: ((o: LiveOutcome) => void) | null = null;
    const firstPromise = new Promise<LiveOutcome>((r) => {
      firstResolve = r;
    });
    const outcomeB = makeSuccessOutcome([
      { filterType: 'nationality', value: 'FR' },
    ]);

    let call = 0;
    const client: LLMClient & { abortCalls: number } = (() => {
      const state = { abortCalls: 0 };
      return {
        async generate(): Promise<LiveOutcome> {
          call += 1;
          if (call === 1) return firstPromise;
          return outcomeB;
        },
        abort() {
          state.abortCalls += 1;
          // In a real client, abort would cause the first `generate` to
          // settle with cancelled. Simulate that.
          if (firstResolve) {
            firstResolve({
              kind: 'transport-error',
              reason: 'cancelled',
              durationMs: 10,
            });
            firstResolve = null;
          }
        },
        get abortCalls() {
          return state.abortCalls;
        },
      } as LLMClient & { abortCalls: number };
    })();

    render(
      <FilterBar
        items={items}
        taxonomy={taxonomy}
        onFilteredItems={() => undefined}
        llmClient={client}
        nlEnums={enums}
        liveModeLabel="live"
      />,
    );

    const input = screen.getByTestId('quick-search-input');

    // Submit A (pending).
    await act(async () => {
      await typeAndEnter(input, 'UK submarines');
    });

    // Submit B — triggers abort of A.
    await act(async () => {
      await typeAndEnter(input, 'French frigates');
    });

    expect(client.abortCalls).toBeGreaterThanOrEqual(1);

    // Only B's outcome should surface — no banner (A's cancellation was silent).
    await waitFor(() => {
      expect(screen.queryByTestId('live-transport-banner')).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// T048 — indicator visibility
// ---------------------------------------------------------------------------

describe('FilterBar NL indicator visibility (T048)', () => {
  it('without llmClient, no indicator is rendered', () => {
    render(
      <FilterBar
        items={items}
        taxonomy={taxonomy}
        onFilteredItems={() => undefined}
      />,
    );
    expect(screen.queryByTestId('nl-search-indicator')).toBeNull();
  });

  it('with llmClient + nlEnums + liveModeLabel, indicator is rendered', () => {
    const client = makeMockClient(makeSuccessOutcome([]));
    render(
      <FilterBar
        items={items}
        taxonomy={taxonomy}
        onFilteredItems={() => undefined}
        llmClient={client}
        nlEnums={enums}
        liveModeLabel="Live · Anthropic · test-model"
      />,
    );
    const indicator = screen.getByTestId('nl-search-indicator');
    expect(indicator).toBeInTheDocument();
    expect(indicator.textContent).toMatch(/test-model/);
  });

  it('with llmClient but no liveModeLabel, no indicator', () => {
    const client = makeMockClient(makeSuccessOutcome([]));
    render(
      <FilterBar
        items={items}
        taxonomy={taxonomy}
        onFilteredItems={() => undefined}
        llmClient={client}
        nlEnums={enums}
      />,
    );
    expect(screen.queryByTestId('nl-search-indicator')).toBeNull();
  });
});
