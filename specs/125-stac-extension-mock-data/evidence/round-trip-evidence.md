# Round-Trip Evidence: STAC Extension Properties

## Test: Python Pydantic → JSON → Python Pydantic

From `test_stac_extension.py::TestRoundTrip::test_round_trip`:

```python
# 1. Create original model instance
original = StacExtensionProperties(
    vessel_classes=["surface/warship/frigate/type23", "subsurface/submarine"],
    tags=["ASW", "training"],
    feature_tags=["sonar-contact", "datum"],
    track_names=["HMS Argyll", "SUBMERGED CONTACT 01"],
    nationalities=["GB", "US"],
)

# 2. Serialize to JSON string
json_str = original.model_dump_json()
# {"vessel_classes":["surface/warship/frigate/type23","subsurface/submarine"],
#  "tags":["ASW","training"],"feature_tags":["sonar-contact","datum"],
#  "track_names":["HMS Argyll","SUBMERGED CONTACT 01"],
#  "nationalities":["GB","US"]}

# 3. Deserialize back to dict, then to model
data = json.loads(json_str)
restored = StacExtensionProperties(**data)

# 4. Assert field-by-field equality
assert restored.vessel_classes == original.vessel_classes  # ✓
assert restored.tags == original.tags                      # ✓
assert restored.feature_tags == original.feature_tags      # ✓
assert restored.track_names == original.track_names        # ✓
assert restored.nationalities == original.nationalities    # ✓
```

## Test: Empty Defaults Round-Trip

```python
original = StacExtensionProperties()
json_str = original.model_dump_json()
# {"vessel_classes":[],"tags":[],"feature_tags":[],
#  "track_names":[],"nationalities":[]}

restored = StacExtensionProperties(**json.loads(json_str))
assert restored == original  # ✓
```

## Test: Fixture File Round-Trip

```python
# Load golden fixture
data = json.loads(Path("valid/extension-basic.json").read_text())
original = StacExtensionProperties(**data)

# Serialize and restore
restored = StacExtensionProperties(**json.loads(original.model_dump_json()))
assert restored == original  # ✓
```

## Result

All 3 round-trip tests pass. Extension properties survive JSON serialisation with zero data loss. The Pydantic model correctly handles:
- Populated arrays (vessel_classes, tags, etc.)
- Empty default arrays
- Fixture files loaded from disk
