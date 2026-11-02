import {
    ChangeDesc,
    EditorState,
    StateEffect,
    StateField,
    Transaction,
} from "@codemirror/state";
import type { Hunk } from "./hunks";
import { computeHunks } from "./diff";
import type { Chunk } from "@codemirror/merge";
import { pluginRef } from "src/pluginGlobalRef";
import {
    debounce,
    editorEditorField,
    editorInfoField,
    type Debouncer,
} from "obsidian";

export const hunksState: StateField<HunksData | undefined> = StateField.define<
    HunksData | undefined
>({
    create: (_state) => undefined,
    update: (previous, transaction) => {
        const hunksData: HunksData = previous
            ? { ...previous }
            : {
                  maxDiffTimeMs: 0,
                  hunks: [],
                  chunks: undefined,
                  isDirty: false,
              };
        let newCompare = false;

        for (const effect of transaction.effects) {
            if (effect.is(GitCompareResultEffectType)) {
                hunksData.compareText = effect.value.compareText;

                // Only issue new hunk computation if compareText has changed
                newCompare = previous?.compareText !== effect.value.compareText;
                if (newCompare) {
                    hunksData.chunks = undefined;
                    hunksData.changeDesc = undefined;
                }
            }
            if (effect.is(DebouncedComputeHunksEffectType)) {
                const currentRevision = transaction.startState.field(
                    computeHunksDebouncerStateField,
                    false
                )?.revision;
                if (effect.value.revision !== currentRevision) {
                    continue;
                }
                applyHunkComputation(
                    hunksData,
                    effect.value.result,
                    transaction.state
                );
                hunksData.changeDesc = undefined;
            }
        }
        if (transaction.docChanged) {
            // Changes in a working CodeMirror state history must be composable:
            // the previous result length is the next change's input length.
            const changeDescsAreComposable =
                !hunksData.changeDesc ||
                hunksData.changeDesc.newLength === transaction.changes.length;
            console.assert(
                changeDescsAreComposable,
                "Git: Hunk changes belong to different document histories."
            );
            if (!changeDescsAreComposable) {
                // Do not let an invariant violation break editing in production.
                // Discard the incremental cache and perform a full diff instead.
                hunksData.chunks = undefined;
            }
            hunksData.changeDesc = composeChangeDesc(
                hunksData.changeDesc,
                transaction.changes
            );
        }
        if (hunksData.compareText !== undefined) {
            if (newCompare || transaction.docChanged) {
                hunksData.isDirty = true;
                const res = scheduleHunkComputation(
                    transaction,
                    hunksData.compareText,
                    hunksData.chunks,
                    hunksData.changeDesc,
                    hunksData.maxDiffTimeMs
                );
                if (res) {
                    applyHunkComputation(hunksData, res, transaction.state);
                    hunksData.changeDesc = undefined;
                }
            }
        } else {
            hunksData.compareText = undefined;
            hunksData.chunks = undefined;
            hunksData.hunks = [];
            hunksData.isDirty = false;
            const file = transaction.state.field(editorInfoField).file;
            pluginRef.plugin?.editorIntegration.signsFeature.changeStatusBar?.display(
                hunksData.hunks,
                file
            );
        }
        return hunksData;
    },
});

function applyHunkComputation(
    hunkData: HunksData,
    computeData: ComputedHunksData,
    state: EditorState
) {
    hunkData.hunks = computeData.hunks;
    hunkData.chunks = computeData.chunks;
    hunkData.isDirty = false;
    hunkData.maxDiffTimeMs = Math.max(
        0.95 * hunkData.maxDiffTimeMs,
        computeData.diffDuration
    );
    const file = state.field(editorInfoField).file;
    pluginRef.plugin?.editorIntegration.signsFeature.changeStatusBar?.display(
        hunkData.hunks,
        file
    );
}

type ComputeHunksRevision = object;

type ComputeHunksDebouncerData = {
    debouncer: Debouncer<
        [
            {
                state: EditorState;
                compareText: string;
                previousChunks: readonly Chunk[] | undefined;
                changeDesc: ChangeDesc | undefined;
                revision: ComputeHunksRevision;
            },
        ],
        void
    >;
    revision: ComputeHunksRevision;
    filePath: string | undefined;
};

