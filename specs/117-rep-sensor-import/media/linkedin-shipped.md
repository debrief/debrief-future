REP sensor import is done. SENSOR v1/v2/v3 and SENSORARC lines now parse cleanly and embed into host tracks rather than floating as disconnected annotation features.

The tricky part wasn't the parsing — it was the data model. Sensor contacts in a REP file reference a host track by name, but tracks and sensor lines can appear in any order. The parser collects sensor contacts into `pending_sensor_data`, keyed by track name, so the caller assembles the complete picture once all lines are read. No standalone SENSOR features in the output. Ninety tests, zero failures, including a 10,000-line mixed-format benchmark that parses well under a second.

NULL bearings turned out to be the most interesting edge case. Passive sonar sometimes logs frequency without a bearing fix — frequency-only contacts that matter for Doppler analysis but look like malformed data if you're not expecting them. The parser preserves them with `has_bearing=false` rather than discarding. Zero bearing versus no bearing is a real distinction.

Next: #118 brings these contacts onto the map — bearing lines, coverage arcs, snail mode.

https://debrief.github.io/debrief-future/blog/shipped-rep-sensor-import

#maritimeanalysis #opensource #debrief
