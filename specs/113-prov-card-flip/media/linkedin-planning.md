Every parameter tweak in our maritime analysis tool currently opens a separate dialog. You leave the provenance timeline, adjust a value in isolation, confirm, and reconnect with where you were. It works, but the context switch adds up.

We're replacing that with a flip-card interaction on the Log Panel. Each provenance entry card gets a pencil icon. Click it, the card flips via CSS 3D transform to reveal type-aware controls on the back face — sliders for bounded numerics, dropdowns for enums, toggles for booleans, colour pickers. Change a value and the tool re-executes live. The map updates. No dialog.

The edit face also exposes disable (skip this step during replay, keep it in the timeline) and delete (soft-remove behind a confirmation prompt), plus a rationale field for analyst notes. Schema-driven controls load lazily on first flip and cache for the session. No new dependencies — pure CSS animation, existing component extensions.

The question we're sitting with: is a pencil icon discoverable enough as the sole flip trigger, or does it need a secondary affordance?

Full planning post: [LINK]

#FutureDebrief #MaritimeAnalysis #ProvenanceLogging
