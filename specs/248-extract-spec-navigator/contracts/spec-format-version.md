# Contract: `specFormatVersion` declaration and discovery

## Where consumers declare their version

A consumer repository declares its speckit-artefact format version in:

```
<consumer-repo-root>/.speckit/spec-format-version.json
```

## File shape

```json
{
  "version": "1.0.0"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `version` | string (SemVer 2.0.0) | Yes | The format version this consumer's `specs/` directory adheres to. |

The file MUST be valid JSON. Additional properties beyond `version` are silently ignored to allow future expansion.

## Discovery

The navigator fetches the file via the GitHub Contents API on initial page load:

```
GET /repos/{repo}/contents/.speckit/spec-format-version.json?ref={branch}
```

Where `{repo}` and `{branch}` come from the resolved `Configuration` (R-002).

## Behaviour matrix

| Outcome | What happens |
|---|---|
| File present, valid JSON, valid SemVer, **within** navigator's supported range | Render normally. Footer shows "Format `1.0.0` (supported)". |
| File present, valid JSON, valid SemVer, **above** range | Show "Upgrade your navigator" full-page error. Display both the consumer's version and the navigator's supported range. Link to the navigator's release notes. |
| File present, valid JSON, valid SemVer, **below** range | Show "Format too old" full-page error. Same shape as above, different copy. |
| File present, malformed JSON | Show "Format declaration could not be read" full-page error. Include parse error message and link to this contract. |
| File present, valid JSON, invalid SemVer | Same as malformed — full-page error with the bad value quoted. |
| File absent (`404`) | **Fail open**: assume `version: "1.0.0"`. Render normally. Display non-blocking yellow banner: "No `specFormatVersion` declared — assuming 1.0.0." |
| Network error (`5xx`, timeout) | Fail open: assume `version: "1.0.0"`. Display banner: "Could not check format version (transient error). Assuming 1.0.0." |
| Rate-limit error (`403` with `X-RateLimit-Remaining: 0`) | Fail open with banner pointing the user at the PAT entry option. |

## Navigator's supported range

The navigator bakes a SemVer range into its bundle at build time:

```typescript
// src/format-version/supported.ts
export const SUPPORTED_FORMAT_RANGE = ">=1.0.0 <2.0.0";
```

This value is exported in `index.html` as a `<meta>` tag for adopter tooling:

```html
<meta name="spec-navigator:supported-format-range" content=">=1.0.0 <2.0.0">
```

## Versioning policy (navigator side)

| Change type | Semver bump (navigator release) | Triggers `SUPPORTED_FORMAT_RANGE` change? |
|---|---|---|
| Add support for a new artefact filename | minor | no |
| Add support for a new artefact directory | minor | no |
| Drop support for an artefact filename | major | yes (raise the lower bound) |
| Recognise a new structural pattern in `spec.md` (additive) | minor | no |
| Require a new structural pattern in `spec.md` | major | yes (raise the lower bound) |
| Cosmetic UI changes | patch | no |

This policy is documented in the new repo's `CONTRIBUTING.md` so navigator contributors keep the contract honest.

## Adopter migration guidance

When the navigator drops support for an old format version, the new repo's release notes for that release MUST include:

1. The new `SUPPORTED_FORMAT_RANGE`.
2. A diff or list describing what changed in the supported format.
3. A migration recipe (or link to one) for affected adopters.

This makes the "Upgrade your navigator" / "Format too old" error-page link land on actionable content rather than a generic changelog entry.
