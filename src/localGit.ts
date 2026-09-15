import { spawn } from "child_process";
import type { FileSystemAdapter } from "obsidian";
import { normalizePath } from "obsidian";
import * as path from "path";
import type ObsidianGit from "./main";

/**
 * Minimal, mostly read-only local Git wrapper for the gutter feature.
 *
 * It shells out to the system `git` binary (desktop only) and exposes just the
 * operations the gutter needs:
 * - {@link show} to read the staged/committed version of a file for diffing
 * - {@link applyPatch} to stage a single hunk via `git apply --cached`
 * - {@link isGitInstalled} to guard activation
 *
 * There is intentionally no remote, history, or working-tree mutation beyond
 * staging a hunk. All paths are vault-relative at the API boundary and are
 * converted to repository-relative paths internally.
 */
export class LocalGit {
    constructor(private readonly plugin: ObsidianGit) {}

    /** Absolute path to the Git repository working directory. */
    private get repoCwd(): string {
        const adapter = this.plugin.app.vault.adapter as FileSystemAdapter;
        const vaultBasePath = adapter.getBasePath();
        const basePath = this.plugin.settings.basePath;
        return basePath ? path.join(vaultBasePath, basePath) : vaultBasePath;
    }

    private get binary(): string {
        return this.plugin.settings.gitPath?.trim() || "git";
    }

    /** Convert a vault-relative path to a repository-relative one. */
    getRelativeRepoPath(filePath: string): string {
        const basePath = this.plugin.settings.basePath;
        if (basePath && basePath.length > 0) {
            if (filePath.startsWith(basePath + "/")) {
                return filePath.substring(basePath.length + 1);
            } else if (filePath === basePath) {
                return "";
            }
        }
        return filePath;
    }

    async isGitInstalled(): Promise<boolean> {
        try {
            await this.run(["--version"]);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Return the content of `file` at the given revision.
     *
     * @param commitHash "" for the index (staged) version, or "HEAD" for the
     *     last commit.
     * @param file Vault-relative path.
     */
    async show(commitHash: string, file: string): Promise<string> {
        const repoPath = this.getRelativeRepoPath(file);
        return this.run(["show", `${commitHash}:${repoPath}`]);
    }

    /** Apply a unified-diff patch to the index (used to stage a hunk). */
    async applyPatch(patch: string): Promise<void> {
        const adapter = this.plugin.app.vault.adapter as FileSystemAdapter;
        const relPatchPath = normalizePath(
            `${this.plugin.manifest.dir ?? ""}/.git-gutter.patch`
        );
        await adapter.write(relPatchPath, patch);
        const absPatchPath = adapter.getFullPath(relPatchPath);
        try {
            await this.run([
                "apply",
                "--cached",
                "--unidiff-zero",
                "--whitespace=nowarn",
                absPatchPath,
            ]);
        } finally {
            await adapter.remove(relPatchPath);
        }
    }

    private run(args: string[]): Promise<string> {
        return new Promise((resolve, reject) => {
            const child = spawn(this.binary, args, {
                cwd: this.repoCwd,
                windowsHide: true,
            });
            let stdout = "";
            let stderr = "";
            child.stdout.on(
                "data",
                (chunk: Buffer) => (stdout += chunk.toString())
            );
            child.stderr.on(
                "data",
                (chunk: Buffer) => (stderr += chunk.toString())
            );
            child.on("error", (error) => reject(error));
            child.on("close", (code) => {
                if (code === 0) {
                    resolve(stdout);
                } else {
                    reject(
                        new Error(
                            `git ${args[0]} failed (exit ${code}): ${stderr.trim()}`
                        )
                    );
                }
            });
        });
    }
}
