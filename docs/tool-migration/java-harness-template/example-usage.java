package org.mwc.debrief.core.tools.capture;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonSerializer;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

/**
 * Example: Capturing golden I/O for the SetTrackColor tool.
 *
 * This demonstrates how to use ToolCaptureHarness to capture input/output
 * examples from a Legacy Debrief tool for use in verifying Python and
 * TypeScript implementations.
 *
 * Run this as a Java application or test to generate golden files.
 */
public class CaptureSetTrackColorExample {

    public static void main(String[] args) throws IOException {
        // Create harness for the set-track-color tool in the format category
        ToolCaptureHarness harness = new ToolCaptureHarness("set-track-color", "format");

        // Optional: Set custom output directory (default is shared/tools/{category}/)
        // harness.setOutputDirectory("path/to/golden/files");

        // Optional: Register custom serializers for domain objects
        // harness.registerSerializer(Track.class, new TrackToGeoJsonSerializer());

        // =========================================================
        // Example 1: Basic usage
        // =========================================================

        // Create sample input (in real usage, this would be a Debrief Track object)
        Map<String, Object> inputTrack = createSampleTrack("Track1", "#0000FF");
        Map<String, Object> parameters = new HashMap<>();
        parameters.put("color", "#FF0000");

        // Capture inputs
        harness.captureInput("track", inputTrack);
        harness.captureInput("parameters", parameters);

        // In real usage, you would call the actual tool here:
        // Track result = SetTrackColorTool.execute(track, "#FF0000");

        // Simulate tool output (track with new color)
        Map<String, Object> outputTrack = createSampleTrack("Track1", "#FF0000");

        // Capture output
        harness.captureOutput("result", outputTrack);

        // Write golden files: set-track-color.basic.input.json, set-track-color.basic.output.json
        harness.writeGoldenFiles("basic");

        // Clear for next example
        harness.clear();

        // =========================================================
        // Example 2: Empty/minimal input
        // =========================================================

        Map<String, Object> emptyTrack = createEmptyTrack();
        Map<String, Object> emptyParams = new HashMap<>();
        emptyParams.put("color", "#00FF00");

        harness.captureInput("track", emptyTrack);
        harness.captureInput("parameters", emptyParams);

        Map<String, Object> emptyResult = createEmptyTrackWithColor("#00FF00");
        harness.captureOutput("result", emptyResult);

        harness.writeGoldenFiles("empty");
        harness.clear();

        // =========================================================
        // Example 3: Edge case - invalid color
        // =========================================================

        // Document how the tool handles edge cases
        Map<String, Object> edgeTrack = createSampleTrack("EdgeTrack", "#FFFFFF");
        Map<String, Object> invalidParams = new HashMap<>();
        invalidParams.put("color", "not-a-color");  // Invalid color value

        harness.captureInput("track", edgeTrack);
        harness.captureInput("parameters", invalidParams);

        // Tool might return error or original track unchanged
        Map<String, Object> errorResult = new HashMap<>();
        errorResult.put("error", "Invalid color format: not-a-color");
        errorResult.put("track", edgeTrack);  // Original unchanged

        harness.captureOutput("result", errorResult);

        harness.writeGoldenFiles("invalid-color");

        System.out.println("\nGolden files written successfully!");
        System.out.println("Location: shared/tools/format/");
        System.out.println("Files:");
        System.out.println("  - set-track-color.basic.input.json");
        System.out.println("  - set-track-color.basic.output.json");
        System.out.println("  - set-track-color.empty.input.json");
        System.out.println("  - set-track-color.empty.output.json");
        System.out.println("  - set-track-color.invalid-color.input.json");
        System.out.println("  - set-track-color.invalid-color.output.json");
    }

    // =========================================================
    // Helper methods to create sample data
    // =========================================================

    /**
     * Create a sample track as a GeoJSON-like structure.
     * In real usage, convert actual Debrief Track objects.
     */
    private static Map<String, Object> createSampleTrack(String name, String color) {
        Map<String, Object> track = new HashMap<>();
        track.put("type", "Feature");

        // Geometry: LineString for a track
        Map<String, Object> geometry = new HashMap<>();
        geometry.put("type", "LineString");
        geometry.put("coordinates", new double[][] {
            {0.0, 0.0},
            {1.0, 1.0},
            {2.0, 0.5}
        });
        track.put("geometry", geometry);

        // Properties
        Map<String, Object> properties = new HashMap<>();
        properties.put("name", name);
        properties.put("stroke", color);
        properties.put("stroke-width", 2);
        track.put("properties", properties);

        return track;
    }

    /**
     * Create an empty track (no positions).
     */
    private static Map<String, Object> createEmptyTrack() {
        Map<String, Object> track = new HashMap<>();
        track.put("type", "Feature");

        Map<String, Object> geometry = new HashMap<>();
        geometry.put("type", "LineString");
        geometry.put("coordinates", new double[][] {});
        track.put("geometry", geometry);

        Map<String, Object> properties = new HashMap<>();
        properties.put("name", "EmptyTrack");
        track.put("properties", properties);

        return track;
    }

    /**
     * Create an empty track with a specific color.
     */
    private static Map<String, Object> createEmptyTrackWithColor(String color) {
        Map<String, Object> track = createEmptyTrack();
        @SuppressWarnings("unchecked")
        Map<String, Object> properties = (Map<String, Object>) track.get("properties");
        properties.put("stroke", color);
        return track;
    }
}

/**
 * Example custom serializer for Debrief Track objects.
 *
 * Use this pattern when you need to convert complex domain objects
 * to GeoJSON-compatible JSON structures.
 */
/*
class TrackToGeoJsonSerializer implements JsonSerializer<Track> {
    @Override
    public JsonElement serialize(Track track, Type type, JsonSerializationContext context) {
        JsonObject feature = new JsonObject();
        feature.addProperty("type", "Feature");

        // Convert geometry
        JsonObject geometry = new JsonObject();
        geometry.addProperty("type", "LineString");
        JsonArray coordinates = new JsonArray();
        for (Position pos : track.getPositions()) {
            JsonArray coord = new JsonArray();
            coord.add(pos.getLongitude());
            coord.add(pos.getLatitude());
            coordinates.add(coord);
        }
        geometry.add("coordinates", coordinates);
        feature.add("geometry", geometry);

        // Convert properties
        JsonObject properties = new JsonObject();
        properties.addProperty("name", track.getName());
        properties.addProperty("stroke", track.getColor().toHex());
        feature.add("properties", properties);

        return feature;
    }
}
*/
