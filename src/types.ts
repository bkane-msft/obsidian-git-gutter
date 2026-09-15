import "obsidian";

declare module "obsidian" {
    interface Workspace {
        /**
         * Emitted when a git action has completed and the gutter should refresh.
         */
        on(
            name: "obsidian-git:refresh",
            callback: () => void,
            ctx?: unknown
        ): EventRef;
        /**
         * Emitted after the gutter has refreshed.
         */
        on(
            name: "obsidian-git:refreshed",
            callback: () => void,
            ctx?: unknown
        ): EventRef;
        trigger(name: "obsidian-git:refresh"): void;
        trigger(name: "obsidian-git:refreshed"): void;
    }
}

export interface ObsidianGitSettings {
    /**
     * Path to the git repository relative to the vault root. Empty means the
     * vault root itself is the repository.
     */
    basePath: string;
    /**
     * Optional path to the git binary. Empty means "git" is resolved from the
     * user's PATH.
     */
    gitPath: string;
    hunks: {
        /** Show added/modified/deleted marks in the editor gutter. */
        showSigns: boolean;
        /** Register hunk stage/reset/navigation commands. */
        hunkCommands: boolean;
        /** Per-editor change summary shown in the status bar. */
        statusBar: "disabled" | "colored" | "monochrome";
    };
}
