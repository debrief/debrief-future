// Contract: Ruff Configuration Additions
// File: ruff.toml (repo root)
//
// This contract defines the ruff rule additions for type annotation enforcement.

/**
 * Rules to add to ruff.toml [lint] select:
 *
 * ANN — flake8-annotations (enforce annotation presence)
 *   ANN001: Missing type annotation for function argument
 *   ANN002: Missing type annotation for *args
 *   ANN003: Missing type annotation for **kwargs
 *   ANN201: Missing return type annotation for public function
 *   ANN202: Missing return type annotation for private function
 *   ANN204: Missing return type annotation for special method (__init__, etc.)
 *   ANN205: Missing return type annotation for static method
 *   ANN206: Missing return type annotation for class method
 *
 * TC — flake8-type-checking (type-only import hygiene)
 *   TC001: Typing-only first-party import
 *   TC002: Typing-only third-party import
 *   TC003: Typing-only standard library import
 *
 * Rules to IGNORE:
 *   ANN101: Missing type annotation for self (deprecated Python 3.11+)
 *   ANN102: Missing type annotation for cls (deprecated Python 3.11+)
 *   ANN401: Dynamically typed expressions (Any) — enforced by pyright instead
 */

interface RuffConfig {
  "target-version": "py311";
  "line-length": 100;
  exclude: string[];  // includes "shared/schemas/src/generated/"

  lint: {
    select: string[];
    // Current: ["E", "F", "I", "W", "UP", "B", "SIM"]
    // Target:  ["E", "F", "I", "W", "UP", "B", "SIM", "ANN", "TC"]

    ignore: string[];
    // Current: ["E501"]
    // Target:  ["E501", "ANN101", "ANN102"]
  };
}
