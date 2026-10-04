import { describe, expect, it } from 'vitest';
import { createComponentRegistry } from './component-registry';
import { componentDefinitions } from './component-definitions';

describe('ComponentRegistry', () => {
	const registry = createComponentRegistry(componentDefinitions);

	it('lists the MVP components', () => {
		expect(registry.list().map((c) => c.type)).toEqual(['container', 'text', 'button', 'data-card']);
	});

	it('gets a component by type', () => {
		expect(registry.get('text')?.label).toBe('Text');
	});

	it('returns undefined for an unknown component', () => {
		expect(registry.get('RiskScore')).toBeUndefined();
		expect(registry.has('RiskScore')).toBe(false);
		expect(registry.acceptsChildren('RiskScore')).toBe(false);
	});

it('reports which components accept children', () => {
		expect(registry.acceptsChildren('container')).toBe(true);
		expect(registry.acceptsChildren('text')).toBe(false);
		expect(registry.acceptsChildren('button')).toBe(false);
		expect(registry.acceptsChildren('data-card')).toBe(false);
	});

	it('groups components by category in palette order', () => {
		expect(registry.listByCategory().map((group) => group.category)).toEqual(['Layout', 'Basic', 'Data']);
		expect(registry.listByCategory()[1].items.map((c) => c.type)).toEqual(['text', 'button']);
	});

	it('exposes a copy of the list so callers cannot mutate the registry', () => {
		const list = registry.list();
		list.pop();
		expect(registry.list()).toHaveLength(componentDefinitions.length);
	});

	it('supports an empty registry', () => {
		const empty = createComponentRegistry([]);
		expect(empty.list()).toEqual([]);
		expect(empty.get('text')).toBeUndefined();
	});
});