import type ObsidianGit from "./main";

export function addCommmands(plugin: ObsidianGit) {
    plugin.addCommand({
        id: "refresh-gutter",
        name: "Refresh gutter",
        callback: () => plugin.refresh(),
    });
}
