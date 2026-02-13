# API Contract Validation: 087-logical-result-id-registry

**Date**: 2026-02-13
**Contract**: `specs/087-logical-result-id-registry/contracts/result-id-registry.ts`
**Implementation**: `services/session-state/src/registry/resultIdRegistry.ts`
**Types**: `services/session-state/src/registry/types.ts`

## Compliance Status: 100%

| Entity | Type | In Contract | In Implementation | Signature Match |
|--------|------|-------------|-------------------|-----------------|
| ResultIdMapping | Interface | Yes | Yes | Yes |
| ResultIdChangeEvent | Interface | Yes | Yes | Yes |
| ResultIdChangeCallback | Type alias | Yes | Yes | Yes |
| StacAssetForHydration | Interface | Yes | Yes | Yes |
| ResultIdRegistry | Interface | Yes | Yes | Yes |
| CreateResultIdRegistry | Factory type | Yes | Yes (function) | Yes |
| resolve() | Method | Yes | Yes | Yes |
| listAll() | Method | Yes | Yes | Yes |
| size | Readonly property | Yes | Yes (getter) | Yes |
| registerFromLogEntry() | Method | Yes | Yes | Yes |
| registerFromRecordResult() | Method | Yes | Yes | Yes |
| registerFromReplayResult() | Method | Yes | Yes | Yes |
| hydrateFromAssets() | Method | Yes | Yes | Yes |
| subscribe() | Method | Yes | Yes | Yes |
| subscribeAll() | Method | Yes | Yes | Yes |
| clear() | Method | Yes | Yes | Yes |

## Notes

- All 11 methods/properties present in both contract and implementation with matching signatures
- All 6 type definitions present in types.ts matching the contract
- The `CreateResultIdRegistry` factory type is implemented as a `createResultIdRegistry()` function (functionally equivalent)
- Readonly properties implemented as getters
- Subscription methods return `() => void` unsubscribe functions as specified
