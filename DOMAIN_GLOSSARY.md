# Domain Glossary

Maritime tactical analysis terminology for Future Debrief. This glossary defines the domain concepts used throughout the codebase and documentation.

> **Note**: Adapted from the [legacy Debrief glossary](https://github.com/debrief/debrief/blob/develop/DOMAIN_GLOSSARY.md), focusing on domain concepts rather than implementation details.

---

## Core Concepts

### Fix

A single timestamped position report containing:
- **Time** — when the observation was made (microsecond precision)
- **Location** — geographic coordinates (latitude, longitude, depth)
- **Course** — direction of travel
- **Speed** — rate of movement

Fixes are the atomic unit of positional data in Debrief.

### Track

The complete historical movement record of a vessel, composed of sequential fixes. A track includes:
- Ordered collection of fixes
- Display attributes (color, symbol, label)
- Associated sensors
- TMA solutions (if applicable)

### Track Segment

A logical grouping of consecutive fixes within a track. Segments allow tracks to be subdivided for analysis or to represent different data sources/qualities. Common segment types include:
- **Core segment** — observed positional data
- **TMA segment** — reconstructed target motion from sensor observations
- **Planning segment** — projected future movement
- **Infill segment** — interpolated positions between known fixes

### Sensor

A shipboard observation device (sonar, radar, visual) that generates observations of other vessels. Sensors maintain:
- Collections of contacts/cuts
- Display properties
- Sensor-specific parameters (e.g., frequency for acoustic sensors)

### Contact (Cut)

A single measurement from an ownship sensor—typically bearing and/or range to a target vessel. A contact contains:
- **Timestamp** — when the observation was made
- **Bearing** — direction to target (may include ambiguous bearing)
- **Range** — distance to target (if available)
- **Frequency** — acoustic frequency data (for sonar)

The term "cut" is often used interchangeably with "contact" in TMA analysis.

### Bearing

The direction from one point to another, measured as an angle from north. Types include:
- **True bearing** — measured from true north
- **Relative bearing** — measured from ownship heading
- **Ambiguous bearing** — passive sonar's 180° alternate solution (sonar cannot distinguish which side a contact is on)

### Plot

A collection of tracks and associated data representing a tactical scenario or exercise. In Future Debrief, plots are stored as STAC Items with GeoJSON payloads.

---

## Target Motion Analysis (TMA)

### TMA

Target Motion Analysis — the analytical process of estimating a target vessel's course and speed based on ownship sensor observations (typically bearing-only from passive sonar).

TMA relies on ownship maneuvers to resolve ambiguity: by changing ownship course/speed across multiple legs, the geometry changes enough to triangulate target motion.

### Leg

A period of time during which certain conditions remain consistent. Types include:
- **Ownship leg** — period of steady ownship course and speed
- **Bearing leg** — period of consistent bearing rate (requires minimum observations for valid TMA)

Leg boundaries are significant for TMA because each leg provides different geometric perspectives on the target.

### SATC (Semi-Automatic Track Construction)

An automated process for generating TMA solutions from sensor observation data. SATC uses optimization algorithms to transform:
- Ownship positions over time
- Bearing observations to target

Into a reconstructed target track with estimated course and speed.

### Planning Segment

A projected vessel route defined by intended (rather than observed) parameters:
- **Course** — intended direction
- **Speed** — intended rate of travel
- **Distance** or **Duration** — extent of the segment

Planning segments support "what-if" analysis and mission planning.

---

## Data Types

### World Location

A 3D geographic position:
- **Latitude** — -90° (South) to +90° (North)
- **Longitude** — -180° (West) to +180° (East)
- **Depth** — positive values indicate underwater depth; negative values indicate altitude

### World Speed

Speed with support for multiple units:
- Knots (nautical miles per hour)
- Metres per second
- Kilometres per hour
- Feet per second

### World Distance

Distance with support for multiple units:
- Nautical miles
- Metres / kilometres
- Yards / feet

### World Vector

A combination of bearing and distance representing direction and magnitude from one point to another.

### High-Resolution Date

A timestamp with microsecond precision, essential for:
- Timeline synchronization across multiple tracks
- Precise fix ordering
- Temporal queries and filtering

---

## Coordinate Conventions

### Bearing Reference

| Direction | Degrees | Radians |
|-----------|---------|---------|
| North | 0° | 0 |
| East | 90° | π/2 |
| South | 180° | π |
| West | 270° | 3π/2 |

### Geographic Coordinates

- **Latitude**: Positive = North, Negative = South
- **Longitude**: Positive = East, Negative = West
- **Depth**: Positive = below surface, Negative = above surface

---

## Historical Context

Debrief's design reflects its origins in submarine tactical analysis:

- **Bearing-only TMA** assumes known ownship position with unknown target position, observable only through passive sonar bearing (and sometimes frequency). This predates widespread GPS availability.

- **Yards and radians** as internal units reflect historical naval conventions, though modern interfaces typically display knots, nautical miles, and degrees.

- **Ambiguous bearings** exist because passive sonar cannot determine which side of the array a sound originates from, producing two possible bearings 180° apart.

---

## See Also

- [ARCHITECTURE.md](./ARCHITECTURE.md) — Technical design decisions
- [VISION.md](./VISION.md) — Strategic context for Future Debrief
- [CONSTITUTION.md](./CONSTITUTION.md) — Development principles
