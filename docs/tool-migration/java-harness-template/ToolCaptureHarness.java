package org.mwc.debrief.core.tools.capture;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonSerializer;

import java.io.FileWriter;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Harness for capturing golden input/output examples from Legacy Debrief tools.
 *
 * <p>Golden examples are used to verify that Python and TypeScript implementations
 * produce identical results to the original Java implementation.</p>
 *
 * <h2>Usage Example</h2>
 * <pre>{@code
 * ToolCaptureHarness harness = new ToolCaptureHarness("set-track-color", "format");
 *
 * // Capture inputs
 * harness.captureInput("track", trackObject);
 * harness.captureInput("parameters", Map.of("color", "#FF0000"));
 *
 * // Run the tool
 * Object result = myTool.execute(trackObject, "#FF0000");
 *
 * // Capture output
 * harness.captureOutput("result", result);
 *
 * // Write golden files
 * harness.writeGoldenFiles("basic");
 * }</pre>
 *
 * <h2>Output Files</h2>
 * <p>Golden files are written to {@code shared/tools/{category}/}:</p>
 * <ul>
 *   <li>{@code {tool-name}.{example-name}.input.json}</li>
 *   <li>{@code {tool-name}.{example-name}.output.json}</li>
 * </ul>
 *
 * @see <a href="https://debrief.github.io/future">Future Debrief Documentation</a>
 */
public class ToolCaptureHarness {

    private final String toolName;
    private final String category;
    private final Map<String, Object> inputs;
    private final Map<String, Object> outputs;
    private final GsonBuilder gsonBuilder;
    private String outputDirectory;

    /**
     * Create a new capture harness for a tool.
     *
     * @param toolName Tool identifier in kebab-case (e.g., "set-track-color")
     * @param category Tool category (e.g., "format", "analysis", "import")
     */
    public ToolCaptureHarness(String toolName, String category) {
        this.toolName = toolName;
        this.category = category;
        this.inputs = new LinkedHashMap<>();  // Preserve insertion order
        this.outputs = new LinkedHashMap<>();
        this.gsonBuilder = new GsonBuilder()
            .setPrettyPrinting()
            .serializeNulls()
            .disableHtmlEscaping();

        // Default output directory relative to project root
        this.outputDirectory = "shared/tools/" + category;
    }

    /**
     * Set custom output directory for golden files.
     *
     * @param directory Path to output directory
     * @return this harness for chaining
     */
    public ToolCaptureHarness setOutputDirectory(String directory) {
        this.outputDirectory = directory;
        return this;
    }

    /**
     * Register a custom Gson serializer for a type.
     *
     * <p>Use this for Debrief domain objects that need special handling.</p>
     *
     * @param type The class to serialize
     * @param serializer Custom serializer implementation
     * @param <T> Type being serialized
     * @return this harness for chaining
     */
    public <T> ToolCaptureHarness registerSerializer(Class<T> type, JsonSerializer<T> serializer) {
        gsonBuilder.registerTypeAdapter(type, serializer);
        return this;
    }

    /**
     * Capture an input value.
     *
     * <p>Call this for each input the tool receives. The key should match
     * what will be used in the spec and implementations.</p>
     *
     * @param key Input parameter name
     * @param value Input value (will be serialized to JSON)
     * @return this harness for chaining
     */
    public ToolCaptureHarness captureInput(String key, Object value) {
        inputs.put(key, value);
        return this;
    }

    /**
     * Capture an output value.
     *
     * <p>Call this for each output the tool produces. For tools that return
     * a single value, use "result" as the key.</p>
     *
     * @param key Output parameter name
     * @param value Output value (will be serialized to JSON)
     * @return this harness for chaining
     */
    public ToolCaptureHarness captureOutput(String key, Object value) {
        outputs.put(key, value);
        return this;
    }

    /**
     * Capture a single result value.
     *
     * <p>Convenience method for tools that return a single value.
     * Equivalent to {@code captureOutput("result", value)}.</p>
     *
     * @param value The tool's result
     * @return this harness for chaining
     */
    public ToolCaptureHarness captureResult(Object value) {
        return captureOutput("result", value);
    }

    /**
     * Write captured inputs and outputs to golden files.
     *
     * <p>Creates two files:</p>
     * <ul>
     *   <li>{@code {outputDirectory}/{toolName}.{exampleName}.input.json}</li>
     *   <li>{@code {outputDirectory}/{toolName}.{exampleName}.output.json}</li>
     * </ul>
     *
     * @param exampleName Name for this example (e.g., "basic", "empty", "edge-case-1")
     * @throws IOException if files cannot be written
     */
    public void writeGoldenFiles(String exampleName) throws IOException {
        Gson gson = gsonBuilder.create();

        // Ensure output directory exists
        Path outputPath = Paths.get(outputDirectory);
        Files.createDirectories(outputPath);

        // Write input file
        String inputFileName = String.format("%s.%s.input.json", toolName, exampleName);
        Path inputPath = outputPath.resolve(inputFileName);
        try (FileWriter writer = new FileWriter(inputPath.toFile())) {
            gson.toJson(unwrapSingleEntry(inputs), writer);
        }
        System.out.println("Wrote: " + inputPath);

        // Write output file
        String outputFileName = String.format("%s.%s.output.json", toolName, exampleName);
        Path outputFilePath = outputPath.resolve(outputFileName);
        try (FileWriter writer = new FileWriter(outputFilePath.toFile())) {
            gson.toJson(unwrapSingleEntry(outputs), writer);
        }
        System.out.println("Wrote: " + outputFilePath);
    }

    /**
     * Clear captured inputs and outputs for next example.
     *
     * @return this harness for chaining
     */
    public ToolCaptureHarness clear() {
        inputs.clear();
        outputs.clear();
        return this;
    }

    /**
     * Get the tool name.
     *
     * @return tool name in kebab-case
     */
    public String getToolName() {
        return toolName;
    }

    /**
     * Get the tool category.
     *
     * @return category name
     */
    public String getCategory() {
        return category;
    }

    /**
     * If the map has a single entry, return just that value.
     * Otherwise return the full map.
     *
     * <p>This simplifies the JSON structure for tools with a single input/output.</p>
     */
    private Object unwrapSingleEntry(Map<String, Object> map) {
        if (map.size() == 1) {
            return map.values().iterator().next();
        }
        return map;
    }
}
