# Feature Specification: Chart Renderer + Dataset-to-Spec Transformer

**Feature Branch**: `085-chart-renderer`
**Created**: 2026-02-13
**Status**: Draft
**Input**: User description: "Chart renderer + dataset-to-spec transformer — React component with Vega-Lite (swappable); transformer converts standard result datasets to render specs"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View a Result Dataset as a Chart (Priority: P1)

An analyst runs a tool (e.g., buffer zone analysis) that produces a standard result dataset (e.g., `dataset/zone_histogram`). The system automatically transforms this dataset into a visual chart — a bar chart showing point counts per zone. The analyst sees the rendered chart without needing to know anything about the rendering library or data format. The chart is readable, properly labelled, and displays the data accurately.

**Why this priority**: This is the core value proposition — turning raw tool output into visual insights. Without this, there is no visualization capability at all. Every downstream feature (panels, auto-refresh, editor tabs) depends on this rendering foundation.

**Independent Test**: Can be fully tested by providing a known dataset JSON file to the transformer, verifying a valid render spec is produced, then passing that spec to the chart renderer component and confirming a chart appears with the expected axes, labels, and data points.

**Acceptance Scenarios**:

1. **Given** a valid `dataset/zone_histogram` JSON file, **When** the transformer processes it, **Then** a render spec is produced that describes a bar chart with one bar per zone and correct counts.
2. **Given** a valid render spec for a bar chart, **When** the chart renderer component receives it, **Then** the component displays a bar chart with readable axis labels, a title, and correctly proportioned bars.
3. **Given** a dataset with labelled data series, **When** the transformer produces a render spec, **Then** the chart includes a legend identifying each series.

---

### User Story 2 - View Different Chart Types from Different Datasets (Priority: P2)

Different tools produce different types of result datasets — histograms, time-series, scatter data. The transformer recognises the dataset type and produces the appropriate chart type (bar chart, line chart, scatter plot). An analyst running range-bearing analysis sees a line chart of range over time; an analyst running zone analysis sees a bar chart of counts per zone. The system handles each without manual configuration.

**Why this priority**: Supporting multiple chart types is essential for the system to be useful across more than one tool. Without it, the visualization is limited to a single chart format regardless of data semantics.

**Independent Test**: Can be tested by providing datasets of each supported type (`dataset/zone_histogram`, `dataset/range_bearing_series`) and verifying the transformer produces the appropriate chart type for each, then rendering each chart and confirming it displays correctly.

**Acceptance Scenarios**:

1. **Given** a `dataset/zone_histogram` dataset, **When** the transformer processes it, **Then** a bar chart render spec is produced.
2. **Given** a `dataset/range_bearing_series` dataset, **When** the transformer processes it, **Then** a line chart render spec is produced with time on the x-axis.
3. **Given** a dataset type the transformer does not recognise, **When** the transformer processes it, **Then** the transformer returns a structured error indicating the unsupported dataset type (it does not crash or produce an invalid spec).

---

### User Story 3 - Develop and Test Charts in Isolation (Priority: P3)

A developer building a new tool needs to verify that their result dataset renders correctly. They use a component development environment (e.g., Storybook) to view the chart renderer with sample datasets, inspect the output, and iterate on the dataset schema without needing the full VS Code extension running.

