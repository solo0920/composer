import { describe, expect, it } from 'vitest';
import {
	DEFAULT_LAYOUT_PRESENTATION,
	DEFAULT_STAGE,
	STAGES,
	isStageId,
	stageById,
	toStageId,
	type StageId
} from './stages';

describe('STAGES', () => {
	it('contains exactly three stages', () => {
		expect(STAGES).toHaveLength(3);
	});

	it('lists the stage ids in workflow order', () => {
		expect(STAGES.map((stage) => stage.id)).toEqual(['binding', 'layout', 'preview']);
	});

	it('assigns contiguous orders starting at one', () => {
		expect(STAGES.map((stage) => stage.order)).toEqual([1, 2, 3]);
	});

	it('has unique ids and unique orders', () => {
		expect(new Set(STAGES.map((s) => s.id)).size).toBe(STAGES.length);
		expect(new Set(STAGES.map((s) => s.order)).size).toBe(STAGES.length);
	});

	it('gives every stage a non-empty label', () => {
		for (const stage of STAGES) {
			expect(stage.label.trim().length).toBeGreaterThan(0);
		}
	});

	it('labels the stages binding, UI layout and preview', () => {
		expect(stageById('binding').label).toBe('Binding');
		expect(stageById('layout').label).toBe('UI Layout');
		expect(stageById('preview').label).toBe('Preview');
	});

	it('is sorted ascending by order', () => {
		const orders = STAGES.map((stage) => stage.order);
		expect(orders).toEqual([...orders].sort((a, b) => a - b));
	});
});

describe('defaults', () => {
	it('defaults to the layout stage', () => {
		expect(DEFAULT_STAGE).toBe('layout');
		expect(isStageId(DEFAULT_STAGE)).toBe(true);
	});

	it('defaults to the visual layout presentation', () => {
		expect(DEFAULT_LAYOUT_PRESENTATION).toBe('visual');
	});
});

describe('isStageId', () => {
	it('accepts every declared stage id', () => {
		const ids: StageId[] = ['binding', 'layout', 'preview'];
		for (const id of ids) {
			expect(isStageId(id)).toBe(true);
		}
	});

	it('rejects anything not declared', () => {
		for (const value of ['Layout', 'render', '', 'nope', 2, null, undefined, {}]) {
			expect(isStageId(value)).toBe(false);
		}
	});
});

describe('toStageId', () => {
	it('narrows a declared stage id', () => {
		expect(toStageId('preview')).toBe('preview');
	});

	it('returns undefined for an unknown value', () => {
		expect(toStageId('nope')).toBeUndefined();
		expect(toStageId(undefined)).toBeUndefined();
	});
});

describe('stageById', () => {
	it('returns the matching stage', () => {
		expect(stageById('binding')).toEqual({ id: 'binding', label: 'Binding', order: 1 });
	});

	it('throws for an id outside the union when one is forced at runtime', () => {
		expect(() => stageById('nope' as StageId)).toThrow('Unknown stage: nope');
	});
});