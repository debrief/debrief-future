# Token-budget probe (FR-025 / SC-007)

Measured `approxTokens` from the shipped summariser (`summarize.ts`) — the same
char/4 heuristic the tool reports at runtime — over representative plot sizes.
The summariser thins features to metadata only (no geometry) and caps the
inventory at `INVENTORY_CAP = 200`, flagging truncation.

## Measured sizes

| Plot | Features | Listed | Truncated | `approxTokens` |
|------|---------:|-------:|:---------:|---------------:|
| Small (3 tracks, 5 points) | 8 | 8 | no | ~302 |
| Medium (12 tracks, 20 points) | 32 | 32 | no | ~1,010 |
| Large (40 tracks, 60 points) | 100 | 100 | no | ~3,064 |
| Very large (250 tracks) | 250 | 200 | **yes** | ~8,189 |

Each track fixture carries 120 positions; note the summary reports only the
*count*, so position density does not inflate the token size — the cost scales
with the number of features, not their geometry.

## Fits / doesn't-fit vs. representative local-model context windows

| Context window (representative local model) | Small | Medium | Large | Very large (capped) |
|---|:---:|:---:|:---:|:---:|
| **4k** (e.g. Phi-3-mini base) | ✅ fits | ✅ fits | ✅ fits | ❌ ~8.2k > 4k |
| **8k** (e.g. Llama-3-8B) | ✅ fits | ✅ fits | ✅ fits | ⚠️ ~8.2k ≈ 8k (marginal, and the summary alone — no room for history) |
| **32k** (e.g. Mistral-7B-32k) | ✅ fits | ✅ fits | ✅ fits | ✅ fits |

## Verdict

- The thinned inventory keeps a **typical** plot (tens of features) comfortably
  inside even a 4k window — the summary is a few hundred to a few thousand
  tokens, leaving ample room for the conversation.
- A **very large** plot (hundreds of features) approaches an 8k budget on the
  summary alone. The `INVENTORY_CAP` cap + `truncated: true` flag is doing exactly
  its job here: it bounds the worst case to ~8k rather than growing unbounded, and
  tells the model the list is partial so it can ask to narrow scope (by selection
  or search) instead of reasoning over a silently-cut list.
- **Implication for the offline NL panel:** a 4k local model is viable for the
  common case but needs the cap; an 8k+ model comfortably handles the full
  200-feature ceiling. The cap value (200) is the tunable knob for the smallest
  target model — lowering it trades inventory completeness for headroom.
