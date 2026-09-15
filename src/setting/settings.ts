import { PluginSettingTab, Setting } from "obsidian";
import type ObsidianGit from "src/main";

export class GitGutterSettingsTab extends PluginSettingTab {
    constructor(private readonly plugin: ObsidianGit) {
        super(plugin.app, plugin);
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        const settings = this.plugin.settings;

        new Setting(containerEl)
            .setName("Show gutter change marks")
            .setDesc(
                "Show added, modified, and deleted marks in the editor gutter, compared to the staged or committed version of the file."
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(settings.hunks.showSigns)
                    .onChange(async (value) => {
                        settings.hunks.showSigns = value;
                        await this.plugin.saveSettings();
                        this.plugin.editorIntegration.refreshSignsSettings();
                    })
            );

        new Setting(containerEl)
            .setName("Hunk commands")
            .setDesc(
                "Add commands to stage or reset individual hunks, preview them, and jump between them."
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(settings.hunks.hunkCommands)
                    .onChange(async (value) => {
                        settings.hunks.hunkCommands = value;
                        await this.plugin.saveSettings();
                        this.plugin.editorIntegration.refreshSignsSettings();
                    })
            );

        new Setting(containerEl)
            .setName("Editor change summary in status bar")
            .setDesc(
                "Show a +added ~changed -deleted summary for the active editor in the status bar."
            )
            .addDropdown((dropdown) =>
                dropdown
                    .addOptions({
                        disabled: "Disabled",
                        colored: "Colored",
                        monochrome: "Monochrome",
                    })
                    .setValue(settings.hunks.statusBar)
                    .onChange(async (value) => {
                        settings.hunks.statusBar =
                            value as ObsidianGitSettingsStatusBar;
                        await this.plugin.saveSettings();
                        this.plugin.editorIntegration.refreshSignsSettings();
                    })
            );

        new Setting(containerEl)
            .setName("Git binary path")
            .setDesc(
                "Optional. Absolute path to the git executable. Leave empty to use 'git' from your PATH."
            )
            .addText((text) =>
                text
                    .setPlaceholder("git")
                    .setValue(settings.gitPath)
                    .onChange(async (value) => {
                        settings.gitPath = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName("Repository path")
            .setDesc(
                "Optional. Path to the git repository relative to the vault root. Leave empty if the vault root is the repository."
            )
            .addText((text) =>
                text
                    .setPlaceholder("")
                    .setValue(settings.basePath)
                    .onChange(async (value) => {
                        settings.basePath = value;
                        await this.plugin.saveSettings();
                        this.plugin.editorIntegration.refreshSignsSettings();
                    })
            );
    }
}

type ObsidianGitSettingsStatusBar = "disabled" | "colored" | "monochrome";
