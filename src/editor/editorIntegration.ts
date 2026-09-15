import type ObsidianGit from "src/main";
import { SignsFeature } from "./signs/signsIntegration";
import { subscribeNewEditor } from "./control";
import { eventsPerFilePathSingleton } from "./eventsPerFilepath";

export class EditorIntegration {
    constructor(private plg: ObsidianGit) {}

    signsFeature: SignsFeature = new SignsFeature(this.plg);

    onUnloadPlugin() {
        this.signsFeature.deactivateFeature();
        eventsPerFilePathSingleton.clear();
    }

    onLoadPlugin() {
        eventsPerFilePathSingleton.init();
        this.plg.registerEditorExtension(subscribeNewEditor);
        this.signsFeature.onLoadPlugin();
    }

    onReady() {
        this.signsFeature.conditionallyActivateBySettings();
    }

    refreshSignsSettings() {
        const hunkSettings = this.plg.settings.hunks;
        if (
            hunkSettings.showSigns ||
            hunkSettings.statusBar != "disabled" ||
            hunkSettings.hunkCommands
        ) {
            this.signsFeature.deactivateFeature();
            this.signsFeature.activateFeature();
        } else {
            this.signsFeature.deactivateFeature();
        }
    }
}
