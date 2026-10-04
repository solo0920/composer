import { describe, expect, it } from 'vitest';
import type { AppDocument } from '../domain/apps/app-document';
import { createDemoDefinition, PREVIEW_CONTEXT } from '../demo/customer-risk-dashboard';
import { createDemoFlows } from '../demo/customer-risk-dashboard.flows';
import { stackRegistry } from '../registry';
import { registryLookup } from '../registry';
import {
	APP_KEY_PREFIX,
	INDEX_KEY,
	appKey,
	createApp,
	deleteApp,
	exportAppJson,
	getActiveAppId,
	listApps,
	loadApp,
	parseExport,
	readIndex,
	saveApp,
	setActiveApp,
	type AppStorage
} from './app-library';

function memoryStorage(initial: Record<string, string> = {}): AppStorage & { map: Map<string, string> } {
	const map = new Map(Object.entries(initial));
	return {
		map,
		getItem: (key) => map.get(key) ?? null,
		setItem: (key, value) => void map.set(key, value),
		removeItem: (key) => void map.delete(key)
	};
}

function makeApp(overrides: Partial<AppDocument> = {}): AppDocument {
	const now = new Date().toISOString();
	return {
		id: 'app-1',
		name: 'Customer Risk Dashboard',
		createdAt: now,
		updatedAt: now,
		definition: createDemoDefinition(),
		context: { ...PREVIEW_CONTEXT },
		flows: createDemoFlows(),
		...overrides
	};
}

describe('createApp', () => {
	it('stores the app and lists it', () => {
		const storage = memoryStorage();
		const result = createApp(storage, makeApp());
		expect(result.ok).toBe(true);

		expect(storage.map.has(appKey('app-1'))).toBe(true);
		expect(listApps(storage)).toEqual({ ok: true, value: [expect.objectContaining({ id: 'app-1' })] });
	});

	it('counts nested components in the library summary', () => {
		const storage = memoryStorage();
		const app = makeApp();
		app.definition.components[0].children = [app.definition.components[1]];

		createApp(storage, app);
		const apps = listApps(storage);
		expect(apps.ok).toBe(true);
		if (apps.ok) expect(apps.value[0].componentCount).toBe(5);
	});

	it('refuses to reuse an existing app id', () => {
		const storage = memoryStorage();
		createApp(storage, makeApp());
		const second = createApp(storage, makeApp({ name: 'Duplicate' }));

		expect(second).toEqual({ ok: false, error: 'App already exists: Duplicate' });
	});

	it('round-trips a full app through storage', () => {
		const storage = memoryStorage();
		const app = makeApp();
		createApp(storage, app);

		const loaded = loadApp(storage, 'app-1', registryLookup);
		expect(loaded.ok).toBe(true);
		if (loaded.ok) {
			expect(loaded.value.name).toBe(app.name);
			expect(loaded.value.definition).toEqual(app.definition);
			expect(loaded.value.context).toEqual(app.context);
		}
	});
});

