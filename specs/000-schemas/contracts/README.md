# Contracts: Schema Foundation

This feature (000-schemas) is a shared schema library, not a service with API endpoints.

**No API contracts are defined for this feature.**

The "contracts" for this feature are the schemas themselves:
- LinkML master schemas define the data model
- Generated JSON Schemas serve as validation contracts
- Generated Pydantic models and TypeScript interfaces are the programmatic contracts

See:
- `data-model.md` for entity definitions
- `shared/schemas/src/generated/json-schema/` for JSON Schema contracts (after implementation)
