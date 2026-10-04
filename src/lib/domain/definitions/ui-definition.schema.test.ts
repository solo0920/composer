import { describe, expect, it } from 'vitest';
import { parseUIDefinition, validateUIDefinition } from './ui-definition.schema';
import { MAX_COMPONENT_DEPTH } from './ui-definition';
import type { UIComponentInstance } from './ui-definition';
import { registryLookup } from '../../registry';

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
		expect(validateUIDefinition(valid, registryLookup).ok).toBe(true);
	});

	it('rejects an unknown component with a readable message', () => {
		const result = validateUIDefinition(
			{ ...valid, components: [{ ...valid.components[0], type: 'RiskScore' }] },
			registryLookup
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
			registryLookup
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
			registryLookup
		);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toMatch(/^Invalid UI Definition: invalid binding input "customerId": /);
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
			registryLookup
		);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toMatch(/^Invalid UI Definition: invalid binding output "name": /);
	});

	it('rejects duplicate component ids', () => {
		const result = validateUIDefinition(
			{ ...valid, components: [valid.components[0], valid.components[0]] },
			registryLookup
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
			registryLookup
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
			registryLookup
		);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toMatch(/starts at column 5 but the grid has 4/);
	});

	it('accepts a definition with no components and no bindings', () => {
		expect(validateUIDefinition({ ...valid, components: [] }, registryLookup).ok).toBe(true);
	});

it('accepts nested children inside a component that accepts them', () => {
		const nested = {
			...valid,
			components: [
				{
					id: 'box',
					type: 'container',
					props: {},
					layout: { column: 1, span: 12 },
					children: [valid.components[0]]
				}
			]
		};
		expect(validateUIDefinition(nested, registryLookup).ok).toBe(true);
	});

it('rejects children inside a component that cannot contain them', () => {
		const nested = {
			...valid,
			components: [
				{
					id: 'text-1',
					type: 'text',
					props: {},
					layout: { column: 1, span: 12 },
					children: [{ id: 'kid', type: 'text', props: {}, layout: { column: 1, span: 6 } }]
				}
			]
		};
		const result = validateUIDefinition(nested, registryLookup);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toBe('Invalid UI Definition: component "text" cannot contain children');
		}
	});

it('rejects a duplicate id inside a nested subtree', () => {
		const nested = {
			...valid,
			components: [
				{
					id: 'box',
					type: 'container',
					props: {},
					layout: { column: 1, span: 12 },
					children: [valid.components[0], { ...valid.components[0] }]
				}
			]
		};
		const result = validateUIDefinition(nested, registryLookup);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toMatch(/duplicate component id "c1"/);
	});

it('rejects an unknown component type nested deep in the tree', () => {
		const nested = {
			...valid,
			components: [
				{
					id: 'box',
					type: 'container',
					props: {},
					layout: { column: 1, span: 12 },
					children: [
						{
							id: 'inner',
							type: 'container',
							props: {},
							layout: { column: 1, span: 12 },
							children: [
								{ id: 'deep', type: 'NopeWidget', props: {}, layout: { column: 1, span: 6 } }
							]
						}
					]
				}
			]
		};
		const result = validateUIDefinition(nested, registryLookup);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toBe('Invalid UI Definition: unknown component "NopeWidget"');
	});

it('rejects an invalid binding inside a nested component', () => {
		const nested = {
			...valid,
			components: [
				{
					id: 'box',
					type: 'container',
					props: {},
					layout: { column: 1, span: 12 },
					children: [
						{
							id: 'c1',
							type: 'data-card',
							props: {},
							layout: { column: 1, span: 6 },
							binding: { api: 'customer.getProfile', output: { name: 'name' } }
						}
					]
				}
			]
		};
		const result = validateUIDefinition(nested, registryLookup);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toMatch(/^Invalid UI Definition: invalid binding output "name": /);
	});

it('rejects nesting deeper than the maximum without overflowing', () => {
		let node: UIComponentInstance = {
			id: 'leaf',
			type: 'container',
			props: {},
			layout: { column: 1, span: 12 }
		};
		for (let i = 0; i < MAX_COMPONENT_DEPTH + 2; i += 1) {
			node = {
				id: `n${i}`,
				type: 'container',
				props: {},
				layout: { column: 1, span: 12 },
				children: [node]
			};
		}
		const result = validateUIDefinition({ ...valid, components: [node] }, registryLookup);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toMatch(
				new RegExp(`component nesting is \\d+ levels deep, the maximum is ${MAX_COMPONENT_DEPTH}`)
			);
		}
	});
});