describe('saveApp', () => {
	it('updates an existing app in place rather than duplicating it', () => {
		const storage = memoryStorage();
		createApp(storage, makeApp());
		const saved = saveApp(storage, makeApp({ name: 'Renamed' }));

		expect(saved.ok).toBe(true);
		const apps = listApps(storage);
		expect(apps.ok).toBe(true);
		if (apps.ok) {
			expect(apps.value).toHaveLength(1);
			expect(apps.value[0].name).toBe('Renamed');
		}
	});

	it('keeps createdAt but refreshes updatedAt', () => {
		const storage = memoryStorage();
		const app = makeApp({ createdAt: '2020-01-01T00:00:00.000Z' });
		createApp(storage, app);

		const saved = saveApp(storage, { ...app, name: 'Later' });
		expect(saved.ok).toBe(true);
		if (saved.ok) {
			expect(saved.value.createdAt).toBe('2020-01-01T00:00:00.000Z');
			expect(new Date(saved.value.updatedAt).getTime()).toBeGreaterThanOrEqual(
				new Date('2020-01-01T00:00:00.000Z').getTime()
			);
		}
	});

	it('sorts the library by most recently updated on every write', () => {
		// Write an index with deliberately distinct timestamps and an order that
		// is not newest-first, then save a third app and check the re-sort.
		const storage = memoryStorage({
			[INDEX_KEY]: JSON.stringify({
				activeId: 'a',
				apps: [
					{ id: 'a', name: 'A', updatedAt: '2025-01-01T00:00:00.000Z', componentCount: 0 },
					{ id: 'b', name: 'B', updatedAt: '2024-01-01T00:00:00.000Z', componentCount: 0 }
				]
			})
		});

		// The new save is stamped with the current time, so it is the newest.
		expect(saveApp(storage, makeApp({ id: 'c', name: 'C' })).ok).toBe(true);

		const apps = listApps(storage);
		expect(apps.ok).toBe(true);
		if (apps.ok) expect(apps.value.map((a) => a.id)).toEqual(['c', 'a', 'b']);
	});

	it('breaks same-millisecond ties by id so ordering is stable', () => {
		const storage = memoryStorage();
		createApp(storage, makeApp({ id: 'b', name: 'B' }));
		createApp(storage, makeApp({ id: 'a', name: 'A' }));

		const apps = listApps(storage);
		expect(apps.ok).toBe(true);
		if (apps.ok) expect(apps.value.map((a) => a.id)).toEqual(['a', 'b']);
	});

	it('reports a storage write failure instead of throwing', () => {
		const failing: AppStorage = {
			getItem: () => null,
			setItem: () => {
				throw new Error('QuotaExceededError');
			},
			removeItem: () => {}
		};
		expect(saveApp(failing, makeApp())).toEqual({
			ok: false,
			error: 'Could not save app: QuotaExceededError'
		});
	});
});

describe('loadApp', () => {
	it('reports an unknown app id', () => {
		expect(loadApp(memoryStorage(), 'nope', registryLookup)).toEqual({
			ok: false,
			error: 'App not found: nope'
		});
	});

	it('reports malformed JSON with a readable message', () => {
		const storage = memoryStorage({ [appKey('app-1')]: '{oops' });
		const result = loadApp(storage, 'app-1', registryLookup);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toMatch(/^Saved data is not valid JSON: /);
	});

	it('rejects an app whose name is missing', () => {
		const storage = memoryStorage();
		createApp(storage, makeApp());
		const tampered = JSON.parse(storage.map.get(appKey('app-1')) ?? '{}');
		tampered.name = '';
		storage.map.set(appKey('app-1'), JSON.stringify(tampered));

		const result = loadApp(storage, 'app-1', registryLookup);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toMatch(/^Invalid app: /);
	});

	it('rejects an app whose definition references a removed component', () => {
		const storage = memoryStorage();
		const app = makeApp();
		createApp(storage, app);

		const tampered = JSON.parse(storage.map.get(appKey('app-1')) ?? '{}');
		tampered.definition.components[0].type = 'RiskScore';
		storage.map.set(appKey('app-1'), JSON.stringify(tampered));

		const result = loadApp(storage, 'app-1', registryLookup);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toContain('unknown component "RiskScore"');
		}
	});

	it('reports a storage read failure instead of throwing', () => {
		const failing: AppStorage = {
			getItem: () => {
				throw new Error('SecurityError');
			},
			setItem: () => {},
			removeItem: () => {}
		};

		const result = loadApp(failing, 'app-1', registryLookup);
		expect(result).toEqual({ ok: false, error: 'Could not read storage: SecurityError' });
	});
});

