import { describe, expect, it } from 'vitest';
import { Workspace } from './workspace.svelte';
import { registryLookup, stackRegistry } from '../registry';
import { createDemoDefinition } from '../demo/customer-risk-dashboard';
import { createDemoFlows } from '../demo/customer-risk-dashboard.flows';
import { appKey, listApps, type AppStorage } from '../persistence/app-library';
import { blankAppWithDemo, copyAsNewApp, createBlankApp, slugify } from './app-factory';

function memoryStorage(initial: Record<string, string> = {}): AppStorage & { map: Map<string, string> } {
	const map = new Map(Object.entries(initial));
	return {
		map,
		getItem: (key) => map.get(key) ?? null,
		setItem: (key, value) => void map.set(key, value),
		removeItem: (key) => void map.delete(key)
	};
}

/** Minimal registry stand-ins; Workspace only forwards these to ComposerState. */
const components = {
	list: () => [],
	get: () => undefined,
	has: () => false,
	acceptsChildren: () => false,
	listByCategory: () => []
};
const apis = { list: () => [], get: () => undefined, has: () => false, listByCategory: () => [] };

function makeWorkspace(storage = memoryStorage()) {
	const workspace = new Workspace(
		storage,
		components,
		apis,
		registryLookup,
		stackRegistry,
		createDemoDefinition(),
		createDemoFlows()
	);
	return { workspace, storage };
}

describe('Workspace.start', () => {
	it('seeds the demo app on a fresh browser and makes it active', () => {
		const { workspace, storage } = makeWorkspace();
		workspace.start();

		expect(workspace.app?.name).toBe('Customer Risk Dashboard');
		expect(workspace.app?.definition.components).toHaveLength(4);
		expect(workspace.app?.context).toEqual({ customerId: 'CUST-1001' });
		expect(storage.map.has(appKey(workspace.app!.id))).toBe(true);
		expect(workspace.composer.dirty).toBe(false);
	});

	it('reopens the previously active app', () => {
		const storage = memoryStorage();
		const first = makeWorkspace(storage);
		first.workspace.start();
		first.workspace.newApp('Second App');

		const second = makeWorkspace(storage);
		second.workspace.start();

		expect(second.workspace.app?.name).toBe('Second App');
		expect(second.workspace.message).toBe('Reopened "Second App".');
	});

	it('reports an unreadable active app instead of discarding it', () => {
		const seed = memoryStorage();
		const first = makeWorkspace(seed);
		first.workspace.start();
		const id = first.workspace.app!.id;
		seed.map.set(appKey(id), '{corrupt');

		const second = makeWorkspace(seed);
		second.workspace.start();

		expect(second.workspace.message).toMatch(/not valid JSON/);
	});
});

describe('File: new app', () => {
	it('creates an empty app with no components', () => {
		const { workspace } = makeWorkspace();
		workspace.start();
		workspace.newApp('Blank');

		expect(workspace.app?.name).toBe('Blank');
		expect(workspace.composer.definition.components).toEqual([]);
		expect(workspace.composer.dirty).toBe(false);
		expect(workspace.apps.map((a) => a.name)).toContain('Blank');
	});

	it('carries the current $context into the new app', () => {
		const { workspace } = makeWorkspace();
		workspace.start();
		workspace.newApp('WithContext');

		expect(workspace.app?.context).toEqual({ customerId: 'CUST-1001' });
	});

	it('refuses an empty name', () => {
		const { workspace } = makeWorkspace();
		workspace.start();
		workspace.newApp('   ');

		expect(workspace.message).toBe('An app needs a name.');
		expect(workspace.app?.name).toBe('Customer Risk Dashboard');
	});
});

describe('File: save', () => {
	it('persists composer edits and clears the dirty flag', () => {
		const { workspace, storage } = makeWorkspace();
		workspace.start();

		workspace.composer.rename('Edited');
		expect(workspace.composer.dirty).toBe(true);

		workspace.save();

		expect(workspace.composer.dirty).toBe(false);
		expect(workspace.message).toBe('Saved "Edited".');
		expect(storage.map.get(appKey(workspace.app!.id))).toContain('Edited');
	});

	it('is a no-op with no app open', () => {
		const { workspace } = makeWorkspace();
		workspace.save();
		expect(workspace.message).toBeNull();
	});

	it('survives a reload', () => {
		const storage = memoryStorage();
		const first = makeWorkspace(storage);
		first.workspace.start();
		first.workspace.composer.rename('Persisted');
		first.workspace.save();

		const second = makeWorkspace(storage);
		second.workspace.start();
		expect(second.workspace.app?.name).toBe('Persisted');
	});
});

