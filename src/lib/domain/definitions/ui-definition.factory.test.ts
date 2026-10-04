import { describe, expect, it } from 'vitest';
import {
	createComponentInstance,
	createUIDefinition,
	findComponent,
	resolveLayout,
	updateLayout,
	updateProps
} from './ui-definition.factory';
import { componentDefinitions } from '../../registry/component-definitions';
import type { ComponentDefinition } from '../components/component-definition';

const text = componentDefinitions.find((c) => c.type === 'text') as ComponentDefinition;
const button = componentDefinitions.find((c) => c.type === 'button') as ComponentDefinition;

describe('createUIDefinition', () => {
	it('creates an empty definition with the default 12-column grid', () => {
		const definition = createUIDefinition('Empty', 'def-1');
		expect(definition).toEqual({
			id: 'def-1',
			version: 1,
			name: 'Empty',
			layout: { type: 'grid', columns: 12 },
			components: []
		});
	});
});

describe('createComponentInstance', () => {
	it('seeds props and layout from the registry definition', () => {
		const instance = createComponentInstance(text, 'c1');
		expect(instance).toEqual({
			id: 'c1',
			type: 'text',
			props: { text: 'Text', variant: 'heading' },
			layout: { column: 1, span: 12 }
		});
	});

	it('does not share the default props object between instances', () => {
		const a = createComponentInstance(text, 'c1');
		const b = createComponentInstance(text, 'c2');
		a.props['text'] = 'changed';
		expect(b.props['text']).toBe('Text');
	});

	it('clamps a default span wider than the grid', () => {
		const instance = createComponentInstance(text, 'c1', 4);
		expect(instance.layout).toEqual({ column: 1, span: 4 });
	});

	it('clamps a default column that would overflow the grid', () => {
		const narrow = { ...text, defaultLayout: { column: 1, span: 4 } };
		expect(createComponentInstance(narrow, 'c1', 4).layout).toEqual({ column: 1, span: 4 });
		const offset = { ...text, defaultLayout: { column: 3, span: 4 } };
		expect(createComponentInstance(offset, 'c1', 4).layout).toEqual({ column: 1, span: 4 });
	});
});

describe('findComponent', () => {
	const definition = createUIDefinition('D', 'def-1');
	definition.components = [createComponentInstance(text, 'c1'), createComponentInstance(button, 'c2')];

	it('finds by id', () => {
		expect(findComponent(definition, 'c2')?.type).toBe('button');
	});

	it('returns undefined for null or unknown ids', () => {
		expect(findComponent(definition, null)).toBeUndefined();
		expect(findComponent(definition, 'nope')).toBeUndefined();
	});
});

describe('updateProps', () => {
	it('merges a patch and returns a new instance', () => {
		const instance = createComponentInstance(text, 'c1');
		const next = updateProps(instance, { text: 'Hello' });
		expect(next.props).toEqual({ text: 'Hello', variant: 'heading' });
		expect(instance.props['text']).toBe('Text');
	});

	it('can write a number and a boolean, not just strings', () => {
		const instance = createComponentInstance(text, 'c1');
		expect(updateProps(instance, { size: 12, visible: true }).props).toEqual({
			text: 'Text',
			variant: 'heading',
			size: 12,
			visible: true
		});
	});
});

describe('updateLayout', () => {
	it('updates column and span', () => {
		const instance = createComponentInstance(text, 'c1');
		expect(updateLayout(instance, { column: 3, span: 4 }, 12).layout).toEqual({ column: 3, span: 4 });
	});

	it('clamps span and column into the grid', () => {
		const instance = createComponentInstance(text, 'c1');
		expect(updateLayout(instance, { column: 11, span: 6 }, 12).layout).toEqual({ column: 7, span: 6 });
		expect(updateLayout(instance, { column: 0, span: 0 }, 12).layout).toEqual({ column: 1, span: 1 });
	});

	it('preserves an explicit row', () => {
		const instance = createComponentInstance(text, 'c1');
		expect(updateLayout(instance, { column: 1, span: 4, row: 3 }, 12).layout).toEqual({
			column: 1,
			span: 4,
			row: 3
		});
	});
});

describe('resolveLayout', () => {
	it('defaults to a full-width first-column placement', () => {
		expect(resolveLayout(undefined, 12)).toEqual({ column: 1, span: 12 });
	});
});