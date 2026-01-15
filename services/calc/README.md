# debrief-calc

Context-sensitive analysis tools for Debrief maritime tactical analysis.

## Installation

```bash
pip install debrief-calc
```

## Usage

```python
from debrief_calc import registry, run
from debrief_calc.models import ContextType, SelectionContext

# List available tools for a single track
tools = registry.find_tools(context_type=ContextType.SINGLE, kinds={"track"})

# Run track-stats on a track feature
context = SelectionContext(type=ContextType.SINGLE, features=[track_feature])
result = run("track-stats", context)
```

See `quickstart.md` in the spec for detailed examples.
