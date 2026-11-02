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

export type SignType = HunkType | "topdelete" | "changedelete" | "untracked";

export interface Sign {
    type: SignType;
    /// Number of lines added/removed. Only set on the first line of a hunk.
    count?: number;
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

    static getHunkHeader(hunk: Hunk): string {
        return `@@ -${hunk.removed.start}${
            hunk.removed.count > 0 ? `,${hunk.removed.count}` : ""
        } +${hunk.added.start}${
            hunk.added.count > 0 ? `,${hunk.added.count}` : ""
        } @@`;
    }

    static parseDiffLine(line: string): Hunk {
        const parts = line.split("@@");
        const diffkey = parts[1]?.trim();
        if (!diffkey) {
            throw Error(`Invalid diff line: ${line}`);
        }

        // diffkey: "-xx,n +yy,m"
        const tokens = diffkey.split(" ");
        const pre = tokens[0]?.substring(1).split(",");
        const now = tokens[1]?.substring(1).split(",");
        if (!pre || !now || pre[0] === undefined || now[0] === undefined) {
            throw Error(`Invalid diff hunk range: ${line}`);
        }

        const hunk = this.createHunk(
            parseInt(pre[0]),
            parseInt(pre[1] || "1"),
            parseInt(now[0]),
            parseInt(now[1] || "1")
        );

        return hunk;
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
        nextHunk: Hunk | undefined,
        minLnum: number = 1,
        maxLnum: number = Infinity,
        untracked?: boolean
    ): Sign[] {
        if (untracked && hunk.type !== "add") {
            console.error(
                `Invalid hunk with untracked=${untracked} hunk="${Hunks.getHunkHeader(hunk)}"`
            );
            return [];
        }

        minLnum = Math.max(1, minLnum);

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

        if (topdelete && minLnum === 1) {
            minLnum = 0;
        }

        const signs: Sign[] = [];

        for (
            let lnum = Math.max(start, minLnum);
            lnum <= Math.min(cend, maxLnum);
            lnum++
        ) {
            const changedelete =
                hunk.type === "change" &&
                ((removed > added && lnum === cend) ||
                    (prevHunk && prevHunk.added.start === 0));

            signs.push({
                type: topdelete
                    ? "topdelete"
                    : changedelete
                      ? "changedelete"
                      : untracked
                        ? "untracked"
                        : hunk.type,
                count:
                    lnum === start
                        ? hunk.type === "add"
                            ? added
                            : removed
                        : undefined,
                lnum: lnum + (topdelete ? 1 : 0),
            });
        }

        if (
            hunk.type === "change" &&
            added > removed &&
            hunk.vend >= minLnum &&
            cend <= maxLnum
        ) {
            for (
                let lnum = Math.max(cend, minLnum);
                lnum <= Math.min(hunk.vend, maxLnum);
                lnum++
            ) {
                signs.push({
                    type: "add",
                    count: lnum === hunk.vend ? added - removed : undefined,
                    lnum,
                });
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

    private static compare(a: Hunk, b: Hunk): boolean {
        if (a.added.start !== b.added.start) {
            return false;
        }

        if (a.added.count !== b.added.count) {
            return false;
        }

        for (let i = 0; i < a.added.count; i++) {
            if (a.added.lines[i] !== b.added.lines[i]) {
                return false;
            }
        }

        return true;
    }

    private static filterCommon(a?: Hunk[], b?: Hunk[]): Hunk[] | undefined {
        if (!a && !b) {
            return undefined;
        }

        a = a || [];
        b = b || [];

        let aI = 0;
        let bI = 0;

        const ret: Hunk[] = [];

        for (let _ = 0; _ < Math.max(a.length, b.length) + 1; _++) {
            const aH = a[aI];
            const bH = b[bI];

            // End of a
            if (!aH) {
                break;
            }

            // End of b and add remaining a
            if (!bH) {
                for (let i = aI; i < a.length; i++) {
                    ret.push(a[i]!);
                }
                break;
            }

            if (aH.added.start > bH.added.start) {
                bI++;
            } else if (aH.added.start < bH.added.start) {
                ret.push(aH);
                aI++;
            } else {
                if (!this.compare(aH, bH)) {
                    // let topOffset = 0;
                    // for (let j = 0; j < aH.added.count; j++) {
                    //     const lineA = aH.added.lines[j];
                    //     const lineB = bH.added.lines[j];
                    //
                    //     if (!lineB) {
                    //         topOffset = j;
                    //         break;
                    //     }
                    //
                    //     if (lineA !== lineB) {
                    //         topOffset = j;
                    //     }
                    // }
                    //
                    // if (topOffset < aH.added.count) {
                    //     const newHunk: Hunk = {
                    //         head: aH.head,
                    //         type: aH.type,
                    //         added: {
                    //             start: aH.added.start + topOffset,
                    //             count: aH.added.count - topOffset,
                    //             lines: aH.added.lines.slice(topOffset),
                    //             no_nl_at_eof: aH.added.no_nl_at_eof,
                    //         },
                    //         removed: {
                    //             start: aH.removed.start,
                    //             count: aH.removed.count,
                    //             lines: aH.removed.lines,
                    //             no_nl_at_eof: aH.removed.no_nl_at_eof,
                    //         },
                    //         vend: aH.added.start + aH.added.count - 1,
                    //     };
                    //     ret.push(newHunk);
                    // } else {
                    ret.push(aH);
                    // }
                }
                aI++;
                bI++;
            }
        }

        return ret;
    }

    // static computeStagedHunks(
    //     headHunks: Hunk[],
    //     hunks: Hunk[],
    //     // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Keep the comparison context in the staged-hunk API.
    //     compare: GitCompareResult
    // ): Hunk[] {
    //     const filteredHunks = Hunks.filterCommon(headHunks, hunks)!;
    //
    // // Update staged hunk added lines to match compareText and not
    // // include unstaged changes
    // const compareTextLines = compare.compareText!.split("\n");
    // for (const hunk of filteredHunks) {
    //     for (let i = 0; i < hunk.added.lines.length; i++) {
    //         hunk.added.lines[i] =
    //             compareTextLines[Math.max(0, hunk.removed.start - 1) + i];
    //     }
    //     let offset = 0;
    //     for (
    //         let i = 0;
    //         i <
    //         Math.min(hunk.added.lines.length, hunk.removed.lines.length);
    //         i++
    //     ) {
    //         if (hunk.added.lines[i] != hunk.removed.lines[i]) {
    //             break;
    //         } else {
    //             offset++;
    //         }
    //     }
    //     if (offset > 0) {
    //         hunk.added.lines = hunk.added.lines.slice(offset);
    //         hunk.removed.lines = hunk.removed.lines.slice(offset);
    //         hunk.added.start += offset;
    //         hunk.removed.start += offset;
    //         hunk.added.count -= offset;
    //         hunk.removed.count -= offset;
    //     }
    // }
    //     return filteredHunks;
    // }
}
