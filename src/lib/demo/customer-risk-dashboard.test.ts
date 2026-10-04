import { describe, expect, it } from 'vitest';
import { apiRegistry, componentRegistry, registryLookup } from '../registry';
import { validateUIDefinition } from '../domain/definitions/ui-definition.schema';
import { createDemoDefinition, PREVIEW_CONTEXT } from './customer-risk-dashboard';


describe('Customer Risk Dashboard demo', () => {
	it('is a definition that passes full validation against the registryLookup', () => {
		const result = validateUIDefinition(createDemoDefinition(), registryLookup);
		expect(result.ok).toBe(true);
	});

	it('wires each card to a distinct registered API', () => {
		const bound = createDemoDefinition().components.flatMap((component) =>
			component.binding ? [component.binding.api] : []
		);

		expect(bound).toEqual([
			'customer.getProfile',
			'risk.getScore',
			'portfolio.getPositions'
		]);
	});

	it('reads customerId from the preview context', () => {
		const bound = createDemoDefinition().components.filter((component) => component.binding !== undefined);
		expect(bound).toHaveLength(3);

		for (const component of bound) {
			expect(component.binding?.input).toEqual({ customerId: '$context.customerId' });
		}
		expect(PREVIEW_CONTEXT.customerId).toBe('CUST-1001');
	});

	it('resolves a customerId that every mock endpoint serves', async () => {
		const { customerProfileHandler, riskScoreHandler, portfolioPositionsHandler } = await import(
			'../server/mock-api'
		);
		const url = `http://localhost/?customerId=${PREVIEW_CONTEXT.customerId}`;

		for (const handler of [customerProfileHandler, riskScoreHandler, portfolioPositionsHandler]) {
			expect(handler(new Request(url)).status).toBe(200);
		}
	});

	it('lays out a full-width title, a full-width profile and two half-width cards', () => {
		const definition = createDemoDefinition();
		const layout = definition.components.map((component) => ({
			type: component.type,
			...component.layout
		}));

		expect(layout).toEqual([
			{ type: 'text', column: 1, span: 12 },
			{ type: 'data-card', column: 1, span: 12 },
			{ type: 'data-card', column: 1, span: 6 },
			{ type: 'data-card', column: 7, span: 6 }
		]);
	});

	it('uses only components that exist in the Component Registry', () => {
		for (const component of createDemoDefinition().components) {
			expect(componentRegistry.has(component.type)).toBe(true);
			expect(componentRegistry.get(component.type)?.label).toBeDefined();
		}
	});

	it('creates a fresh object on every call so callers cannot mutate the demo', () => {
		const first = createDemoDefinition();
		first.components.pop();
		expect(createDemoDefinition().components).toHaveLength(4);
	});
});

describe('API registry metadata used by the demo', () => {
	it('declares the mock endpoints the demo binds to', () => {
		expect(apiRegistry.get('customer.getProfile')?.path).toBe('/api/mock/customer/profile');
		expect(apiRegistry.get('risk.getScore')?.path).toBe('/api/mock/risk/score');
		expect(apiRegistry.get('portfolio.getPositions')?.path).toBe('/api/mock/portfolio/positions');
	});
});