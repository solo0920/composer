import { describe, expect, it } from 'vitest';
import { createApiRegistry } from './api-registry';
import { apiDefinitions } from './api-definitions';

describe('ApiRegistry', () => {
	const registry = createApiRegistry(apiDefinitions);

	it('lists the MVP APIs', () => {
		expect(registry.list().map((api) => api.id)).toEqual([
			'customer.getProfile',
			'risk.getScore',
			'portfolio.getPositions'
		]);
	});

	it('gets an API by id', () => {
		expect(registry.get('risk.getScore')?.path).toBe('/api/mock/risk/score');
	});

	it('returns undefined for an unknown API', () => {
		expect(registry.get('risk.explode')).toBeUndefined();
		expect(registry.has('risk.explode')).toBe(false);
	});

	it('groups APIs by domain for the binding picker', () => {
		expect(registry.listByCategory().map((group) => group.category)).toEqual([
			'Customer',
			'Risk',
			'Portfolio'
		]);
	});

	it('falls back to the id prefix when no category is declared', () => {
		const fallback = createApiRegistry([{ id: 'billing.invoices', name: 'Invoices', method: 'GET', path: '/x' }]);
		expect(fallback.listByCategory()).toEqual([{ category: 'billing', items: fallback.list() }]);
	});
});