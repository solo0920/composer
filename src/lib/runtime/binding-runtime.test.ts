import { describe, expect, it } from 'vitest';
import { apiRegistry } from '../registry';
import type { JsonValue } from '../domain/json';
import { createApiClient } from './api-client';
import {
	executeBinding,
	resolveBindingInput,
	resolveBindingOutput
} from './binding-runtime';

const getProfile = apiRegistry.get('customer.getProfile');
const getScore = apiRegistry.get('risk.getScore');

describe('resolveBindingInput', () => {
	it('resolves $context references against the context', () => {
		expect(resolveBindingInput({ customerId: '$context.customerId' }, { customerId: 'CUST-1001' })).toEqual({
			customerId: 'CUST-1001'
		});
	});

	it('omits a context key that is not present', () => {
		expect(resolveBindingInput({ customerId: '$context.missing' }, { customerId: 'CUST-1001' })).toEqual({});
	});

	it('skips expressions that are not context references', () => {
		expect(resolveBindingInput({ bad: '$.name', also: 'plain' }, { customerId: 'x' })).toEqual({});
	});

	it('returns an empty object when there is no input mapping', () => {
		expect(resolveBindingInput(undefined, { customerId: 'x' })).toEqual({});
	});
});

describe('resolveBindingOutput', () => {
	const payload: JsonValue = { name: 'Ada', email: 'ada@example.com', profile: { tier: 'Gold' } };

	it('resolves $. references against the payload', () => {
		expect(resolveBindingOutput({ name: '$.name', email: '$.email' }, payload)).toEqual({
			name: 'Ada',
			email: 'ada@example.com'
		});
	});

	it('resolves nested paths', () => {
		expect(resolveBindingOutput({ tier: '$.profile.tier' }, payload)).toEqual({ tier: 'Gold' });
	});

	it('omits keys whose path is missing from the payload', () => {
		expect(resolveBindingOutput({ name: '$.name', nope: '$.missing' }, payload)).toEqual({ name: 'Ada' });
	});

	it('returns an empty object when there is no output mapping', () => {
		expect(resolveBindingOutput(undefined, payload)).toEqual({});
	});
});

describe('executeBinding', () => {
	const context = { customerId: 'CUST-1001' };

	it('calls the API and maps the response onto named keys', async () => {
		const calls: unknown[] = [];
		const client = createApiClient(async (url, init) => {
			calls.push({ url, init });
			return new Response(JSON.stringify({ name: 'Ada', email: 'ada@example.com' }), {
				headers: { 'content-type': 'application/json' }
			});
		});

		const result = await executeBinding(
			{
				api: 'customer.getProfile',
				input: { customerId: '$context.customerId' },
				output: { name: '$.name', email: '$.email' }
			},
			getProfile,
			context,
			client
		);

		expect(result.status).toBe('ok');
		if (result.status === 'ok') {
			expect(result.data).toEqual({ name: 'Ada', email: 'ada@example.com' });
		}
		expect(String((calls[0] as { url: string }).url)).toContain('customerId=CUST-1001');
	});

	it('reports an unknown API instead of throwing', async () => {
		const result = await executeBinding({ api: 'risk.explode' }, undefined, context, async () => null);
		expect(result).toEqual({ status: 'error', message: 'Unknown API: risk.explode' });
	});

	it('reports an HTTP failure as a value, not an exception', async () => {
		const client = createApiClient(async () => new Response('{}', { status: 500 }));
		const result = await executeBinding({ api: 'risk.getScore' }, getScore, context, client);
		expect(result.status).toBe('error');
		if (result.status === 'error') {
			expect(result.message).toBe('API request failed: GET /api/mock/risk/score responded 500');
		}
	});

	it('reports an unexpected client failure with context', async () => {
		const result = await executeBinding({ api: 'risk.getScore' }, getScore, context, async () => {
			throw new Error('boom');
		});
		expect(result.status).toBe('error');
		if (result.status === 'error') {
			expect(result.message).toBe('Unexpected error while calling risk.getScore: boom');
		}
	});
});