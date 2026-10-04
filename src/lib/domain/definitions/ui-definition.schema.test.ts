import { describe, expect, it } from 'vitest';
import { parseUIDefinition, validateUIDefinition } from './ui-definition.schema';
import { apiRegistry, componentRegistry } from '../../registry';

const registries = { hasComponent: componentRegistry.has, hasApi: apiRegistry.has };

const valid = {
	id: 'def-1',
	version: 1,
	name: 'Dashboard',
	layout: { type: 'grid', columns: 12 },
	components: [
		{
			id: 'c1',
			type: 'data-card',
			props: { title: 'Profile' },
			layout: { column: 1, span: 6 },
			binding: {
				api: 'customer.getProfile',
				input: { customerId: '$context.customerId' },
				output: { name: '$.name' }
			}
		}
	]
};

describe('parseUIDefinition', () => {
	it('accepts a well-formed definition', () => {
		const result = parseUIDefinition(valid);
		expect(result.ok).toBe(true);
	});

	it('rejects a non-object', () => {
		const result = parseUIDefinition('nope');
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toMatch(/^Invalid UI Definition: /);
	});

	it('reports a readable message for a missing field', () => {
		const result = parseUIDefinition({ ...valid, components: [{ id: 'c1', type: 'text' }] });
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toMatch(/components\.0/);
	});

	it('rejects an unsupported layout type', () => {
		const result = parseUIDefinition({ ...valid, layout: { type: 'flex', columns: 12 } });
		expect(result.ok).toBe(false);
	});

	it('rejects non-integer grid columns', () => {
		const result = parseUIDefinition({ ...valid, layout: { type: 'grid', columns: 2.5 } });
		expect(result.ok).toBe(false);
	});
});

describe('validateUIDefinition', () => {
	it('accepts a definition that only references registered components and APIs', () => {
		expect(validateUIDefinition(valid, registries).ok).toBe(true);
	});

	it('rejects an unknown component with a readable message', () => {
		const result = validateUIDefinition(
			{ ...valid, components: [{ ...valid.components[0], type: 'RiskScore' }] },
			registries
		);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toBe('Invalid UI Definition: unknown component "RiskScore"');
	});

	it('rejects an unknown API with a readable message', () => {
		const result = validateUIDefinition(
			{
				...valid,
				components: [{ ...valid.components[0], binding: { api: 'risk.getScores' } }]
			},
			registries
		);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toBe('Invalid UI Definition: unknown API "risk.getScores"');
	});

	it('rejects an invalid input mapping expression', () => {
		const result = validateUIDefinition(
			{
				...valid,
				components: [
					{
						...valid.components[0],
						binding: { api: 'customer.getProfile', input: { customerId: 'customerId' } }
					}
				]
			},
			registries
		);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toMatch(/^Invalid binding input "customerId": /);
	});

	it('rejects an invalid output mapping expression', () => {
		const result = validateUIDefinition(
			{
				...valid,
				components: [
					{
						...valid.components[0],
						binding: { api: 'customer.getProfile', output: { name: 'name' } }
					}
				]
			},
			registries
		);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toMatch(/^Invalid binding output "name": /);
	});

	it('rejects duplicate component ids', () => {
		const result = validateUIDefinition(
			{ ...valid, components: [valid.components[0], valid.components[0]] },
			registries
		);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toMatch(/duplicate component id "c1"/);
	});

	it('rejects a component wider than the grid', () => {
		const result = validateUIDefinition(
			{
				...valid,
				layout: { type: 'grid', columns: 4 },
				components: [{ ...valid.components[0], layout: { column: 1, span: 6 } }]
			},
			registries
		);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toMatch(/spans 6 columns but the grid has 4/);
	});

	it('rejects a component starting past the last column', () => {
		const result = validateUIDefinition(
			{
				...valid,
				layout: { type: 'grid', columns: 4 },
				components: [{ ...valid.components[0], layout: { column: 5, span: 2 } }]
			},
			registries
		);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toMatch(/starts at column 5 but the grid has 4/);
	});

	it('accepts a definition with no components and no bindings', () => {
		expect(validateUIDefinition({ ...valid, components: [] }, registries).ok).toBe(true);
	});
});