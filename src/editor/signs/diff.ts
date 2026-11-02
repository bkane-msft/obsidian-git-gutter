import { Hunks, type Hunk } from "../signs/hunks";
import { Chunk } from "@codemirror/merge";
import { ChangeDesc, Text } from "@codemirror/state";

/**
 * Given a document and a position, return the corresponding line number in the
 * file.
 */
export function lineFromPos(doc: Text, pos: number): number {
    const lineData = doc.lineAt(pos);
    const no_nl_at_eof = !(
        lineData.text.length == 0 && lineData.number == doc.lines
    );
    const fileLine = no_nl_at_eof ? lineData.number : lineData.number - 1;
    return fileLine;
}

type RawHunk = {
    oldStart: number;
    oldLines: number;
    newStart: number;
    newLines: number;
};

export function rawHunksToHunks(
    textA: string,
    textB: string,
    rawHunks: RawHunk[]
): Hunk[] {
    const hunks: Hunk[] = [];
    const linesA = textA.split("\n");
    const linesB = textB.split("\n");
    for (const rawHunk of rawHunks) {
        const { oldStart, oldLines, newStart, newLines } = rawHunk;
        const hunk = Hunks.createHunk(oldStart, oldLines, newStart, newLines);
        if (rawHunk.oldLines > 0) {
            for (let i = oldStart; i < oldStart + oldLines; i++) {
                hunk.removed.lines.push(linesA[i - 1]!);
            }
            if (oldStart + oldLines > linesA.length && linesA.last() != "") {
                hunk.removed.no_nl_at_eof = true;
            }
        }
        if (rawHunk.newLines > 0) {
            for (let i = newStart; i < newStart + newLines; i++) {
                hunk.added.lines.push(linesB[i - 1]!);
            }
            if (newStart + newLines > linesB.length && linesB.last() != "") {
                hunk.added.no_nl_at_eof = true;
            }
        }
        hunks.push(hunk);
    }
    return hunks;
}

export function rawHunkFromChunk(
    chunk: Chunk,
    aDoc: Text,
    bDoc: Text
): RawHunk {
    const oldStart = aDoc.lineAt(chunk.fromA).number;
    const oldLines =
        chunk.fromA == chunk.toA
            ? 0
            : lineFromPos(aDoc, chunk.endA) - oldStart + 1;
    const newStart = bDoc.lineAt(chunk.fromB).number;
    const newLines =
        chunk.fromB == chunk.toB
            ? 0
            : lineFromPos(bDoc, chunk.endB) - newStart + 1;

    const rawHunk = {
        oldStart,
        oldLines,
        newStart,
        newLines,
    };

    if (rawHunk.oldLines == 0) {
        rawHunk.oldStart -= 1;
    }
    if (rawHunk.newLines == 0) {
        rawHunk.newStart -= 1;
    }

    return rawHunk;
}

const diffConfig = {
    scanLimit: 1000,
    timeout: 200,
};

function diffViaCMMerge(
    textA: string,
    textB: string,
    chunks: readonly Chunk[] | undefined,
    changes: ChangeDesc | undefined
) {
    const aDoc = Text.of(textA.split("\n"));
    const bDoc = Text.of(textB.split("\n"));
    const newChunks =
        chunks && changes
            ? Chunk.updateB(chunks, aDoc, bDoc, changes, diffConfig)
            : Chunk.build(aDoc, bDoc, diffConfig);
    const rawHunks: RawHunk[] = [];
    for (let i = 0; i < newChunks.length; i++) {
        const chunk = newChunks[i]!;

        const rawHunk = rawHunkFromChunk(chunk, aDoc, bDoc);
        rawHunks.push(rawHunk);
    }
    return {
        hunks: rawHunksToHunks(textA, textB, rawHunks),
        chunks: newChunks,
    };
}

export function computeHunks(
    textA: string,
    textB: string,
    chunks: readonly Chunk[] | undefined,
    changes: ChangeDesc | undefined
): { hunks: Hunk[]; chunks: readonly Chunk[] } {
    return diffViaCMMerge(textA, textB, chunks, changes);
}
