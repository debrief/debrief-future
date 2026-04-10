Our sensor schema currently captures 12 fields across SensorContact and SensorData. Legacy Debrief uses 26, plus 4 enumerations and a measured array position class. That gap means display customizations vanish on save, towed array bearing lines originate from the wrong position, and there's no way to distinguish "no bearing data" from "bearing is zero."

This week we're closing that gap — expanding the schema to capture the full legacy sensor data model. Phase 1 of a 7-phase sensor pipeline, and the foundation everything else builds on. All changes are additive, zero breaking changes, 62 fixture files updated.

The interesting design question: should display properties (color, line style, label placement) live in the data schema or in a separate rendering layer? We chose schema-level, matching how legacy persists them. Trade-offs worth discussing.

[Read the full planning post](https://debrief.github.io/blog/planning-sensor-schema-overhaul)

#FutureDebrief #MaritimeAnalysis #OpenSource