describe('File: save as', () => {
	it('creates an independent copy and switches to it', () => {
		const { workspace } = makeWorkspace();
		workspace.start();
		const originalId = workspace.app!.id;

		workspace.saveAs('Copy of dashboard');

		expect(workspace.app?.name).toBe('Copy of dashboard');
		expect(workspace.app?.id).not.toBe(originalId);
		expect(workspace.composer.definition.components).toHaveLength(4);
		expect(workspace.apps).toHaveLength(2);
		expect(workspace.composer.dirty).toBe(false);
	});

	it('leaves the original app untouched', () => {
		const storage = memoryStorage();
		const { workspace } = makeWorkspace(storage);
		workspace.start();

		workspace.saveAs('Copy');
		workspace.composer.rename('Changed after copy');
		workspace.save();

		const originalId = workspace.apps.find((a) => a.name === 'Customer Risk Dashboard')!.id;
		expect(storage.map.get(appKey(originalId))).toContain('Customer Risk Dashboard');
	});

	it('refuses an empty name', () => {
		const { workspace } = makeWorkspace();
		workspace.start();
		workspace.saveAs('  ');
		expect(workspace.message).toBe('An app needs a name.');
	});
});

describe('File: open app', () => {
	it('switches to another saved app', () => {
		const { workspace } = makeWorkspace();
		workspace.start();
		workspace.newApp('Other');
		const otherId = workspace.app!.id;

		workspace.openApp(workspace.apps.find((a) => a.name === 'Customer Risk Dashboard')!.id);
		expect(workspace.app?.name).toBe('Customer Risk Dashboard');

		workspace.openApp(otherId);
		expect(workspace.app?.name).toBe('Other');
		expect(workspace.message).toBe('Opened "Other".');
	});

	it('reports an unknown app id', () => {
		const { workspace } = makeWorkspace();
		workspace.start();
		workspace.openApp('missing');
		expect(workspace.message).toBe('App not found: missing');
	});

	it('reports an app that no longer validates', () => {
		const storage = memoryStorage();
		const { workspace } = makeWorkspace(storage);
		workspace.start();
		const id = workspace.app!.id;
		const tampered = JSON.parse(storage.map.get(appKey(id)) ?? '{}');
		tampered.definition.components[0].type = 'GhostWidget';
		storage.map.set(appKey(id), JSON.stringify(tampered));

		workspace.openApp(id);
		expect(workspace.message).toContain('unknown component "GhostWidget"');
	});
});

describe('deleting apps', () => {
	it('removes the app and closes it when it was open', () => {
		const storage = memoryStorage();
		const { workspace } = makeWorkspace(storage);
		workspace.start();
		workspace.newApp('Temporary');
		const tempId = workspace.app!.id;

		workspace.deleteAppById(tempId);

		expect(workspace.app).toBeNull();
		expect(storage.map.has(appKey(tempId))).toBe(false);
		expect(workspace.apps.map((a) => a.name)).not.toContain('Temporary');
	});
});

describe('settings', () => {
	it('renames the app and keeps the definition name in step', () => {
		const { workspace } = makeWorkspace();
		workspace.start();
		workspace.applySettings({ name: 'Renamed App', columns: 12, context: {} });

		expect(workspace.app?.name).toBe('Renamed App');
		expect(workspace.composer.definition.name).toBe('Renamed App');
	});

	it('falls back to the current name when the new one is blank', () => {
		const { workspace } = makeWorkspace();
		workspace.start();
		workspace.applySettings({ name: '  ', columns: 12, context: {} });

		expect(workspace.composer.definition.name).toBe('Customer Risk Dashboard');
		expect(workspace.message).toBe('An app needs a name.');
	});

	it('changes the grid width', () => {
		const { workspace } = makeWorkspace();
		workspace.start();
		workspace.applySettings({ name: 'Customer Risk Dashboard', columns: 6, context: {} });

		expect(workspace.composer.definition.layout.columns).toBe(6);
	});

	it('replaces the runtime context', () => {
		const { workspace } = makeWorkspace();
		workspace.start();
		workspace.applySettings({ name: 'X', columns: 12, context: { customerId: 'CUST-1002' } });

		expect(workspace.context).toEqual({ customerId: 'CUST-1002' });
	});

	it('drops context rows with a blank key', () => {
		const { workspace } = makeWorkspace();
		workspace.start();
		workspace.applySettings({
			name: 'X',
			columns: 12,
			context: { customerId: 'CUST-1002', '': 'ignored' }
		});

		expect(workspace.context).toEqual({ customerId: 'CUST-1002' });
	});
});

describe('reset', () => {
	it('restores the demo definition and marks it dirty', () => {
		const { workspace } = makeWorkspace();
		workspace.start();
		workspace.composer.rename('Changed');

		workspace.resetToDemo();

		expect(workspace.composer.definition.name).toBe('Customer Risk Dashboard');
		expect(workspace.composer.definition.components).toHaveLength(4);
		expect(workspace.composer.dirty).toBe(true);
	});
});

