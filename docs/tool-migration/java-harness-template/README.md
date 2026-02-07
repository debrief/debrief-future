# Java Golden I/O Capture Harness

This directory contains a template for capturing golden input/output examples from running Legacy Debrief Java tools. These golden examples are used to verify that Python and TypeScript implementations produce identical results.

## Purpose

When migrating a tool from Legacy Debrief to Future Debrief:

1. **Capture what the Java tool does** → Golden I/O examples
2. **Write a spec** describing the behavior → `/tool.spec`
3. **Generate implementations** → `/tool.implement`
4. **Verify correctness** against golden examples → `/tool.verify`

This harness helps with step 1: capturing the exact input/output behavior of Java tools.

## Quick Start

### 1. Add Dependencies

Copy the contents of `pom-fragment.xml` into your Legacy Debrief module's `pom.xml`:

```xml
<!-- Add to dependencies section -->
<dependency>
    <groupId>com.google.code.gson</groupId>
    <artifactId>gson</artifactId>
    <version>2.10.1</version>
    <scope>test</scope>
</dependency>
```

### 2. Copy the Harness

Copy `ToolCaptureHarness.java` into your test source directory:

```
org.mwc.debrief.core/src/test/java/org/mwc/debrief/core/tools/capture/ToolCaptureHarness.java
```

### 3. Create a Capture Test

See `example-usage.java` for a complete example. The basic pattern:

```java
import org.mwc.debrief.core.tools.capture.ToolCaptureHarness;

public class CaptureSetTrackColor {
    public static void main(String[] args) {
        ToolCaptureHarness harness = new ToolCaptureHarness(
            "set-track-color",  // tool name
            "format"            // category
        );

        // Setup your input data
        Track track = createSampleTrack();
        harness.captureInput("track", track);
        harness.captureInput("parameters", Map.of("color", "#FF0000"));

        // Run the actual tool
        Track result = SetTrackColorTool.execute(track, "#FF0000");

        // Capture output
        harness.captureOutput("result", result);

        // Write golden files
        harness.writeGoldenFiles("basic");  // Creates basic.input.json, basic.output.json
    }
}
```

### 4. Run and Collect

Run your capture test to generate golden files:

```bash
mvn test -Dtest=CaptureSetTrackColor
```

Golden files are written to:
```
shared/tools/{category}/{tool-name}.{example-name}.input.json
shared/tools/{category}/{tool-name}.{example-name}.output.json
```

## File Naming Convention

Golden files follow this naming pattern:

```
{tool-name}.{example-name}.{input|output}.json
```

Examples:
- `set-track-color.basic.input.json`
- `set-track-color.basic.output.json`
- `set-track-color.multi-track.input.json`
- `set-track-color.multi-track.output.json`

## Recommended Examples to Capture

For each tool, capture at minimum:

| Example Name | Description |
|--------------|-------------|
| `basic` | Simple, typical usage |
| `empty` | Empty or minimal input |
| `edge-case-1` | Boundary conditions |
| `complex` | Multiple items, full feature usage |

## Output Format

The harness generates JSON files that can be read by both Python and TypeScript:

### Input JSON
```json
{
  "track": {
    "type": "Feature",
    "geometry": { "type": "Point", "coordinates": [0, 0] },
    "properties": { "name": "Track1" }
  },
  "parameters": {
    "color": "#FF0000"
  }
}
```

### Output JSON
```json
{
  "type": "Feature",
  "geometry": { "type": "Point", "coordinates": [0, 0] },
  "properties": {
    "name": "Track1",
    "stroke": "#FF0000"
  }
}
```

## Serialization Notes

### GeoJSON Objects

The harness uses Gson for JSON serialization. Debrief domain objects are converted to GeoJSON-compatible structures:

- **Track** → GeoJSON Feature with LineString geometry
- **Position** → GeoJSON Point or coordinate array
- **Layer** → GeoJSON FeatureCollection

### Custom Serializers

If your tool uses custom domain objects, add Gson serializers:

```java
harness.registerSerializer(MyDomainClass.class, new MyDomainSerializer());
```

### Numeric Precision

Floating-point numbers are serialized with full precision. The `/tool.verify` command uses epsilon tolerance (default 1e-9) when comparing outputs.

## Troubleshooting

### "Output directory not found"

Ensure the `shared/tools/{category}/` directory exists:

```bash
mkdir -p shared/tools/format
mkdir -p shared/tools/analysis
```

### "Serialization failed"

Check that all objects in the input/output can be serialized to JSON. For complex Debrief objects, you may need to:

1. Create a simplified DTO representation
2. Register a custom Gson serializer
3. Manually construct the JSON structure

### "Golden files don't match implementations"

This usually indicates a behavioral difference. Check:

1. Are floating-point calculations done in the same order?
2. Are timestamps handled consistently (UTC vs local)?
3. Are collections sorted consistently?

## Integration with Tool Migration Workflow

After capturing golden examples:

1. Run `/tool.spec {tool-name}` to create the specification
2. Run `/tool.implement {tool-name}` to generate implementations
3. Run `/tool.verify {tool-name}` to verify against your golden examples

## Files in This Directory

| File | Description |
|------|-------------|
| `README.md` | This documentation |
| `ToolCaptureHarness.java` | The capture harness class |
| `pom-fragment.xml` | Maven dependencies to add |
| `example-usage.java` | Complete usage example |
