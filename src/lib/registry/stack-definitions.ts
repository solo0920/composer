import type { TechnologyStack } from '../domain/flows/flow-definition';

/**
 * MVP technology stacks.
 *
 * The `implemented` flag is load-bearing: the Binding panel shows it, and the
 * runtime refuses to pretend that a declared-but-unimplemented stack is
 * running. Only the three `implemented: true` stacks actually execute.
 */
export const stackDefinitions: TechnologyStack[] = [
	{
		id: 'svelte-runtime',
		label: 'Svelte runtime',
		description: 'Renders the component tree with the Svelte 5 renderer.',
		category: 'Renderer',
		roles: ['render'],
		implemented: true
	},
	{
		id: 'json-render',
		label: 'json-render',
		description: 'Renders the same definition through a json-render adapter.',
		category: 'Renderer',
		roles: ['render'],
		implemented: false
	},
	{
		id: 'a2ui-adapter',
		label: 'A2UI adapter',
		description: 'Renders the definition as an A2UI agent payload.',
		category: 'Renderer',
		roles: ['render'],
		implemented: false
	},
	{
		id: 'rest-http',
		label: 'REST over HTTP',
		description: 'Calls API functions over HTTP against the SvelteKit endpoints.',
		category: 'Transport',
		roles: ['data'],
		implemented: true
	},
	{
		id: 'graphql',
		label: 'GraphQL',
		description: 'Calls API functions through a GraphQL endpoint.',
		category: 'Transport',
		roles: ['data'],
		implemented: false
	},
	{
		id: 'local-storage',
		label: 'Browser localStorage',
		description: 'Persists apps in the browser app library.',
		category: 'Persistence',
		roles: ['state'],
		implemented: true
	},
	{
		id: 'indexed-db',
		label: 'IndexedDB',
		description: 'Persists apps in IndexedDB.',
		category: 'Persistence',
		roles: ['state'],
		implemented: false
	}
];