import type { ApiDefinition } from '../domain/api/api-definition';
import { numberField, textField } from '../domain/fields';

/**
 * MVP API catalogue. Three functions, all served by the mock SvelteKit
 * endpoints under /api/mock. `inputSchema` / `outputSchema` are what the
 * Binding Editor uses to suggest mappings — the editor never hard-codes keys.
 */
export const apiDefinitions: ApiDefinition[] = [
	{
		id: 'customer.getProfile',
		name: 'Get customer profile',
		description: 'Returns the profile for one customer.',
		category: 'Customer',
		method: 'GET',
		path: '/api/mock/customer/profile',
		inputSchema: [textField('customerId', 'customerId', { placeholder: '$context.customerId' })],
		outputSchema: [
			textField('name', 'name', { bindingHint: '$.name' }),
			textField('email', 'email', { bindingHint: '$.email' }),
			textField('tier', 'tier', { bindingHint: '$.tier' }),
			textField('memberSince', 'memberSince', { bindingHint: '$.memberSince' })
		]
	},
	{
		id: 'risk.getScore',
		name: 'Get risk score',
		description: 'Returns a credit risk score and band for one customer.',
		category: 'Risk',
		method: 'GET',
		path: '/api/mock/risk/score',
		inputSchema: [textField('customerId', 'customerId', { placeholder: '$context.customerId' })],
		outputSchema: [
			numberField('score', 'score', { bindingHint: '$.score' }),
			textField('band', 'band', { bindingHint: '$.band' }),
			textField('summary', 'summary', { bindingHint: '$.summary' })
		]
	},
	{
		id: 'portfolio.getPositions',
		name: 'Get portfolio positions',
		description: 'Returns open positions and total market value for one customer.',
		category: 'Portfolio',
		method: 'GET',
		path: '/api/mock/portfolio/positions',
		inputSchema: [textField('customerId', 'customerId', { placeholder: '$context.customerId' })],
		outputSchema: [
			numberField('totalMarketValue', 'totalMarketValue', { bindingHint: '$.totalMarketValue' }),
			textField('currency', 'currency', { bindingHint: '$.currency' }),
			numberField('positionCount', 'positionCount', { bindingHint: '$.positionCount' })
		]
	}
];