describe('binding panel: choosing a node stack', () => {
	it('starts with the demo flows and every node active', () => {
		const { workspace } = makeWorkspace();
		workspace.start();

		expect(workspace.flows).toHaveLength(2);
		expect(workspace.flows.flatMap((f) => f.nodes)).toHaveLength(7);
	});

	it('switches a node to another valid stack for its role', () => {
		const { workspace } = makeWorkspace();
		workspace.start();

		workspace.setNodeStack('preview', 'render-preview', 'json-render');

		const node = workspace.flows
			.find((f) => f.id === 'preview')!
			.nodes.find((n) => n.id === 'render-preview')!;
		expect(node.stack).toBe('json-render');
		expect(workspace.message).toBe('Render the definition now uses json-render.');
		expect(workspace.composer.dirty).toBe(true);
	});

	it('allows switching a data node to GraphQL even though it is unimplemented', () => {
		const { workspace } = makeWorkspace();
		workspace.start();

		workspace.setNodeStack('preview', 'fetch-risk', 'graphql');
		expect(workspace.flows.find((f) => f.id === 'preview')!.nodes.find((n) => n.id === 'fetch-risk')!.stack).toBe(
			'graphql'
		);
	});

	it('refuses a stack that cannot serve the node role', () => {
		const { workspace } = makeWorkspace();
		workspace.start();

		workspace.setNodeStack('preview', 'render-preview', 'rest-http');

		const node = workspace.flows
			.find((f) => f.id === 'preview')!
			.nodes.find((n) => n.id === 'render-preview')!;
		// Reverted rather than left in an impossible state.
		expect(node.stack).toBe('svelte-runtime');
		expect(workspace.message).toBe(
			'Invalid flows: stack "rest-http" cannot serve role "render" (node "render-preview")'
		);
	});

	it('refuses an unknown stack', () => {
		const { workspace } = makeWorkspace();
		workspace.start();

		workspace.setNodeStack('preview', 'render-preview', 'carrier-pigeon');
		expect(workspace.message).toBe('Unknown technology stack: carrier-pigeon');
	});

	it('reports an unknown node', () => {
		const { workspace } = makeWorkspace();
		workspace.start();

		workspace.setNodeStack('preview', 'does-not-exist', 'json-render');
		expect(workspace.message).toBe('Unknown node: does-not-exist');
	});

	it('reports an unknown flow by not finding the node', () => {
		const { workspace } = makeWorkspace();
		workspace.start();

		workspace.setNodeStack('no-such-flow', 'render-preview', 'json-render');
		expect(workspace.message).toBe('Unknown node: render-preview');
	});

	it('persists the chosen stack', () => {
		const storage = memoryStorage();
		const first = makeWorkspace(storage);
		first.workspace.start();
		first.workspace.setNodeStack('preview', 'render-preview', 'json-render');
		first.workspace.save();

		const second = makeWorkspace(storage);
		second.workspace.start();
		expect(
			second.workspace.flows.find((f) => f.id === 'preview')!.nodes.find((n) => n.id === 'render-preview')!.stack
		).toBe('json-render');
	});

	it('carries flows into a new app and restores them on reset', () => {
		const { workspace } = makeWorkspace();
		workspace.start();
		workspace.setNodeStack('preview', 'render-preview', 'json-render');
		workspace.newApp('Carried');

		expect(workspace.flows.find((f) => f.id === 'preview')!.nodes[0].stack).toBe('json-render');

		workspace.resetToDemo();
		expect(workspace.flows.find((f) => f.id === 'preview')!.nodes[0].stack).toBe('svelte-runtime');
	});
});

describe('app factory', () => {
	it('creates an empty definition for a blank app', () => {
		const app = createBlankApp('Fresh', { customerId: 'X' }, []);
		expect(app.name).toBe('Fresh');
		expect(app.definition.components).toEqual([]);
		expect(app.context).toEqual({ customerId: 'X' });
	});

	it('gives each new app a unique id', () => {
		const ids = new Set(
			Array.from({ length: 20 }, () => createBlankApp('A', {}, []).id)
		);
		expect(ids.size).toBe(20);
	});

	it('deep-copies the demo so the demo definition is never mutated', () => {
		const demo = createDemoDefinition();
		const app = blankAppWithDemo('Copy', demo, createDemoFlows());
		app.definition.components.pop();

		expect(demo.components).toHaveLength(4);
	});

	it('copies an app without sharing the definition object', () => {
		const original = createBlankApp('A', {}, []);
		const copy = copyAsNewApp(original, 'B');
		copy.definition.name = 'changed';

		expect(original.definition.name).toBe('A');
		expect(copy.id).not.toBe(original.id);
	});

	it('slugifies app names for the export filename', () => {
		expect(slugify('Customer Risk Dashboard')).toBe('customer-risk-dashboard');
		expect(slugify('  Spaces  &  Symbols!  ')).toBe('spaces-symbols');
		expect(slugify('!!!')).toBe('app');
		expect(slugify('')).toBe('app');
	});
});

describe('library listing', () => {
	it('reflects created and deleted apps in the sidebar summary', () => {
		const storage = memoryStorage();
		const { workspace } = makeWorkspace(storage);
		workspace.start();
		workspace.newApp('Second');

		const apps = listApps(storage);
		expect(apps.ok).toBe(true);
		if (apps.ok) expect(apps.value).toHaveLength(2);
		expect(workspace.apps).toHaveLength(2);
	});
});