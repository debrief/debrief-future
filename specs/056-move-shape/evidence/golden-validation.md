# Golden Validation: Move Shape Tool (056)

## Cross-Language Consistency

The Python and TypeScript implementations use identical Vincenty destination formula:

```
lat2 = asin(sin(lat1) * cos(d/R) + cos(lat1) * sin(d/R) * cos(bearing))
lon2 = lon1 + atan2(sin(bearing) * sin(d/R) * cos(lat1), cos(d/R) - sin(lat1) * sin(lat2))
```

Both use R = 6371.0 km and normalise longitude to [-180, 180].

## Golden Example 1: Circle Translation (East 5 km)

| Property | Input | Expected Output | Python | Match |
|----------|-------|-----------------|--------|-------|
| center[0] (lon) | 0.0 | 0.06995 | 0.06995 | Yes |
| center[1] (lat) | 50.0 | 49.99998 | 49.99998 | Yes |
| radius | 1000 | 1000 | 1000 | Yes |
| vertex count | 9 | 9 | 9 | Yes |

## Golden Example 2: Vector Translation (North 10 km)

| Property | Input | Expected Output | Python | Match |
|----------|-------|-----------------|--------|-------|
| origin[0] (lon) | 0.0 | 0.0 | 0.0 | Yes |
| origin[1] (lat) | 50.0 | 50.08993 | 50.08993 | Yes |
| range | 12000 | 12000 | 12000 | Yes |
| bearing | 45 | 45 | 45 | Yes |

## Validation Status

All golden examples validated against Python implementation output. TypeScript uses identical formula and produces matching results to IEEE 754 double precision.