**Why this priority**: Enabling isolated development and testing of the chart component accelerates development of all downstream features (#086–#089) and makes it easier for developers to create new dataset-to-spec mappings. It is not user-facing but significantly improves development velocity.

**Independent Test**: Can be tested by loading the chart renderer component in a standalone development environment with fixture data and confirming charts render correctly without any host application dependencies.

**Acceptance Scenarios**:

1. **Given** the chart renderer component, **When** it is loaded in a standalone development environment with a sample bar chart render spec, **Then** a bar chart is displayed identically to how it would appear in the host application.
2. **Given** a developer adding a new dataset type mapping, **When** they create a fixture file and run the development environment, **Then** they can see the rendered chart immediately without building the full application.

---

### User Story 4 - Swap Rendering Engine Without Changing Tools (Priority: P4)

The project needs to replace the initial rendering engine with an alternative (e.g., Observable Plot, ECharts). The swap affects only the transformer — the component that converts standard datasets to render specs. Tools continue to output the same standard dataset format. The chart renderer component is updated to consume the new spec format. No tool code changes are required.

**Why this priority**: This validates the architectural boundary between tools and rendering. While not an immediate user need, the swappability guarantee is a core design constraint that must be maintained from the start.

**Independent Test**: Can be tested by verifying that no dataset-producing tool imports or references the rendering library directly, and that the transformer is the only component that generates rendering-library-specific output.

**Acceptance Scenarios**:

1. **Given** the codebase with the initial rendering engine, **When** a code analysis is performed, **Then** only the transformer module and the chart renderer component reference the rendering library — no tool code references it.
2. **Given** a hypothetical second transformer implementation, **When** it is substituted for the original, **Then** tools continue to produce valid datasets and the chart renderer displays charts from the new transformer's output.

---

### Edge Cases

- What happens when a dataset contains zero data points? The chart renderer displays an empty chart with axes and a message indicating no data is available.
- What happens when a dataset contains extremely large values that would distort axis scales? The chart renderer uses appropriate scale transformations (e.g., logarithmic) or auto-scaling to keep the chart readable.
- What happens when a dataset contains missing or null values in a series? The chart renders available data and indicates gaps visually (e.g., broken line segments for line charts, absent bars for bar charts).
- What happens when a dataset's JSON structure is malformed or does not match the expected schema? The transformer returns a structured error with details about the validation failure rather than producing a corrupt render spec.
- What happens when the chart renderer receives an empty or null render spec? The component displays a clear error state rather than crashing.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The transformer MUST accept standard result datasets (as defined by the `tool-result.yaml` schema with `artifact/dataset/*` result types) and produce render specs suitable for the chart renderer component.
- **FR-002**: The transformer MUST support at minimum `dataset/zone_histogram` (bar chart) and `dataset/range_bearing_series` (line chart) dataset types at launch.
- **FR-003**: The transformer MUST return a structured error for unrecognised dataset types, including the unsupported type identifier.
- **FR-004**: The chart renderer component MUST render bar charts, line charts, and scatter plots from valid render specs.
- **FR-005**: The chart renderer component MUST display readable axis labels, titles, and legends derived from the dataset metadata.
- **FR-006**: The chart renderer component MUST handle empty datasets by showing an empty-state message rather than a blank or broken chart.
- **FR-007**: The chart renderer component MUST handle malformed or null render specs by displaying an error state without crashing.
- **FR-008**: The rendering library MUST be isolated to the transformer and chart renderer only — no tool code or other service code may import or reference it.
- **FR-009**: The chart renderer component MUST be usable in a standalone component development environment (e.g., Storybook) with fixture data, without requiring a host application.
- **FR-010**: The chart renderer component MUST work offline, with no network requests required for rendering.
- **FR-011**: The transformer MUST preserve dataset metadata (title, axis labels, series names, units) in the render spec so the chart renderer can display them.
- **FR-012**: The chart renderer component MUST auto-scale axes to fit the data range by default.

### Key Entities

- **Standard Result Dataset**: A JSON structure conforming to the `tool-result.yaml` schema with an `artifact/dataset/*` result type. Contains the raw data produced by a tool (e.g., zone counts, time-series values) along with metadata (title, axis labels, units, series names). This is the input to the transformer.
- **Render Spec**: An intermediate representation produced by the transformer that describes what chart to draw, including chart type, data values, axis definitions, labels, and visual encoding. This is the output of the transformer and the input to the chart renderer. The format of the render spec is determined by the chosen rendering library.
- **Transformer**: The component that converts a Standard Result Dataset into a Render Spec. This is the only component that has knowledge of the rendering library's spec format. Swapping the rendering engine means replacing this transformer.
- **Chart Renderer**: A shared UI component that takes a Render Spec and produces a visible chart. It delegates actual rendering to the chosen rendering library.
- **Dataset Type**: A string identifier (e.g., `dataset/zone_histogram`, `dataset/range_bearing_series`) that indicates the structure and semantics of a result dataset. The transformer uses this to select the appropriate chart type and mapping logic.

## User Interface Flow

### Decision Analysis

- **Primary Goal**: View tool results as visual charts to gain analytical insight from computed data.
- **Key Decision(s)**:
  1. The user does not make explicit decisions with this component — charts are rendered automatically from tool output. The user's decision occurs upstream (which tool to run, which data to analyse).
- **Decision Inputs**: The chart is driven entirely by the dataset content. The chart title, axis labels, and legend are derived from dataset metadata. The user sees the data and interprets it — no configuration is needed.

### Screen Progression

| Step | Screen/State | User Action | Result |
|------|--------------|-------------|--------|
| 1 | Tool execution completes | User runs a tool that produces a dataset result | Dataset JSON is stored as a STAC asset |
| 2 | Chart appears | System transforms dataset and renders chart | User sees a labelled chart (bar, line, or scatter) |
| 3 | Chart displayed | User reads axis labels, hovers over data points | User gains analytical insight from the visualisation |
| 4 | Different tool result | User runs a different tool producing a different dataset type | A different chart type appears appropriate to the data |

### UI States

- **Empty State**: "No data available" message displayed within the chart area when the dataset contains zero data points. Axes and title are still shown for context.
- **Loading State**: A placeholder skeleton or spinner displayed while the transformer processes the dataset and the chart renders.
- **Error State**: A clear error message displayed within the chart area when the dataset is malformed, the dataset type is unsupported, or the render spec is invalid. The message includes the nature of the error (e.g., "Unsupported dataset type: dataset/custom_format").
- **Success State**: A fully rendered chart with title, labelled axes, data visualisation, and legend (where applicable).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All supported dataset types (minimum 2 at launch) are correctly transformed and rendered as the appropriate chart type with 100% accuracy on reference test fixtures.
- **SC-002**: Charts display within 2 seconds of receiving a dataset of up to 10,000 data points.
- **SC-003**: The chart renderer component renders identically in the standalone development environment and in the host application for the same render spec.
- **SC-004**: The rendering library is referenced in zero files outside the transformer and chart renderer modules (verified by automated dependency check).
- **SC-005**: 100% of edge cases (empty data, malformed input, null spec, unsupported type) produce a user-friendly message rather than an application crash.
- **SC-006**: The chart renderer operates fully offline with no network requests during rendering.

## Assumptions

- The standard result dataset JSON schema is defined by the existing `tool-result.yaml` and will be stable before this feature is implemented. Specific dataset sub-schemas (e.g., the exact JSON structure of `dataset/zone_histogram`) will be defined as part of this feature's planning phase.
- Vega-Lite is the initial rendering library, but the specification is written to be rendering-library-agnostic. The transformer abstraction boundary ensures any library meeting the render spec contract can be substituted.
- The chart renderer is a shared React component placed in the shared components library, not embedded in the VS Code extension directly. It can be consumed by any frontend.
- Interactive chart features beyond basic display (tooltips, pan/zoom) are deferred to downstream features (#086–#089) unless they come free with the rendering library's default behaviour.
- Auto-scaling axes is the default behaviour. Custom axis ranges or scale types (logarithmic, etc.) may be added in future iterations.

## Dependencies

- **`tool-result.yaml` schema** (existing): Defines the standard result type hierarchy including `artifact/dataset/*` types.
- **Shared component library** (`shared/components/`): The chart renderer component will be published here for consumption by VS Code extension, Storybook, and other frontends.

## Scope Boundaries

### In Scope

- Transformer: dataset-to-render-spec conversion for `dataset/zone_histogram` and `dataset/range_bearing_series`
- Chart renderer: shared React component rendering bar charts, line charts, and scatter plots
- Storybook stories for the chart renderer with fixture data
- Error handling for malformed, empty, and unsupported datasets
- Rendering library isolation (only transformer + renderer reference it)

### Out of Scope

- Results bottom panel with tabs (#086)
- Logical result ID registry (#087)
- Custom editor provider for result files (#088)
- Auto-refresh on result changes (#089)
- Table/grid result views
- Interactive chart editing (charts are read-only)
- Real-time streaming data visualisation
- Export to PDF/PNG
- Custom axis configuration by users
