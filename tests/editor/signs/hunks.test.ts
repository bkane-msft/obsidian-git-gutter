import { describe, expect, it } from "vitest";
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
            removed: { start: 1 },
            added: { start: 1 },
        });

        const deleteHunk = Hunks.createHunk(3, 2, 2, 0);
        expect(deleteHunk).toMatchObject({
            type: "delete",
            vend: 2,
            removed: { start: 3 },
            added: { start: 2 },
        });

        const changeHunk = Hunks.createHunk(4, 1, 4, 1);
        expect(changeHunk).toMatchObject({
            type: "change",
            vend: 4,
        });
    });
});

describe("Hunks.calcSigns", () => {
    it("creates signs for added lines", () => {
        expect(Hunks.calcSigns(undefined, hunk(1, 0, 1, 2), undefined)).toEqual(
            [
                { type: "add", lnum: 1 },
                { type: "add", lnum: 2 },
            ]
        );
    });

    it("marks a delete at the start as a topdelete", () => {
        expect(Hunks.calcSigns(undefined, hunk(1, 2, 0, 0), undefined)).toEqual(
            [{ type: "topdelete", lnum: 1 }]
        );
    });

    it("marks the last changed line as changedelete when more lines were removed", () => {
        expect(Hunks.calcSigns(undefined, hunk(4, 3, 4, 1), undefined)).toEqual(
            [{ type: "changedelete", lnum: 4 }]
        );
    });

    it("adds trailing add signs when more lines were added than removed", () => {
        expect(Hunks.calcSigns(undefined, hunk(4, 1, 4, 3), undefined)).toEqual(
            [
                { type: "change", lnum: 4 },
                { type: "add", lnum: 4 },
                { type: "add", lnum: 5 },
                { type: "add", lnum: 6 },
            ]
        );
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
