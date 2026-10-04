import { describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
import { apiRegistry } from '../registry';
import { createApiClient } from './api-client';
import { executeBinding } from './binding-runtime';
import {
	customerProfileHandler,
	portfolioPositionsHandler,
	riskScoreHandler
} from '../server/mock-api';

/**
 * Integrates the four layers that make the vertical slice work:
 *   API registry -> API client -> mock SvelteKit endpoint -> binding -> UI data
 *
 * The endpoint layer is exercised through the same `Request`/`Response` objects
 * the SvelteKit route handlers delegate to, and the client goes over a real
 * `fetch` against an in-process HTTP server so the path under test includes
 * genuine HTTP request/response handling.
 */

type Route = (request: Request) => Response;

const ROUTES: Record<string, Route> = {
	'/api/mock/customer/profile': customerProfileHandler,
	'/api/mock/risk/score': riskScoreHandler,
	'/api/mock/portfolio/positions': portfolioPositionsHandler
};

/**
 * Minimal Node HTTP server that serves the mock handlers. Real sockets, real
 * status codes, real JSON parsing — no framework request event needed.
 */
function startMockServer(): Promise<{ origin: string; close: () => Promise<void>; requests: string[] }> {
	const requests: string[] = [];
	const server = createServer((incoming, response) => {
		const host = incoming.headers.host ?? 'localhost';
		const url = new URL(incoming.url ?? '/', `http://${host}`);
		requests.push(`${incoming.method} ${url.pathname}${url.search}`);

		const route = ROUTES[url.pathname];
		if (!route) {
			response.writeHead(404, { 'content-type': 'application/json' });
			response.end(JSON.stringify({ error: `No mock route for ${url.pathname}` }));
			return;
		}

		const body = route(new Request(url, { method: incoming.method ?? 'GET' }));
		response.writeHead(body.status, {
			'content-type': body.headers.get('content-type') ?? 'application/json'
		});
		void body.text().then((text) => response.end(text));
	});

	return new Promise((resolve) => {
		server.listen(0, '127.0.0.1', () => {
			const address = server.address();
			if (address === null || typeof address === 'string') {
				throw new Error('mock server did not report a TCP port');
			}
			resolve({
				origin: `http://127.0.0.1:${address.port}`,
				requests,
				close: () => new Promise((done) => server.close(() => done()))
			});
		});
	});
}

function clientFor(origin: string): ReturnType<typeof createApiClient> {
	return createApiClient(fetch, { baseUrl: origin });
}

describe('API -> binding -> UI data', () => {
	it('resolves every registered API over real HTTP into component-ready data', async () => {
		const server = await startMockServer();
		try {
			const client = clientFor(server.origin);
			const context = { customerId: 'CUST-1001' };

			const profile = await executeBinding(
				{
					api: 'customer.getProfile',
					input: { customerId: '$context.customerId' },
					output: { name: '$.name', email: '$.email', tier: '$.tier' }
				},
				apiRegistry.get('customer.getProfile'),
				context,
				client
			);
			expect(profile.status).toBe('ok');
			if (profile.status === 'ok') {
				expect(profile.data).toEqual({
					name: 'Ada Lovelace',
					email: 'ada@example.com',
					tier: 'Gold'
				});
			}

			const risk = await executeBinding(
				{
					api: 'risk.getScore',
					input: { customerId: '$context.customerId' },
					output: { score: '$.score', band: '$.band' }
				},
				apiRegistry.get('risk.getScore'),
				context,
				client
			);
			expect(risk.status).toBe('ok');
			if (risk.status === 'ok') {
				expect(risk.data).toEqual({ score: 27, band: 'Low' });
			}

			const portfolio = await executeBinding(
				{
					api: 'portfolio.getPositions',
					input: { customerId: '$context.customerId' },
					output: {
						totalMarketValue: '$.totalMarketValue',
						currency: '$.currency',
						positionCount: '$.positionCount'
					}
				},
				apiRegistry.get('portfolio.getPositions'),
				context,
				client
			);
			expect(portfolio.status).toBe('ok');
			if (portfolio.status === 'ok') {
				expect(portfolio.data).toEqual({
					totalMarketValue: 24540.5,
					currency: 'USD',
					positionCount: 2
				});
			}

			expect(server.requests).toEqual([
				'GET /api/mock/customer/profile?customerId=CUST-1001',
				'GET /api/mock/risk/score?customerId=CUST-1001',
				'GET /api/mock/portfolio/positions?customerId=CUST-1001'
			]);
		} finally {
			await server.close();
		}
	});

	it('surfaces a 404 from the mock backend as a readable binding error', async () => {
		const server = await startMockServer();
		try {
			const result = await executeBinding(
				{
					api: 'customer.getProfile',
					input: { customerId: '$context.customerId' },
					output: { name: '$.name' }
				},
				apiRegistry.get('customer.getProfile'),
				{ customerId: 'CUST-9999' },
				clientFor(server.origin)
			);

			expect(result.status).toBe('error');
			if (result.status === 'error') {
				expect(result.message).toBe(
					'API request failed: GET /api/mock/customer/profile responded 404'
				);
			}
		} finally {
			await server.close();
		}
	});

	it('omits output keys the payload does not contain', async () => {
		const server = await startMockServer();
		try {
			const result = await executeBinding(
				{
					api: 'customer.getProfile',
					input: { customerId: '$context.customerId' },
					output: { name: '$.name', phone: '$.phoneNumber' }
				},
				apiRegistry.get('customer.getProfile'),
				{ customerId: 'CUST-1001' },
				clientFor(server.origin)
			);

			expect(result.status).toBe('ok');
			if (result.status === 'ok') {
				expect(result.data).toEqual({ name: 'Ada Lovelace' });
			}
		} finally {
			await server.close();
		}
	});

	it('has a served endpoint behind every API registered in the API registry', () => {
		const unserved = apiRegistry.list().filter((api) => !(api.path in ROUTES));
		expect(unserved.map((api) => `${api.id} -> ${api.path}`)).toEqual([]);
	});
});