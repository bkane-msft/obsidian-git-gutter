import type ObsidianGit from "./main";
import { togglePreviewHunk } from "./editor/signs/tooltip";

export function addCommmands(plugin: ObsidianGit) {
    plugin.addCommand({
        id: "refresh-gutter",
        name: "Refresh gutter",
        callback: () => plugin.refresh(),
    });

    plugin.addCommand({
        id: "reset-hunk",
        name: "Reset hunk",
        editorCheckCallback(checking, _, __) {
            if (checking) {
                return (
                    plugin.settings.hunks.hunkCommands &&
                    plugin.hunkActions.editor !== undefined
                );
            }

            plugin.hunkActions.resetHunk();
            return true;
        },
    });

    plugin.addCommand({
        id: "stage-hunk",
        name: "Stage hunk",
        editorCheckCallback: (checking, _, __) => {
            if (checking) {
                return (
                    plugin.settings.hunks.hunkCommands &&
                    plugin.hunkActions.editor !== undefined
                );
            }
            plugin.promiseQueue.addTask(() => plugin.hunkActions.stageHunk());
            return true;
        },
    });

    plugin.addCommand({
        id: "preview-hunk",
        name: "Preview hunk",
        editorCheckCallback: (checking, _, __) => {
            if (checking) {
                return (
                    plugin.settings.hunks.hunkCommands &&
                    plugin.hunkActions.editor !== undefined
                );
            }
            const editor = plugin.hunkActions.editor!.editor;
            togglePreviewHunk(editor);
            return true;
        },
    });

    plugin.addCommand({
        id: "next-hunk",
        name: "Go to next hunk",
        editorCheckCallback: (checking, _, __) => {
            if (checking) {
                return (
                    plugin.settings.hunks.hunkCommands &&
                    plugin.hunkActions.editor !== undefined
                );
            }
            plugin.hunkActions.goToHunk("next");
            return true;
        },
    });

    plugin.addCommand({
        id: "prev-hunk",
        name: "Go to previous hunk",
        editorCheckCallback: (checking, _, __) => {
            if (checking) {
                return (
                    plugin.settings.hunks.hunkCommands &&
                    plugin.hunkActions.editor !== undefined
                );
            }
            plugin.hunkActions.goToHunk("prev");
            return true;
        },
    });
}
