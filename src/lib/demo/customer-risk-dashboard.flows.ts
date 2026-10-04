import type { FlowDefinition } from '../domain/flows/flow-definition';

/**
 * The flows of the Customer Risk Dashboard demo, mapped to the technology
 * stacks that actually execute each step today.
 *
 * Every node here corresponds to something the running app really does, so the
 * Binding panel describes the system as it is rather than as it might be.
 */
export function createDemoFlows(): FlowDefinition[] {
	return [
		{
			id: 'authoring',
			label: 'Author and save an app',
			description: 'What a user does in the Composer before anything is rendered.',
			nodes: [
				{
					id: 'open-app',
					label: 'Open or create an app',
					description: 'Reads the app library and adopts the active app.',
					role: 'state',
					stack: 'local-storage'
				},
				{
					id: 'persist-app',
					label: 'Save the app',
					description: 'Validates the definition and writes it back to the library.',
					role: 'state',
					stack: 'local-storage'
				},
				{
					id: 'compose-tree',
					label: 'Compose the component tree',
					description: 'Nested components built from Component Registry metadata.',
					role: 'render',
					stack: 'svelte-runtime'
				}
			]
		},
		{
			id: 'preview',
			label: 'Preview with live data',
			description: 'The Customer Risk Dashboard end-to-end journey.',
			nodes: [
				{
					id: 'render-preview',
					label: 'Render the definition',
					description: 'RuntimeRenderer walks the component tree and looks up each renderer.',
					role: 'render',
					stack: 'svelte-runtime'
				},
				{
					id: 'fetch-profile',
					label: 'Fetch customer profile',
					description: 'GET /api/mock/customer/profile',
					role: 'data',
					stack: 'rest-http'
				},
				{
					id: 'fetch-risk',
					label: 'Fetch risk score',
					description: 'GET /api/mock/risk/score',
					role: 'data',
					stack: 'rest-http'
				},
				{
					id: 'fetch-portfolio',
					label: 'Fetch portfolio positions',
					description: 'GET /api/mock/portfolio/positions',
					role: 'data',
					stack: 'rest-http'
				}
			]
		}
	];
}