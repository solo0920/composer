import { describe, expect, it } from 'vitest';
import { ApiCallError, createApiClient } from './api-client';
import type { JsonValue } from '../domain/json';

function jsonResponse(body: JsonValue, init: { status?: number; contentType?: string } = {}): Response {
	return new Response(JSON.stringify(body), {
		status: init.status ?? 200,
		headers: { 'content-type': init.contentType ?? 'application/json' }
	});
}

describe('createApiClient', () => {
	it('sends GET input as query parameters and returns parsed JSON', async () => {
		let seenUrl = '';
		const client = createApiClient(async (url) => {
			seenUrl = url;
			return jsonResponse({ name: 'Ada' });
		});

		const result = await client({
			method: 'GET',
			path: '/api/mock/customer/profile',
			input: { customerId: 'CUST-1001' }
		});

		expect(seenUrl).toContain('/api/mock/customer/profile?customerId=CUST-1001');
		expect(result).toEqual({ name: 'Ada' });
	});

	it('sends POST input as a JSON body', async () => {
		let seenInit: RequestInit | undefined;
		const client = createApiClient(async (_url, init) => {
			seenInit = init;
			return jsonResponse({ ok: true });
		});

		await client({ method: 'POST', path: '/api/x', input: { a: 1 } });

		expect(seenInit?.method).toBe('POST');
		expect(seenInit?.body).toBe('{"a":1}');
		expect(seenInit?.headers).toMatchObject({ 'content-type': 'application/json' });
	});

	it('resolves the path against the page origin', async () => {
		let seenUrl = '';
		const client = createApiClient(async (url) => {
			seenUrl = url;
			return jsonResponse({});
		});
		await client({ method: 'GET', path: '/api/mock/risk/score', input: {} });
		expect(seenUrl.startsWith('http')).toBe(true);
		expect(seenUrl).toContain('/api/mock/risk/score');
	});

	it('raises a readable error for a non-2xx response', async () => {
		const client = createApiClient(async () => jsonResponse({ error: 'nope' }, { status: 404 }));
		await expect(client({ method: 'GET', path: '/api/mock/customer/profile', input: {} })).rejects.toThrow(
			'API request failed: GET /api/mock/customer/profile responded 404'
		);
	});

	it('raises a readable error when the network fails', async () => {
		const client = createApiClient(async () => {
			throw new Error('ECONNREFUSED');
		});
		await expect(client({ method: 'GET', path: '/api/x', input: {} })).rejects.toThrow(
			'API request failed: GET /api/x (ECONNREFUSED)'
		);
	});

	it('raises a readable error for a non-JSON response', async () => {
		const client = createApiClient(async () => new Response('<html>oops</html>', { status: 200 }));
		await expect(client({ method: 'GET', path: '/api/x', input: {} })).rejects.toThrow(
			'API request failed: GET /api/x returned a non-JSON response'
		);
	});

	it('exposes the failing status code on ApiCallError', async () => {
		const client = createApiClient(async () => jsonResponse({}, { status: 500 }));
		const error = await client({ method: 'GET', path: '/api/x', input: {} }).catch((e: unknown) => e);
		expect(error).toBeInstanceOf(ApiCallError);
		expect((error as ApiCallError).status).toBe(500);
	});
});