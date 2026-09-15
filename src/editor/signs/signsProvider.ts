import type { Extension } from "@codemirror/state";
import type { TFile } from "obsidian";
import { eventsPerFilePathSingleton } from "src/editor/eventsPerFilepath";
import type ObsidianGit from "src/main";
import {
    computeHunksDebouncerStateField,
    hunksState,
    type GitCompareResult,
} from "../signs/hunkState";
import { signsGutter, signsMarker } from "../signs/gutter";
import {
    cursorTooltipBaseTheme,
    diffTooltipField,
    selectedHunksState,
} from "./tooltip";

export class SignsProvider {
    constructor(private plugin: ObsidianGit) {}

    public async trackChanged(file: TFile): Promise<void> {
        try {
            await this.trackChangedHelper(file);
        } catch (error) {
            console.warn("Git: Error in trackChanged.", error);
            throw error;
        }
    }

    private async trackChangedHelper(file: TFile) {
        if (!file) return;

        if (file.path === undefined) {
            console.warn(
                "Git: Attempted to track change of undefined filepath. Unforeseen situation."
            );
            return;
        }

        return this.computeSigns(file.path);
    }

    public destroy() {}

    private async computeSigns(filepath: string) {
        const compareText = await this.plugin.localGit
            .show("", filepath)
            .catch(() => undefined);
        const compareTextHead = undefined;
        this.notifySignComputationResultToSubscribers(filepath, {
            compareText,
            compareTextHead,
        });
    }

    private notifySignComputationResultToSubscribers(
        filepath: string,
        data: GitCompareResult
    ) {
        eventsPerFilePathSingleton.ifFilepathDefinedTransformSubscribers(
            filepath,
            (subs) => subs.forEach((sub) => sub.notifyGitCompare(data))
        );
    }
}

export const enabledSignsExtensions: Extension[] = [
    diffTooltipField,
    cursorTooltipBaseTheme,
    signsGutter,
    signsMarker,
    selectedHunksState,
];

export const enabledHunksExtensions = [
    hunksState,
    computeHunksDebouncerStateField,
];
