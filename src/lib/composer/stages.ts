/**
 * The authoring workflow's stage model.
 *
 * Stages are declared once, here, as typed data. They are never re-declared inside a
 * component: adding, renaming or reordering a stage must mean editing this list and
 * nothing else.
 *
 * `StageId` is a literal union rather than a bare `string` so that the compiler rejects
 * an unknown stage at every call site.
 */

export type StageId = 'binding' | 'layout' | 'preview';

export type Stage = {
	id: StageId;
	label: string;
	/** Position in the workflow, ascending and contiguous from 1. */
	order: number;
};

/** The stage shown when the composer first loads and after every reload. */
export const DEFAULT_STAGE: StageId = 'layout';

/** How the layout stage is presented. Belongs to the layout stage alone. */
export type LayoutPresentation = 'visual' | 'json';

export const DEFAULT_LAYOUT_PRESENTATION: LayoutPresentation = 'visual';

/**
 * The three stages, in workflow order. Exactly three, in this order, with contiguous
 * orders; `stages.test.ts` enforces all three properties.
 */
export const STAGES: readonly Stage[] = [
	{ id: 'binding', label: 'Binding', order: 1 },
	{ id: 'layout', label: 'UI Layout', order: 2 },
	{ id: 'preview', label: 'Preview', order: 3 }
];

export function isStageId(value: unknown): value is StageId {
	return STAGES.some((stage) => stage.id === value);
}

/** Narrows an arbitrary value to a `StageId`, or returns undefined. */
export function toStageId(value: unknown): StageId | undefined {
	return isStageId(value) ? value : undefined;
}

export function stageById(id: StageId): Stage {
	const stage = STAGES.find((candidate) => candidate.id === id);
	// Unreachable for a valid StageId, which the type system guarantees. Throwing
	// rather than returning undefined keeps every consumer's types honest.
	if (!stage) throw new Error(`Unknown stage: ${id}`);
	return stage;
}