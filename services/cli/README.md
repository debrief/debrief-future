# debrief-cli

Command-line interface for Debrief maritime tactical analysis tools.

## Installation

```bash
pip install debrief-cli
```

## Usage

```bash
# List available tools
debrief-cli tools list

# Describe a specific tool
debrief-cli tools describe track-stats

# Run a tool on GeoJSON input
debrief-cli tools run track-stats --input track.geojson

# Validate GeoJSON output
debrief-cli validate output.geojson
```

See `quickstart.md` in the spec for detailed examples.