export const computeHunksDebouncerStateField =
    StateField.define<ComputeHunksDebouncerData>({
        create: (state) => {
            return {
                debouncer: debounce(
                    (data) => {
                        const {
                            state,
                            compareText,
                            previousChunks,
                            changeDesc,
                            revision,
                        } = data;
                        const editor = state.field(editorEditorField, false);
                        if (!editor) {
                            return;
                        }
                        const currentDebouncerData = editor.state.field(
                            computeHunksDebouncerStateField,
                            false
                        );
                        if (currentDebouncerData?.revision !== revision) {
                            return;
                        }
                        const res = computeHunksTimed(
                            state,
                            compareText,
                            previousChunks,
                            changeDesc
                        );
                        editor.dispatch({
                            effects: DebouncedComputeHunksEffectType.of({
                                result: res,
                                revision,
                            }),
                        });
                    },
                    1000,
                    true
                ),
                revision: {},
                filePath: state.field(editorInfoField, false)?.file?.path,
            };
        },
        update: (data, transaction) => {
            const filePath = transaction.state.field(editorInfoField, false)
                ?.file?.path;
            if (transaction.docChanged || filePath !== data.filePath) {
                return {
                    ...data,
                    revision: {},
                    filePath,
                };
            }
            return data;
        },
    });

function composeChangeDesc(
    accumulated: ChangeDesc | undefined,
    changes: ChangeDesc
): ChangeDesc {
    if (!accumulated) {
        return changes;
    }
    if (accumulated.newLength !== changes.length) {
        // Production fallback for the composability invariant asserted by the
        // caller. Same-length replacements satisfy the invariant normally.
        return changes;
    }
    return accumulated.composeDesc(changes);
}

function computeHunksTimed(
    state: EditorState,
    compareText: string,
    previousChunks: readonly Chunk[] | undefined,
    changeDesc: ChangeDesc | undefined
): ComputedHunksData {
    const editorText = state.doc.toString();

    const startTime = performance.now();
    const { hunks, chunks } = computeHunks(
        compareText,
        editorText,
        previousChunks,
        changeDesc
    );
    const diffDuration = performance.now() - startTime;
    return { hunks, chunks, diffDuration };
}

function scheduleHunkComputation(
    transaction: Transaction,
    compareText: string,
    previousChunks: readonly Chunk[] | undefined,
    changeDesc: ChangeDesc | undefined,
    maxDiffTimeMs: number
): ComputedHunksData | undefined {
    const state = transaction.state;
    const changeLength = Math.abs(
        transaction.changes.length - transaction.changes.newLength
    );

    const debouncerField = state.field(computeHunksDebouncerStateField);

    // Debounce large changes or if a previous diff took long time
    if (changeLength > 1000 || maxDiffTimeMs > 16) {
        debouncerField.debouncer({
            state,
            compareText,
            previousChunks,
            changeDesc,
            revision: debouncerField.revision,
        });
        return undefined;
    } else {
        return computeHunksTimed(
            state,
            compareText,
            previousChunks,
            changeDesc
        );
    }
}

export const GitCompareResultEffectType =
    StateEffect.define<GitCompareResult>();

export const DebouncedComputeHunksEffectType = StateEffect.define<{
    result: ComputedHunksData;
    revision: ComputeHunksRevision;
}>();

export type ComputedHunksData = {
    hunks: Hunk[];
    chunks: readonly Chunk[] | undefined;
    diffDuration: number;
};

export type HunksData = {
    hunks: Hunk[];
    chunks: readonly Chunk[] | undefined;
    changeDesc?: ChangeDesc;
    isDirty: boolean;
    maxDiffTimeMs: number;
} & GitCompareResult;

export type GitCompareResult = {
    compareText?: string;
};

export function newGitCompareResultAsTransaction(
    data: GitCompareResult,
    state: EditorState
): Transaction {
    return state.update({
        effects: GitCompareResultEffectType.of(data),
    });
}
