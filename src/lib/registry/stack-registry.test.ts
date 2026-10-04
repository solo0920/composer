import { describe, expect, it } from 'vitest';
import { createStackRegistry } from './stack-registry';
import { stackDefinitions } from './stack-definitions';
import { validateFlows } from '../domain/flows/flow-definition.schema';
import { createDemoFlows } from '../demo/customer-risk-dashboard.flows';
import { resolveFlowStatus, summarizeBlocking } from '../runtime/flow-runtime';

const registry = createStackRegistry(stackDefinitions);

describe('StackRegistry', () => {
	it('lists the declared technology stacks', () => {
		expect(registry.list().map((s) => s.id)).toEqual([
			'svelte-runtime',
			'json-render',
			'a2ui-adapter',
			'rest-http',
			'graphql',
			'local-storage',
			'indexed-db'
		]);
	});

	it('gets a stack by id', () => {
		expect(registry.get('rest-http')?.label).toBe('REST over HTTP');
		expect(registry.has('rest-http')).toBe(true);
	});

	it('returns undefined for an unknown stack', () => {
		expect(registry.get('cobol')).toBeUndefined();
		expect(registry.has('cobol')).toBe(false);
	});

	it('offers only stacks that can serve a role', () => {
		expect(registry.forRole('render').map((s) => s.id)).toEqual([
			'svelte-runtime',
			'json-render',
			'a2ui-adapter'
		]);
		expect(registry.forRole('data').map((s) => s.id)).toEqual(['rest-http', 'graphql']);
		expect(registry.forRole('state').map((s) => s.id)).toEqual(['local-storage', 'indexed-db']);
	});

	it('sorts implemented stacks first within a role', () => {
		for (const role of ['render', 'data', 'state'] as const) {
			const options = registry.forRole(role);
			const flags = options.map((s) => s.implemented);
			expect(flags).toEqual([...flags].sort((a, b) => Number(b) - Number(a)));
		}
	});

	it('groups stacks by category', () => {
		expect(registry.listByCategory().map((g) => g.category)).toEqual([
			'Renderer',
			'Transport',
			'Persistence'
		]);
	});

	it('marks exactly one stack per role as implemented', () => {
		for (const role of ['render', 'data', 'state'] as const) {
			expect(registry.forRole(role).filter((s) => s.implemented)).toHaveLength(1);
		}
	});
});

describe('validateFlows', () => {
	it('accepts the demo flows', () => {
		const result = validateFlows(createDemoFlows(), registry);
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.value).toHaveLength(2);
	});

	it('accepts an empty flow list', () => {
		expect(validateFlows([], registry)).toEqual({ ok: true, value: [] });
	});

	it('rejects a malformed flow', () => {
		expect(validateFlows([{ id: 'f' }], registry).ok).toBe(false);
	});

	it('rejects an unknown role', () => {
		const result = validateFlows(
			[{ id: 'f', label: 'F', nodes: [{ id: 'n', label: 'N', role: 'telepathy', stack: 'rest-http' }] }],
			registry
		);
		expect(result.ok).toBe(false);
	});

	it('rejects a node with no stack', () => {
		const result = validateFlows(
			[{ id: 'f', label: 'F', nodes: [{ id: 'n', label: 'N', role: 'data' }] }],
			registry
		);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toMatch(/nodes\.0\.stack/);
	});

	it('rejects a node with an empty stack', () => {
		const result = validateFlows(
			[{ id: 'f', label: 'F', nodes: [{ id: 'n', label: 'N', role: 'data', stack: '' }] }],
			registry
		);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toMatch(/needs a technology stack/);
	});

	it('rejects an unknown stack with a readable message', () => {
		const result = validateFlows(
			[{ id: 'f', label: 'F', nodes: [{ id: 'n', label: 'N', role: 'data', stack: 'carrier-pigeon' }] }],
			registry
		);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toBe('Invalid flows: unknown technology stack "carrier-pigeon"');
	});

	it('rejects a stack that cannot serve the node role', () => {
		const result = validateFlows(
			[{ id: 'f', label: 'F', nodes: [{ id: 'n', label: 'N', role: 'data', stack: 'svelte-runtime' }] }],
			registry
		);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toBe(
				'Invalid flows: stack "svelte-runtime" cannot serve role "data" (node "n")'
			);
		}
	});

	it('rejects duplicate node ids within a flow', () => {
		const result = validateFlows(
			[
				{
					id: 'f',
					label: 'F',
					nodes: [
						{ id: 'n', label: 'N', role: 'data', stack: 'rest-http' },
						{ id: 'n', label: 'N2', role: 'data', stack: 'rest-http' }
					]
				}
			],
			registry
		);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toMatch(/duplicate node id "n"/);
	});

	it('allows the same node id in different flows', () => {
		const node = { id: 'n', label: 'N', role: 'data' as const, stack: 'rest-http' };
		const result = validateFlows(
			[
				{ id: 'a', label: 'A', nodes: [node] },
				{ id: 'b', label: 'B', nodes: [node] }
			],
			registry
		);
		expect(result.ok).toBe(true);
	});
});

describe('resolveFlowStatus', () => {
	it('reports every demo node as active', () => {
		const statuses = resolveFlowStatus(createDemoFlows(), registry);
		expect(statuses).toHaveLength(2);
		expect(summarizeBlocking(statuses)).toEqual([]);

		for (const flow of statuses) {
			for (const entry of flow.nodes) {
				expect(entry.status.state).toBe('active');
			}
		}
	});

	it('reports an unimplemented stack as unsupported, not as active', () => {
		const flows = createDemoFlows();
		const preview = flows.find((flow) => flow.id === 'preview')!;
		preview.nodes[0].stack = 'json-render';

		const statuses = resolveFlowStatus(flows, registry);
		const resolvedPreview = statuses.find((status) => status.flowId === 'preview')!;
		const authoring = statuses.find((status) => status.flowId === 'authoring')!;

		expect(resolvedPreview.nodes[0].status).toEqual({
			state: 'unsupported',
			stackLabel: 'json-render',
			message: 'json-render is declared but not implemented in this MVP'
		});
		// The rest of the flow is unaffected.
		expect(resolvedPreview.nodes[1].status.state).toBe('active');
		expect(resolvedPreview.blocking).toHaveLength(1);
		expect(authoring.blocking).toEqual([]);
	});

	it('reports an unknown stack as invalid', () => {
		const flows = createDemoFlows();
		flows[0].nodes[0].stack = 'nope';

		const statuses = resolveFlowStatus(flows, registry);
		expect(statuses[0].nodes[0].status).toEqual({
			state: 'invalid',
			message: 'Unknown technology stack: nope'
		});
		expect(summarizeBlocking(statuses)).toHaveLength(1);
	});

	it('reports a role mismatch as invalid', () => {
		const flows = createDemoFlows();
		flows[0].nodes[0].role = 'render';

		const statuses = resolveFlowStatus(flows, registry);
		expect(statuses[0].nodes[0].status).toEqual({
			state: 'invalid',
			message: 'Browser localStorage cannot serve the render role'
		});
	});

	it('collects one blocking message per unusable node', () => {
		const flows = createDemoFlows();
		flows[1].nodes[0].stack = 'json-render';
		flows[1].nodes[1].stack = 'graphql';

		const statuses = resolveFlowStatus(flows, registry);
		expect(summarizeBlocking(statuses)).toEqual([
			'json-render is declared but not implemented in this MVP',
			'GraphQL is declared but not implemented in this MVP'
		]);
	});
});