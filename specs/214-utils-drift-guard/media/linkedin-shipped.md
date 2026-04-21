# LinkedIn Summary — 214-utils-drift-guard

Feature #200 consolidated `calculateBounds` into `@debrief/utils`. Feature #214 just shipped a set of ESLint rules that ensure it stays consolidated — a parameterised drift-prevention factory that reads the TypeScript barrel of every `@debrief/*` package and fails the build if an `apps/*` file redeclares any of those exports.

Three gaps closed: a wiring-forgotten meta-check that fails CI if a drift rule is dropped from any `apps/*/.eslintrc.cjs`, generalised coverage across all five `@debrief/*` packages (utils, schemas, components, session-state, data), and a pre-existing but unwired `GeoJSONFeature` guard now wired into `task lint`. Fifty-two tests pass; adding a sixth package now takes three lines, not hours.

[Read the full breakdown](https://debrief.github.io/)

#FutureDebrief #Monorepo #DeveloperExperience
