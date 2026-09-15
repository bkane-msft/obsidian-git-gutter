import type { ObsidianGitSettings } from "./types";

export const DEFAULT_SETTINGS: ObsidianGitSettings = {
    basePath: "",
    gitPath: "",
    hunks: {
        showSigns: true,
        hunkCommands: true,
        statusBar: "colored",
    },
};
