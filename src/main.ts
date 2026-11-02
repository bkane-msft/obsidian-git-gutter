import { Notice, Platform, Plugin } from "obsidian";
import { pluginRef } from "src/pluginGlobalRef";
import { GitGutterSettingsTab } from "src/setting/settings";
import { addCommmands } from "./commands";
import { DEFAULT_SETTINGS } from "./constants";
import { EditorIntegration } from "./editor/editorIntegration";
import { LocalGit } from "./localGit";
import type { ObsidianGitSettings } from "./types";

/**
 * A stripped-down, local-only fork of obsidian-git that provides just the
 * editor "git gutter": read-only change marks and a status-bar summary.
 * There is no staging, remote, history, source-control view, or commit.
 */
export default class ObsidianGit extends Plugin {
    settings!: ObsidianGitSettings;
    localGit = new LocalGit(this);
    editorIntegration = new EditorIntegration(this);
    gitReady = false;
    private commandsAdded = false;

    async onload(): Promise<void> {
        pluginRef.plugin = this;
        await this.loadSettings();

        this.addSettingTab(new GitGutterSettingsTab(this));
        this.editorIntegration.onLoadPlugin();

        this.app.workspace.onLayoutReady(() => {
            this.init().catch((e) => this.displayError(e));
        });
    }

    onunload(): void {
        this.editorIntegration.onUnloadPlugin();
        pluginRef.plugin = undefined;
    }

    /** Initialize once git is confirmed available. Safe to call repeatedly. */
    async init(): Promise<void> {
        this.gitReady = await this.localGit.isGitInstalled().catch(() => false);

        if (!this.gitReady) {
            if (Platform.isDesktopApp) {
                this.displayError(
                    "Git Gutter: 'git' was not found. Set the git binary path in the plugin settings."
                );
            }
            return;
        }

        this.editorIntegration.onReady();
        if (!this.commandsAdded) {
            addCommmands(this);
            this.commandsAdded = true;
        }
    }

    /** Recompute the gutter for all open editors. */
    refresh(): void {
        this.app.workspace.trigger("obsidian-git:refreshed");
    }

    async loadSettings(): Promise<void> {
        const data =
            (await this.loadData()) as Partial<ObsidianGitSettings> | null;
        this.settings = {
            ...structuredClone(DEFAULT_SETTINGS),
            ...(data ?? {}),
            hunks: {
                ...DEFAULT_SETTINGS.hunks,
                ...(data?.hunks ?? {}),
            },
        };
    }

    async saveSettings(): Promise<void> {
        await this.saveData(this.settings);
    }

    displayMessage(message: string, timeout: number = 4 * 1000): void {
        new Notice(message, timeout);
        console.log(`git-gutter: ${message}`);
    }

    displayError(data: unknown, timeout: number = 10 * 1000): void {
        const message = data instanceof Error ? data.message : String(data);
        new Notice(`Git Gutter error: ${message}`, timeout);
        console.error("git-gutter:", data);
    }
}