describe('deleteApp', () => {
	it('removes the document and the index entry', () => {
		const storage = memoryStorage();
		createApp(storage, makeApp());

		expect(deleteApp(storage, 'app-1')).toEqual({ ok: true, value: null });
		expect(storage.map.has(appKey('app-1'))).toBe(false);
		expect(listApps(storage)).toEqual({ ok: true, value: [] });
	});

	it('clears activeId when the active app is deleted', () => {
		const storage = memoryStorage();
		createApp(storage, makeApp());
		expect(getActiveAppId(storage)).toEqual({ ok: true, value: 'app-1' });

		deleteApp(storage, 'app-1');
		expect(getActiveAppId(storage)).toEqual({ ok: true, value: null });
	});

	it('leaves other apps untouched', () => {
		const storage = memoryStorage();
		createApp(storage, makeApp({ id: 'a', name: 'A' }));
		createApp(storage, makeApp({ id: 'b', name: 'B' }));

		deleteApp(storage, 'a');
		const apps = listApps(storage);
		expect(apps.ok).toBe(true);
		if (apps.ok) expect(apps.value.map((a) => a.id)).toEqual(['b']);
	});

	it('is a no-op for an unknown id', () => {
		const storage = memoryStorage();
		createApp(storage, makeApp());
		expect(deleteApp(storage, 'nope')).toEqual({ ok: true, value: null });
		expect(listApps(storage).ok).toBe(true);
	});
});

describe('active app', () => {
	it('defaults to null on a fresh store', () => {
		expect(getActiveAppId(memoryStorage())).toEqual({ ok: true, value: null });
	});

	it('is set when the first app is saved', () => {
		const storage = memoryStorage();
		createApp(storage, makeApp());
		expect(getActiveAppId(storage)).toEqual({ ok: true, value: 'app-1' });
	});

	it('can be set and cleared explicitly', () => {
		const storage = memoryStorage();
		createApp(storage, makeApp({ id: 'a', name: 'A' }));
		createApp(storage, makeApp({ id: 'b', name: 'B' }));

		setActiveApp(storage, 'b');
		expect(getActiveAppId(storage)).toEqual({ ok: true, value: 'b' });

		setActiveApp(storage, null);
		expect(getActiveAppId(storage)).toEqual({ ok: true, value: null });
	});
});

describe('index corruption', () => {
	it('reports a malformed index instead of throwing', () => {
		const storage = memoryStorage({ [INDEX_KEY]: '{broken' });
		const result = listApps(storage);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toMatch(/not valid JSON/);
	});

	it('reports an index missing required fields', () => {
		const storage = memoryStorage({ [INDEX_KEY]: JSON.stringify({ apps: 'nope' }) });
		expect(listApps(storage).ok).toBe(false);
	});

	it('starts empty when no index exists', () => {
		expect(readIndex(memoryStorage())).toEqual({ ok: true, value: { activeId: null, apps: [] } });
	});

	it('uses a versioned key so old single-definition saves are ignored', () => {
		expect(INDEX_KEY).toMatch(/v\d+$/);
		expect(APP_KEY_PREFIX).toMatch(/v\d+\.$/);
	});
});

describe('export / import round trip', () => {
	it('serialises an app to a tagged JSON payload', () => {
		const app = makeApp();
		const parsed = JSON.parse(exportAppJson(app));

		expect(parsed.format).toBe('uidc.app');
		expect(parsed.version).toBe(1);
		expect(parsed.name).toBe(app.name);
		expect(parsed.context).toEqual(app.context);
		expect(parsed.definition).toEqual(app.definition);
	});

	it('reads an exported payload back', () => {
		const app = makeApp();
		const result = parseExport(JSON.parse(exportAppJson(app)), registryLookup);

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.name).toBe(app.name);
			expect(result.value.definition).toEqual(app.definition);
		}
	});

	it('rejects a payload without the format tag', () => {
		expect(parseExport({ name: 'x' }, registryLookup)).toEqual({
			ok: false,
			error: 'Invalid app export: missing "format": "uidc.app"'
		});
	});

	it('rejects a non-object payload', () => {
		expect(parseExport('nope', registryLookup).ok).toBe(false);
	});

	it('rejects an export whose definition no longer validates', () => {
		const app = makeApp();
		const payload = JSON.parse(exportAppJson(app));
		payload.definition.components[0].type = 'NopeWidget';

		const result = parseExport(payload, registryLookup);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toContain('unknown component "NopeWidget"');
	});
});