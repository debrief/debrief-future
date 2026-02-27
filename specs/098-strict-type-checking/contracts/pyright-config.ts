// Contract: Pyright Configuration
// File: pyrightconfig.json (repo root)
//
// This contract defines the pyright configuration that will be placed
// at the repository root to govern Python type checking across all packages.

interface PyrightConfig {
  // Directories to include in type checking
  include: string[];   // ["services", "shared"]

  // Directories to exclude from type checking
  exclude: string[];   // ["shared/schemas/src/generated/", "**/node_modules", "**/__pycache__"]

  // Target Python version
  pythonVersion: "3.11";

  // Type checking strictness level
  // Start at "standard", ratchet to "strict" once violations are cleared
  typeCheckingMode: "basic" | "standard" | "strict";

  // Virtual environment configuration
  venvPath: string;    // "."
  venv: string;        // ".venv"

  // Strict mode overrides (when typeCheckingMode < "strict")
  reportUnknownVariableType: boolean;
  reportUnknownMemberType: boolean;
  reportUnknownArgumentType: boolean;
  reportUnknownParameterType: boolean;
  reportMissingTypeArgument: boolean;
  reportUntypedFunctionDecorator: boolean;
  reportUntypedClassDecorator: boolean;
}

// Target configuration
const targetConfig: PyrightConfig = {
  include: ["services", "shared"],
  exclude: [
    "shared/schemas/src/generated/",
    "**/node_modules",
    "**/__pycache__",
    "**/dist",
  ],
  pythonVersion: "3.11",
  typeCheckingMode: "strict",
  venvPath: ".",
  venv: ".venv",
  reportUnknownVariableType: true,
  reportUnknownMemberType: true,
  reportUnknownArgumentType: true,
  reportUnknownParameterType: true,
  reportMissingTypeArgument: true,
  reportUntypedFunctionDecorator: true,
  reportUntypedClassDecorator: true,
};
