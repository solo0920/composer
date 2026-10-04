import { describe, expect, it } from 'vitest';
import { registryLookup } from '../registry';
import { createDemoDefinition } from '../demo/customer-risk-dashboard';
import {
	clearDefinition,
	loadDefinition,
	saveDefinition,
	STORAGE_KEY,
	type DefinitionStorage
} from './definition-store';


function memoryStorage(initial: Record<string, string> = {}): DefinitionStorage & { map: Map<string, string> } {
	const map = new Map(Object.entries(initial));
	return {
		map,
		getItem: (key) => map.get(key) ?? null,
		setItem: (key, value) => void map.set(key, value),
		removeItem: (key) => void map.delete(key)
	};
}

describe('saveDefinition', () => {
	it('round-trips a definition through storage', () => {
		const storage = memoryStorage();
		const definition = createDemoDefinition();

		expect(saveDefinition(storage, definition).ok).toBe(true);

		const loaded = loadDefinition(storage, registryLookup);
		expect(loaded.ok).toBe(true);
		if (loaded.ok) expect(loaded.value).toEqual(definition);
	});

	it('writes pretty-printed JSON under the versioned key', () => {
		const storage = memoryStorage();
		saveDefinition(storage, createDemoDefinition());
		const raw = storage.getItem(STORAGE_KEY) ?? '';
		expect(raw).toContain('\n  "name": "Customer Risk Dashboard"');
	});

	it('reports a storage failure instead of throwing', () => {
		const failing: DefinitionStorage = {
			getItem: () => null,
			setItem: () => {
				throw new Error('QuotaExceededError');
			},
			removeItem: () => {}
		};
		const result = saveDefinition(failing, createDemoDefinition());
		expect(result).toEqual({ ok: false, error: 'Could not save definition: QuotaExceededError' });
	});
});

describe('loadDefinition', () => {
	it('reports when nothing has been saved', () => {
		const result = loadDefinition(memoryStorage(), registryLookup);
		expect(result).toEqual({ ok: false, error: 'No saved definition found.' });
	});

	it('rejects stored JSON that is not valid JSON', () => {
		const result = loadDefinition(memoryStorage({ [STORAGE_KEY]: '{oops' }), registryLookup);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toMatch(/^Saved definition is not valid JSON: /);
	});

	it('rejects a stored definition referencing an unknown component', () => {
		const tampered = {
			...createDemoDefinition(),
			components: [{ id: 'x', type: 'RiskScore', props: {}, layout: { column: 1, span: 6 } }]
		};
		const result = loadDefinition(memoryStorage({ [STORAGE_KEY]: JSON.stringify(tampered) }), registryLookup);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toBe('Invalid UI Definition: unknown component "RiskScore"');
		}
	});

	it('rejects a stored definition referencing an unknown API', () => {
		const definition = createDemoDefinition();
		const tampered = {
			...definition,
			components: definition.components.map((component, index) =>
				index === 1 ? { ...component, binding: { api: 'customer.getSecret' } } : component
			)
		};
		const result = loadDefinition(memoryStorage({ [STORAGE_KEY]: JSON.stringify(tampered) }), registryLookup);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toBe('Invalid UI Definition: unknown API "customer.getSecret"');
	});

	it('rejects a stored definition with a malformed binding expression', () => {
		const definition = createDemoDefinition();
		const tampered = {
			...definition,
			components: definition.components.map((component, index) =>
				index === 1
					? { ...component, binding: { api: 'customer.getProfile', input: { customerId: 'nope' } } }
					: component
			)
		};
		const result = loadDefinition(memoryStorage({ [STORAGE_KEY]: JSON.stringify(tampered) }), registryLookup);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toMatch(/^Invalid UI Definition: invalid binding input "customerId": /);
	});

	it('reports a read failure instead of throwing', () => {
		const failing: DefinitionStorage = {
			getItem: () => {
				throw new Error('SecurityError');
			},
			setItem: () => {},
			removeItem: () => {}
		};
		expect(loadDefinition(failing, registryLookup)).toEqual({
			ok: false,
			error: 'Could not read stored definition: SecurityError'
		});
	});
});

describe('clearDefinition', () => {
	it('removes the stored definition', () => {
		const storage = memoryStorage();
		saveDefinition(storage, createDemoDefinition());
		expect(clearDefinition(storage)).toEqual({ ok: true, value: null });
		expect(storage.getItem(STORAGE_KEY)).toBeNull();
		expect(loadDefinition(storage, registryLookup).ok).toBe(false);
	});

	it('reports a removal failure instead of throwing', () => {
		const failing: DefinitionStorage = {
			getItem: () => null,
			setItem: () => {},
			removeItem: () => {
				throw new Error('SecurityError');
			}
		};
		expect(clearDefinition(failing)).toEqual({
			ok: false,
			error: 'Could not clear saved definition: SecurityError'
		});
	});
});