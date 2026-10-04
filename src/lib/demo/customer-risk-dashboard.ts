import { componentDefinitions } from '../registry/component-definitions';
import { createComponentInstance } from '../domain/definitions/ui-definition.factory';
import type { UIDefinition } from '../domain/definitions/ui-definition';
import { DEFINITION_VERSION } from '../domain/definitions/ui-definition';

/**
 * Runtime context available to `$context.*` bindings. Fixed in this MVP — there
 * is no context editor yet (see README "Future Work").
 */
export const PREVIEW_CONTEXT = { customerId: 'CUST-1001' };

function instance(
	type: string,
	id: string,
	props: Record<string, string>,
	layout: { column: number; span: number },
	binding?: UIDefinition['components'][number]['binding']
) {
	const definition = componentDefinitions.find((c) => c.type === type);
	if (!definition) {
		throw new Error(`Demo definition references unknown component "${type}"`);
	}
	const created = createComponentInstance(definition, id);
	return { ...created, props: { ...created.props, ...props }, layout, ...(binding ? { binding } : {}) };
}

/** First-run demo: Customer Risk Dashboard, wired to all three mock APIs. */
export function createDemoDefinition(): UIDefinition {
	return {
		id: 'demo-customer-risk-dashboard',
		version: DEFINITION_VERSION,
		name: 'Customer Risk Dashboard',
		layout: { type: 'grid', columns: 12 },
		components: [
			instance(
				'text',
				'title',
				{ text: 'Customer Risk Dashboard', variant: 'heading' },
				{ column: 1, span: 12 }
			),
			instance(
				'data-card',
				'customer-profile',
				{ title: 'Customer Profile' },
				{ column: 1, span: 12 },
				{
					api: 'customer.getProfile',
					input: { customerId: '$context.customerId' },
					output: {
						name: '$.name',
						email: '$.email',
						tier: '$.tier',
						memberSince: '$.memberSince'
					}
				}
			),
			instance(
				'data-card',
				'risk-score',
				{ title: 'Risk Score' },
				{ column: 1, span: 6 },
				{
					api: 'risk.getScore',
					input: { customerId: '$context.customerId' },
					output: { score: '$.score', band: '$.band', summary: '$.summary' }
				}
			),
			instance(
				'data-card',
				'portfolio',
				{ title: 'Portfolio Positions' },
				{ column: 7, span: 6 },
				{
					api: 'portfolio.getPositions',
					input: { customerId: '$context.customerId' },
					output: {
						totalMarketValue: '$.totalMarketValue',
						currency: '$.currency',
						positionCount: '$.positionCount'
					}
				}
			)
		]
	};
}