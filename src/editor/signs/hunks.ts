/**
 * This file contains code translated from Lua to TypeScript.
 * Original Source: https://github.com/lewis6991/gitsigns.nvim/blob/main/lua/gitsigns/hunks.lua
 * Original Author: Lewis Russell
 * License: MIT
 * Original Copyright (c) 2020 Lewis Russell
 */
export type HunkType = "add" | "change" | "delete";

export interface HunkNode {
    start: number;
    count: number;
    lines: string[];
    no_nl_at_eof?: true;
}

export interface Hunk {
    type: HunkType;
    added: HunkNode;
    removed: HunkNode;
    vend: number;
}

export type SignType = HunkType | "topdelete" | "changedelete";

export interface Sign {
    type: SignType;
    lnum: number;
}

export interface StatusObj {
    added: number;
    changed: number;
    removed: number;
}

export abstract class Hunks {
    static createHunk(
        oldStart: number,
        oldCount: number,
        newStart: number,
        newCount: number
    ): Hunk {
        return {
            removed: { start: oldStart, count: oldCount, lines: [] },
            added: { start: newStart, count: newCount, lines: [] },
            vend: newStart + Math.max(newCount - 1, 0),
            type: newCount === 0 ? "delete" : oldCount === 0 ? "add" : "change",
        };
    }

    private static changeEnd(hunk: Hunk): number {
        if (hunk.added.count === 0) {
            return hunk.added.start;
        } else if (hunk.removed.count === 0) {
            return hunk.added.start + hunk.added.count - 1;
        } else {
            return (
                hunk.added.start +
                Math.min(hunk.added.count, hunk.removed.count) -
                1
            );
        }
    }

    static calcSigns(
        prevHunk: Hunk | undefined,
        hunk: Hunk,
        nextHunk: Hunk | undefined
    ): Sign[] {
        const { start, added, removed } = {
            start: hunk.added.start,
            added: hunk.added.count,
            removed: hunk.removed.count,
        };

        const cend = this.changeEnd(hunk);

        const topdelete =
            hunk.type === "delete" &&
            (start === 0 || (prevHunk && this.changeEnd(prevHunk) === start)) &&
            (!nextHunk || nextHunk.added.start !== start + 1);

        const minLnum = topdelete ? 0 : 1;

        const signs: Sign[] = [];

        for (let lnum = Math.max(start, minLnum); lnum <= cend; lnum++) {
            const changedelete =
                hunk.type === "change" &&
                ((removed > added && lnum === cend) ||
                    (prevHunk && prevHunk.added.start === 0));

            signs.push({
                type: topdelete
                    ? "topdelete"
                    : changedelete
                      ? "changedelete"
                      : hunk.type,
                lnum: lnum + (topdelete ? 1 : 0),
            });
        }

        if (hunk.type === "change" && added > removed) {
            for (let lnum = cend; lnum <= hunk.vend; lnum++) {
                signs.push({ type: "add", lnum });
            }
        }

        return signs;
    }

    static getSummary(hunks: Hunk[]): StatusObj {
        const status: StatusObj = { added: 0, changed: 0, removed: 0 };

        for (const hunk of hunks) {
            if (hunk.type === "add") {
                status.added += hunk.added.count;
            } else if (hunk.type === "delete") {
                status.removed += hunk.removed.count;
            } else if (hunk.type === "change") {
                const add = hunk.added.count;
                const remove = hunk.removed.count;
                const delta = Math.min(add, remove);
                status.changed += delta;
                status.added += add - delta;
                status.removed += remove - delta;
            }
        }

        return status;
    }
}
