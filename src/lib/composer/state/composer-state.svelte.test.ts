import { describe, expect, it } from 'vitest';
import { apiRegistry, componentRegistry, registryLookup } from '../../registry';
import { validateUIDefinition } from '../../domain/definitions/ui-definition.schema';
import { ComposerState, toJson } from './composer-state.svelte';


function makeState(): ComposerState {
	return new ComposerState(componentRegistry, apiRegistry);
}

describe('ComposerState', () => {
	it('starts empty, clean and with nothing selected', () => {
		const state = makeState();
		expect(state.definition.components).toEqual([]);
		expect(state.selectedComponentId).toBeNull();
		expect(state.dirty).toBe(false);
		expect(state.selectedComponent).toBeUndefined();
	});

	it('adds a component from the registry and selects it', () => {
		const state = makeState();
		const instance = state.addComponent('data-card');

		expect(instance?.type).toBe('data-card');
		expect(state.definition.components).toHaveLength(1);
		expect(state.selectedComponentId).toBe(instance?.id);
		expect(state.dirty).toBe(true);
	});

	it('refuses to add an unknown component type', () => {
		const state = makeState();
		expect(state.addComponent('RiskScore')).toBeUndefined();
		expect(state.definition.components).toHaveLength(0);
	});

	it('removes a component and clears the selection', () => {
		const state = makeState();
		const instance = state.addComponent('text');
		state.removeComponent(instance!.id);

		expect(state.definition.components).toHaveLength(0);
		expect(state.selectedComponentId).toBeNull();
	});

	it('exposes the selected component registry metadata', () => {
		const state = makeState();
		const instance = state.addComponent('text');
		expect(state.selectedComponentDefinition?.label).toBe('Text');
		expect(state.selectedComponentDefinition?.propsSchema.map((f) => f.key)).toEqual(['text', 'variant']);
	});

	it('updates props without losing the other props', () => {
		const state = makeState();
		const instance = state.addComponent('text')!;
		state.updateProps(instance.id, { text: 'Hello' });

		expect(state.selectedComponent?.props).toEqual({ text: 'Hello', variant: 'heading' });
	});

	it('clamps layout edits into the grid', () => {
		const state = makeState();
		const instance = state.addComponent('text')!;
		state.updateLayout(instance.id, { column: 11, span: 8 });
		expect(state.selectedComponent?.layout).toEqual({ column: 5, span: 8 });
	});

	it('ignores updates for an unknown component id', () => {
		const state = makeState();
		state.addComponent('text');
		state.updateProps('nope', { text: 'x' });
		state.updateLayout('nope', { column: 1, span: 1 });
		state.removeComponent('nope');

		expect(state.definition.components).toHaveLength(1);
		expect(state.definition.components[0].props['text']).toBe('Text');
	});

	it('attaches and detaches a binding', () => {
		const state = makeState();
		const instance = state.addComponent('data-card')!;

		state.setBinding(instance.id, { api: 'risk.getScore', output: { score: '$.score' } });
		expect(state.selectedComponent?.binding).toEqual({
			api: 'risk.getScore',
			output: { score: '$.score' }
		});

		state.setBinding(instance.id, undefined);
		expect(state.selectedComponent?.binding).toBeUndefined();
		expect('binding' in (state.selectedComponent ?? {})).toBe(false);
	});

	it('suggests input and output mappings from API registry metadata', () => {
		const state = makeState();
		expect(state.suggestBinding('customer.getProfile')).toEqual({
			api: 'customer.getProfile',
			input: { customerId: '$context.customerId' },
			output: {
				name: '$.name',
				email: '$.email',
				tier: '$.tier',
				memberSince: '$.memberSince'
			}
		});
	});

	it('suggests nothing for an unknown API', () => {
		expect(makeState().suggestBinding('nope')).toBeUndefined();
	});

	it('replaces the definition and drops a now-invalid selection', () => {
		const state = makeState();
		const instance = state.addComponent('text')!;
		state.selectComponent(instance.id);

		state.setDefinition({
			id: 'def-2',
			version: 1,
			name: 'Replaced',
			layout: { type: 'grid', columns: 12 },
			components: []
		});

		expect(state.selectedComponentId).toBeNull();
		expect(state.definition.name).toBe('Replaced');
	});

	it('keeps a selection that still exists after a definition replacement', () => {
		const state = makeState();
		const instance = state.addComponent('text')!;
		const next = {
			...state.definition,
			components: state.definition.components.map((component) =>
				component.id === instance.id ? { ...component, props: { ...component.props, text: 'Kept' } } : component
			)
		};

		state.setDefinition(next);
		expect(state.selectedComponentId).toBe(instance.id);
		expect(state.selectedComponent?.props['text']).toBe('Kept');
	});

	it('renames the definition', () => {
		const state = makeState();
		state.rename('Dashboard');
		expect(state.definition.name).toBe('Dashboard');
		expect(state.dirty).toBe(true);
	});

	it('adds a component at the root when nothing is selected', () => {
		const state = makeState();
		const instance = state.addComponent('text');
		expect(state.definition.components).toHaveLength(1);
		expect(instance?.layout).toEqual({ column: 1, span: 12 });
	});

	it('adds a component inside the selected container', () => {
		const state = makeState();
		const box = state.addComponent('container')!;
		const child = state.addComponent('text')!;

		expect(state.definition.components).toHaveLength(1);
		expect(state.definition.components[0].children?.map((c) => c.id)).toEqual([child.id]);
		expect(box.id).toBe(state.definition.components[0].id);
	});

it('stays on the container while nesting so repeated adds become siblings', () => {
		const state = makeState();
		state.addComponent('container');

		const first = state.addComponent('text')!;
		const second = state.addComponent('text')!;

		expect(state.definition.components[0].children?.map((c) => c.id)).toEqual([first.id, second.id]);
		// The selection is the container, not the newest child.
		expect(state.insertParentId).toBe(state.definition.components[0].id);
	});

it('nests deeper once an inner container is selected', () => {
		const state = makeState();
		const outer = state.addComponent('container')!;
		const inner = state.addComponent('container')!;

		// Still inside the outer container, so this second one is a sibling.
		expect(state.definition.components[0].children?.map((c) => c.id)).toEqual([inner.id]);

		// Select the inner container, then add: the child lands one level deeper.
		state.selectComponent(inner.id);
		const leaf = state.addComponent('text')!;

		expect(state.definition.components[0].children?.[0].children?.map((c) => c.id)).toEqual([leaf.id]);
		expect(outer.id).toBe(state.definition.components[0].id);
	});

	it('adds at the root when the selected component cannot contain children', () => {
		const state = makeState();
		state.addComponent('text');
		const second = state.addComponent('button');

		expect(state.definition.components).toHaveLength(2);
		expect(state.definition.components[0].children).toBeUndefined();
		expect(second).toBeDefined();
	});

	it('nests several levels deep by selecting each container in turn', () => {
		const state = makeState();
		const a = state.addComponent('container')!;
		const b = state.addComponent('container')!;

		state.selectComponent(b.id);
		const c = state.addComponent('text')!;

		expect(state.definition.components[0].id).toBe(a.id);
		expect(state.definition.components[0].children?.[0].id).toBe(b.id);
		expect(state.definition.components[0].children?.[0].children?.[0].id).toBe(c.id);
		expect(state.insertParentId).toBe(b.id);
	});

	it('refuses to nest into a component id that does not accept children', () => {
		const state = makeState();
		const text = state.addComponent('text')!;
		expect(state.addComponent('button', text.id)).toBeUndefined();
		expect(state.definition.components[0].children).toBeUndefined();
	});

	it('finds, edits and deletes a component nested several levels deep', () => {
		const state = makeState();
		const box = state.addComponent('container')!;
		const inner = state.addComponent('container')!;
		state.selectComponent(inner.id);
		const leaf = state.addComponent('text')!;
		state.selectComponent(leaf.id);

		state.updateProps(leaf.id, { text: 'Deep edit' });
		expect(state.selectedComponent?.props['text']).toBe('Deep edit');

		state.updateLayout(leaf.id, { column: 2, span: 3 });
		expect(state.selectedComponent?.layout).toEqual({ column: 2, span: 3 });

		state.removeComponent(leaf.id);
		expect(state.definition.components[0].children?.[0].children).toBeUndefined();
		expect(state.selectedComponentId).toBeNull();
		expect(box.id).toBe(state.definition.components[0].id);
	});

	it('keeps a selection that still exists after a definition replacement', () => {
		const state = makeState();
		state.addComponent('container');
		const child = state.addComponent('text')!;
		state.selectComponent(child.id);

		state.setDefinition({
			id: 'def-9',
			version: 1,
			name: 'Flattened',
			layout: { type: 'grid', columns: 12 },
			components: [{ id: child.id, type: 'text', props: {}, layout: { column: 1, span: 12 } }]
		});

		expect(state.selectedComponentId).toBe(child.id);
	});

it('drops a selection when a definition replacement removes that nested component', () => {
		const state = makeState();
		state.addComponent('container');
		const child = state.addComponent('text')!;
		state.selectComponent(child.id);

		state.setDefinition({
			id: 'def-10',
			version: 1,
			name: 'Without it',
			layout: { type: 'grid', columns: 12 },
			components: []
		});

		expect(state.selectedComponentId).toBeNull();
	});

	it('clamps the grid column count', () => {
		const state = makeState();
		state.setColumns(6);
		expect(state.definition.layout.columns).toBe(6);
		state.setColumns(0);
		expect(state.definition.layout.columns).toBe(1);
		state.setColumns(99);
		expect(state.definition.layout.columns).toBe(24);
		state.setColumns(7.6);
		expect(state.definition.layout.columns).toBe(8);
	});

	it('clears the dirty flag on markSaved', () => {
		const state = makeState();
		state.addComponent('text');
		expect(state.dirty).toBe(true);
		state.markSaved();
		expect(state.dirty).toBe(false);
	});

	it('accepts a JSON editor payload that passes validation', () => {
		const state = makeState();
		const candidate = {
			id: 'def-3',
			version: 1,
			name: 'From JSON',
			layout: { type: 'grid', columns: 12 },
			components: [
				{ id: 'a', type: 'button', props: { label: 'Hi' }, layout: { column: 1, span: 3 } }
			]
		};

		const validated = validateUIDefinition(candidate, registryLookup);
		expect(validated.ok).toBe(true);
		if (validated.ok) {
			state.setDefinition(validated.value);
			expect(state.definition.components[0].type).toBe('button');
		}
	});
});

describe('toJson', () => {
	it('serialises the definition as indented JSON', () => {
		const state = makeState();
		state.rename('Demo');
		expect(toJson(state.definition)).toBe(JSON.stringify(state.definition, null, 2));
		expect(toJson(state.definition)).toContain('"name": "Demo"');
	});
});