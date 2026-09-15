# Git Gutter Tests

This directory contains the automated test setup for the git-gutter plugin.

Tests run in Node with Vitest and use a small local `obsidian` stub. The suite
covers the pure diff/hunk/patch logic that powers the gutter; it does not launch
Obsidian and does not exercise the `git` binary.

## Commands

```bash
pnpm run test
pnpm run test:watch
pnpm run test:coverage
pnpm run all
```

`pnpm run all` runs type checking, formatting, linting, and the test suite.

## Test Runner

Tests use Vitest in a Node environment. Configuration lives in
`vitest.config.ts`:

-   `tests/**/*.test.ts` files are included.
-   `tests/setup.ts` runs before tests.
-   `obsidian` imports are mapped to `tests/stubs/obsidian.ts`.
-   `src` imports are mapped to the project `src` directory.
-   Coverage uses the V8 provider.

## Obsidian Stub

`tests/stubs/obsidian.ts` provides a small test-only subset of the Obsidian API.
Keep it minimal; add symbols only when a test needs them. It exists so unit
tests can load plugin modules without launching Obsidian; it is not a
fidelity-accurate runtime.

## Global Setup

`tests/setup.ts` provides small runtime globals used by plugin code that Node
does not provide on its own:

-   `window`
-   `activeWindow`
-   `activeDocument`
-   `Array.prototype.last`
-   `Math.clamp`

## Current Tests

`tests/editor/signs/` covers the pure logic:

-   `diff.test.ts` — hunk computation from two texts.
-   `hunks.test.ts` — hunk/sign helpers.
-   `patchRoundTrip.test.ts` — patch creation round-trips.

## Design Principles

-   Prefer pure unit tests for pure logic.
-   Keep the Obsidian stub minimal and test-only.
-   Keep helpers small and behavior-focused.
