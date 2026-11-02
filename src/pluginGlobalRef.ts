import type ObsidianGit from "src/main";

/**
 * Store the reference to the {@link ObsidianGit} plugin globally, so that
 * CodeMirror state fields can reach the status bar.
 */
export const pluginRef: { plugin?: ObsidianGit } = {};
