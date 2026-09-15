# Git Gutter (Obsidian)

A small, **local, read-only** Obsidian plugin that shows a Git change gutter in
the editor — added / modified / deleted marks next to each line — plus optional
per-hunk **stage / reset / preview**.

It is a stripped-down fork of
[obsidian-git](https://github.com/Vinzent03/obsidian-git) that keeps only the
"Signs" (gutter) feature. Everything else — remotes, push/pull/fetch,
auto-commit/backup, the source-control and history views, diff views, line
authoring/blame, submodules, and the mobile `isomorphic-git` backend — has been
removed.

## Features

- Change marks in the editor gutter compared to the staged/committed version of
  the file.
- Click a mark (or use the commands) to preview a hunk, then **stage** it
  (`git apply --cached`) or **reset** it back to the committed version.
- Commands: _Stage hunk_, _Reset hunk_, _Preview hunk_, _Go to next/previous
  hunk_, and _Refresh gutter_.
- Optional per-editor change summary (`+added ~changed -deleted`) in the status
  bar.

## Requirements & scope

- **Desktop only.** It shells out to your system `git` binary via a tiny
  wrapper (`src/localGit.ts`); there is no mobile/browser backend.
- **Local only.** No network, authentication, or remote operations.
- The vault (or the configured _Repository path_) must be inside a Git working
  tree.

## Settings

- **Show gutter change marks** — toggle the gutter marks.
- **Hunk commands** — register the stage/reset/preview/navigation commands.
- **Editor change summary in status bar** — `disabled`, `colored`, or
  `monochrome`.
- **Git binary path** — optional; defaults to `git` on your `PATH`.
- **Repository path** — optional; path to the repo relative to the vault root.
  Leave empty when the vault root is the repository.

## Build & install

Uses Node `>=24` and pnpm `>=11`.

```sh
pnpm install
pnpm run build        # produces main.js
```

Then copy `main.js`, `manifest.json`, and `styles.css` into your vault at
`.obsidian/plugins/git-gutter/`, and enable **Git Gutter** under
Settings → Community plugins (with Restricted mode off).

Common scripts:

```sh
pnpm run dev          # watch + rebuild main.js with inline source maps
pnpm run tsc          # strict TypeScript check
pnpm run lint         # ESLint
pnpm run format       # Prettier check
pnpm run test         # Vitest
pnpm run all          # tsc, format, lint, test
```

## License

MIT. See [LICENSE](./LICENSE). Original work © Vinzent (obsidian-git); the diff
computation in `src/editor/signs/hunks.ts` is adapted from
[gitsigns.nvim](https://github.com/lewis6991/gitsigns.nvim) (MIT).
