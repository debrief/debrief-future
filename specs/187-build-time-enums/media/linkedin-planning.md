Stop sending the LLM the whole catalog. Send it the words.

The natural-language search prototype for Future Debrief works by stuffing a 70-item STAC catalog into the LLM prompt. That trick stops working at 700 items and is unaffordable at 7000. So the next planning item builds the smallest possible bridge: a script that walks the platform registry plus the regenerated sample catalog and emits one compact JSON file — vessel-class taxonomy, nationality codes, exercise names, plot tags, feature tags. Everything an analyst might mention, none of the operational data they're searching across.

The LLM reads that bundle, writes a CQL2 filter, and the existing client-side filter engine evaluates it locally. The catalog never crosses the network.

We're committing the generated bundle to the repo, so every PR that touches the registry shows reviewers the diff the LLM will actually see. That review surface matters — what's in the bundle is what the LLM thinks the world contains.

Read the planning post: [link]

#FutureDebrief #MaritimeAnalysis #OpenSource
