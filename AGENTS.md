# Project overview

This repository is **git-gutter**, a stripped-down, local-only fork of the
`obsidian-git` community plugin. It keeps only the editor "git gutter" (the
"Signs" feature): read-only change marks in the gutter plus optional per-hunk
stage/reset/preview. It bundles TypeScript into the root-level `main.js` loaded
by Obsidian, with `manifest.json` and `styles.css` as the other release
artifacts.

The runtime boundary is intentionally small:

- `src/main.ts` owns plugin lifecycle, settings load/save, the settings tab,
  command registration, the refresh event bridge, and `displayError`/
  `displayMessage`. It is minimal by design.
- `src/localGit.ts` is the entire Git layer: a tiny desktop wrapper that shells
  out to the system `git` binary for `git show` (read staged/committed content)
  and `git apply --cached` (stage a hunk). There is no `simple-git`/
  `isomorphic-git`, no remote, and no working-tree mutation beyond staging.
- `src/editor/signs/` is the CodeMirror 6 gutter feature: diffing
  (`diff.ts`, `hunks.ts`, `hunkState.ts`), the gutter markers (`gutter.ts`),
  the hunk preview tooltip (`tooltip.ts`), hunk actions (`hunkActions.ts`), and
  activation/lifecycle (`signsIntegration.ts`, `signsProvider.ts`), plus the
  status-bar summary (`changesStatusBar.ts`).
- `src/editor/control.ts` + `src/editor/eventsPerFilepath.ts` are the per-file
  pub/sub plumbing that pushes new compare results into each editor.
- `src/commands.ts` registers the hunk commands (stable IDs).
- `src/setting/settings.ts` is the settings tab; `src/types.ts` +
  `src/constants.ts` hold the settings interface, defaults, and the workspace
  event type augmentation.

Everything removed from upstream (remote, auto-commit, source-control/history/
diff views, line authoring, submodules, mobile backend) is gone — do not
reintroduce it unless explicitly asked.

## Environment and commands

Use Node.js `>=24` and pnpm `>=11` (see `package.json`). Use pnpm, not npm or
yarn; commit `pnpm-lock.yaml` when dependency versions change.

```sh
pnpm install
pnpm run dev          # watch and rebuild main.js with inline source maps
pnpm run build        # production bundle; writes the ignored root main.js
pnpm run tsc          # strict TypeScript check
pnpm run format       # Prettier check (does not rewrite files)
pnpm run lint         # ESLint for src, tests, and vitest.config.ts
pnpm run test         # Vitest test suite
pnpm run all          # tsc, format, lint, and tests
```

Run `pnpm run all` before handoff. Run `pnpm run build` for changes to bundling,
dependencies, manifest/release behavior, or runtime imports.

**Local toolchain note:** if `node -v` is `< 24` (e.g. a Volta-pinned Node 20),
the Homebrew `node@26` works: `export PATH="/opt/homebrew/opt/node@26/bin:$PATH"`
and install pnpm with `npm install -g pnpm` if it is missing.

## Conventions

- Keep the double-quote, 4-space Prettier style. Do not make unrelated
  formatting changes.
- Keep command IDs in `src/commands.ts` stable after release.
- Keep `src/main.ts` focused on lifecycle/coordination. Put Git behavior in
  `src/localGit.ts` and gutter behavior in `src/editor/signs/`.
- Keep filesystem paths vault-relative at API boundaries; convert to
  repo-relative only inside `LocalGit`. Never reach outside the vault/repo.
- Prefer `async`/`await`; surface failures through `displayError`/
  `displayMessage`. Route competing Git actions through `PromiseQueue`.
- Use Obsidian's `registerEvent`, `registerInterval`, and editor-extension
  registration helpers so resources are cleaned up on unload, and verify the
  deactivate path in `SignsFeature.deactivateFeature`.
- This plugin is desktop-only (`isDesktopOnly: true`); it depends on a native
  `git` binary.

## Testing

Tests run in the Node environment with Vitest. `vitest.config.ts` aliases
`obsidian` to `tests/stubs/obsidian.ts` and `src` to the source directory, and
loads `tests/setup.ts`. The suite covers the pure diff/hunk/patch logic under
`tests/editor/signs/`. See `tests/README.md` for details.
