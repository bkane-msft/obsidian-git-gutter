import { execFileSync } from "child_process";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { describe, expect, it } from "vitest";
import { computeHunks } from "../../../src/editor/signs/diff";
import { Hunks } from "../../../src/editor/signs/hunks";

type DiffCase = {
    name: string;
    oldText: string;
    newText: string;
};

const cases: DiffCase[] = [
    {
        name: "adds a line in the middle",
        oldText: "one\nthree\n",
        newText: "one\ntwo\nthree\n",
    },
    {
        name: "deletes a line in the middle",
        oldText: "one\ntwo\nthree\n",
        newText: "one\nthree\n",
    },
    {
        name: "changes a line",
        oldText: "one\ntwo\n",
        newText: "one\nsecond\n",
    },
    {
        name: "replaces one line with multiple lines",
        oldText: "one\ntwo\nfour\n",
        newText: "one\nsecond\nthird\nfour\n",
    },
    {
        name: "inserts at the beginning",
        oldText: "two\nthree\n",
        newText: "one\ntwo\nthree\n",
    },
    {
        name: "appends at the end",
        oldText: "one\ntwo\n",
        newText: "one\ntwo\nthree\n",
    },
    {
        name: "removes the final line",
        oldText: "one\ntwo\nthree\n",
        newText: "one\ntwo\n",
    },
    {
        name: "changes content without trailing newlines",
        oldText: "one\ntwo",
        newText: "one\nsecond",
    },
];

function createTempDirectory(): string {
    return mkdtempSync(path.join(tmpdir(), "obsidian-git-test-"));
}

function gitDiffNoIndex(oldFile: string, newFile: string): string {
    try {
        return execFileSync("git", [
            "diff",
            "--no-index",
            "--unified=0",
            oldFile,
            newFile,
        ]).toString();
    } catch (error) {
        const output = (error as { stdout?: Buffer }).stdout;
        if (output) {
            return output.toString();
        }
        throw error;
    }
}

function parseNoIndexHunkHeaders(diff: string) {
    return diff
        .split("\n")
        .filter((line) => line.startsWith("@@ "))
        .map((line) => Hunks.parseDiffLine(line));
}

describe("computeHunks compared with git diff --no-index", () => {
    it.each(cases)("$name", ({ oldText, newText }) => {
        const dir = createTempDirectory();
        try {
            const oldFile = path.join(dir, "old.md");
            const newFile = path.join(dir, "new.md");
            writeFileSync(oldFile, oldText);
            writeFileSync(newFile, newText);

            const gitHunks = parseNoIndexHunkHeaders(
                gitDiffNoIndex(oldFile, newFile)
            );
            const computedHunks = computeHunks(
                oldText,
                newText,
                undefined,
                undefined
            ).hunks;

            expect(
                computedHunks.map(({ removed, added }) => ({
                    removed: { start: removed.start, count: removed.count },
                    added: { start: added.start, count: added.count },
                }))
            ).toEqual(
                gitHunks.map(({ removed, added }) => ({
                    removed: { start: removed.start, count: removed.count },
                    added: { start: added.start, count: added.count },
                }))
            );
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });
});
