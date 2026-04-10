Shipped: Sensor Schema Overhaul for Future Debrief

Just completed Phase 1 of the Sensor Data Pipeline epic — a full redesign of the sensor data model in our maritime tactical analysis platform.

What we delivered:
- 4 new enumerations for bearing line styling and array centre modes
- 15 new fields across SensorContact and SensorData (display properties, presence flags, coordinate overrides)
- MeasuredArrayPosition class for towed array position tracking
- 60+ tool fixture files updated across 9 sensor analysis tools
- 1533 tests passing with zero failures

Key design decisions:
- Boolean presence flags control display, not data presence (matching legacy behavior)
- Color inheritance: contacts inherit from parent sensor when null
- All fields optional — zero breaking changes to existing data

This schema is the foundation for sensor import, rendering, array offset calculations, and TMA analysis in subsequent phases.

Built with LinkML schemas generating Pydantic (Python), TypeScript interfaces, and JSON Schema from a single source of truth.

#MaritimeAnalysis #SchemaDesign #DataModeling #Python #TypeScript #FutureDebrief
