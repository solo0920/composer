import { describe, expect, it } from 'vitest';
import { apiRegistry, componentRegistry } from '../../registry';
import { validateUIDefinition } from '../../domain/definitions/ui-definition.schema';
import { ComposerState, toJson } from './composer-state.svelte';

const registries = { hasComponent: componentRegistry.has, hasApi: apiRegistry.has };

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

		const validated = validateUIDefinition(candidate, registries);
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