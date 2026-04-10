Legacy Debrief REP files carry four different sensor line formats -- bearing contacts, ambiguous bearings, frequency observations, and coverage arcs. Until now, our parser treated them as disconnected annotation features. That's about to change.

We're building the REP sensor import pipeline for Future Debrief. Sensor contacts will be parsed and embedded directly into host track features, grouped by sensor name and ordered by time. A single track feature will carry its complete sensor history -- towed array bearings, hull sonar contacts, frequency-only passive observations -- all conforming to the schema we designed in Phase 1 of the sensor data pipeline.

The interesting wrinkle: NULL bearings. Passive sonar sometimes records frequency without a bearing fix. These frequency-only contacts are critical for downstream Doppler analysis, so the parser preserves them with a `has_bearing=false` flag rather than discarding them.

Next up after this: rendering those bearing lines on the map.

https://debrief.github.io/debrief-future/blog/planning-rep-sensor-import

#maritimeanalysis #opensource #debrief
