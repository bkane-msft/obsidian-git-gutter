import { describe, expect, it, vi } from "vitest";
import { Hunks, type Hunk } from "../../../src/editor/signs/hunks";

function hunk(
    oldStart: number,
    oldCount: number,
    newStart: number,
    newCount: number,
    removedLines: string[] = [],
    addedLines: string[] = []
): Hunk {
    const result = Hunks.createHunk(oldStart, oldCount, newStart, newCount);
    result.removed.lines = removedLines;
    result.added.lines = addedLines;
    return result;
}

describe("Hunks.createHunk", () => {
    it("creates add, delete, and change hunks", () => {
        const addHunk = Hunks.createHunk(1, 0, 1, 2);
        expect(addHunk).toMatchObject({
            type: "add",
            vend: 2,
            removed: { start: 1, count: 0 },
            added: { start: 1, count: 2 },
        });
        expect(Hunks.getHunkHeader(addHunk)).toBe("@@ -1 +1,2 @@");

        const deleteHunk = Hunks.createHunk(3, 2, 2, 0);
        expect(deleteHunk).toMatchObject({
            type: "delete",
            vend: 2,
            removed: { start: 3, count: 2 },
            added: { start: 2, count: 0 },
        });
        expect(Hunks.getHunkHeader(deleteHunk)).toBe("@@ -3,2 +2 @@");

        const changeHunk = Hunks.createHunk(4, 1, 4, 1);
        expect(changeHunk).toMatchObject({
            type: "change",
            vend: 4,
        });
        expect(Hunks.getHunkHeader(changeHunk)).toBe("@@ -4,1 +4,1 @@");
    });
});

describe("Hunks.parseDiffLine", () => {
    it("parses explicit and implicit counts", () => {
        const explicit = Hunks.parseDiffLine("@@ -2,3 +5,4 @@");
        expect(explicit).toMatchObject({
            removed: { start: 2, count: 3 },
            added: { start: 5, count: 4 },
        });
        expect(Hunks.getHunkHeader(explicit)).toBe("@@ -2,3 +5,4 @@");

        const implicitBoth = Hunks.parseDiffLine("@@ -2 +5 @@");
        expect(implicitBoth).toMatchObject({
            removed: { start: 2, count: 1 },
            added: { start: 5, count: 1 },
        });
        expect(Hunks.getHunkHeader(implicitBoth)).toBe("@@ -2,1 +5,1 @@");

        const implicitRemoved = Hunks.parseDiffLine("@@ -2 +5,4 @@");
        expect(implicitRemoved).toMatchObject({
            removed: { start: 2, count: 1 },
            added: { start: 5, count: 4 },
        });
        expect(Hunks.getHunkHeader(implicitRemoved)).toBe("@@ -2,1 +5,4 @@");

        const implicitAdded = Hunks.parseDiffLine("@@ -2,3 +5 @@");
        expect(implicitAdded).toMatchObject({
            removed: { start: 2, count: 3 },
            added: { start: 5, count: 1 },
        });
        expect(Hunks.getHunkHeader(implicitAdded)).toBe("@@ -2,3 +5,1 @@");
    });
});

describe("Hunks.calcSigns", () => {
    it("creates signs for added lines", () => {
        expect(Hunks.calcSigns(undefined, hunk(1, 0, 1, 2), undefined)).toEqual(
            [
                { type: "add", count: 2, lnum: 1 },
                { type: "add", count: undefined, lnum: 2 },
            ]
        );
    });

    it("marks a delete at the start as a topdelete", () => {
        expect(Hunks.calcSigns(undefined, hunk(1, 2, 0, 0), undefined)).toEqual(
            [{ type: "topdelete", count: 2, lnum: 1 }]
        );
    });

    it("marks the last changed line as changedelete when more lines were removed", () => {
        expect(Hunks.calcSigns(undefined, hunk(4, 3, 4, 1), undefined)).toEqual(
            [{ type: "changedelete", count: 3, lnum: 4 }]
        );
    });

    it("adds trailing add signs when more lines were added than removed", () => {
        expect(Hunks.calcSigns(undefined, hunk(4, 1, 4, 3), undefined)).toEqual(
            [
                { type: "change", count: 1, lnum: 4 },
                { type: "add", count: undefined, lnum: 4 },
                { type: "add", count: undefined, lnum: 5 },
                { type: "add", count: 2, lnum: 6 },
            ]
        );
    });

    it("respects visible line bounds", () => {
        expect(
            Hunks.calcSigns(undefined, hunk(1, 0, 1, 4), undefined, 2, 3)
        ).toEqual([
            { type: "add", count: undefined, lnum: 2 },
            { type: "add", count: undefined, lnum: 3 },
        ]);
    });

    it("uses untracked signs for untracked add hunks", () => {
        expect(
            Hunks.calcSigns(
                undefined,
                hunk(1, 0, 1, 2),
                undefined,
                1,
                Infinity,
                true
            )
        ).toEqual([
            { type: "untracked", count: 2, lnum: 1 },
            { type: "untracked", count: undefined, lnum: 2 },
        ]);
    });

    it("rejects untracked non-add hunks", () => {
        const error = vi.spyOn(console, "error").mockImplementation(() => {});
        expect(
            Hunks.calcSigns(
                undefined,
                hunk(1, 1, 1, 1),
                undefined,
                1,
                Infinity,
                true
            )
        ).toEqual([]);
        expect(error).toHaveBeenCalledOnce();
        error.mockRestore();
    });
});

describe("Hunks static utility methods", () => {
    it("summarizes add, change, and delete hunks", () => {
        expect(
            Hunks.getSummary([
                hunk(1, 0, 1, 2),
                hunk(5, 3, 5, 1),
                hunk(9, 2, 8, 0),
            ])
        ).toEqual({ added: 2, changed: 1, removed: 4 });
    });
});
