Today, if a filter surfaces the wrong plots from the STAC catalog, an analyst has to close Debrief, open `item.json` in a text editor, and fix the metadata by hand. That's the failure mode the Properties Panel closes.

We're planning a context-sensitive editor at two surfaces: a 4th section in the ActivityPanel (edits stage with the open plot and flush on save) and a stacked area under the thumbnail in StacBrowser (writes `item.json` directly when no plot is open). Same form component, same field set, two persistence paths.

The form is driven from the LinkML-generated JSON Schema — add a new field in LinkML and an input appears on the next build with zero panel-component change. Every save records provenance. Overrides are tracked on the item so auto-derivation can't silently stomp an analyst's edit.

Three decisions we'd like pushback on before code starts — stacked panel vs a new layout slot, whether "revert to auto-derived" is a glaring v1 omission, and whether item-level overrides will hold up when per-feature editing lands.

Full post: [link]

#FutureDebrief #MaritimeAnalysis #OpenSource
