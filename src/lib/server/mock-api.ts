import { z } from 'zod';

/**
 * Handlers for the mock backend. Each is a plain `Request -> Response` function
 * so it can be unit-tested without standing up a server; the `+server.ts` files
 * under src/routes/api/mock delegate to these. Components never import this
 * module — they only reach it through HTTP.
 */

const customerIdSchema = z.string().trim().min(1, 'customerId is required');

export const MOCK_CUSTOMER_ID = 'CUST-1001';

const PROFILES: Record<string, { name: string; email: string; tier: string; memberSince: string }> = {
	'CUST-1001': {
		name: 'Ada Lovelace',
		email: 'ada@example.com',
		tier: 'Gold',
		memberSince: '2019-04-02'
	},
	'CUST-1002': {
		name: 'Grace Hopper',
		email: 'grace@example.com',
		tier: 'Platinum',
		memberSince: '2016-11-19'
	}
};

const RISK: Record<string, { score: number; band: string; summary: string }> = {
	'CUST-1001': { score: 27, band: 'Low', summary: 'Stable payment history, no recent defaults.' },
	'CUST-1002': { score: 71, band: 'Elevated', summary: 'Two late payments in the last 12 months.' }
};

const POSITIONS: Record<
	string,
	{ positions: { symbol: string; quantity: number; marketValue: number; pnl: number }[]; currency: string }
> = {
	'CUST-1001': {
		currency: 'USD',
		positions: [
			{ symbol: 'ACME', quantity: 120, marketValue: 18420.5, pnl: 1240.25 },
			{ symbol: 'GLOB', quantity: 40, marketValue: 6120.0, pnl: -180.4 }
		]
	},
	'CUST-1002': {
		currency: 'USD',
		positions: [{ symbol: 'NOVA', quantity: 15, marketValue: 23100.75, pnl: 3900.1 }]
	}
};

function readCustomerId(request: Request): string | null {
	const candidate = new URL(request.url).searchParams.get('customerId');
	const parsed = customerIdSchema.safeParse(candidate ?? '');
	return parsed.success ? parsed.data : null;
}

function json(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json' }
	});
}

function notFound(customerId: string): Response {
	return json({ error: `No mock data for customerId "${customerId}"` }, 404);
}

function badRequest(message: string): Response {
	return json({ error: message }, 400);
}

export function customerProfileHandler(request: Request): Response {
	const customerId = readCustomerId(request);
	if (customerId === null) return badRequest('customerId is required');
	const profile = PROFILES[customerId];
	if (!profile) return notFound(customerId);
	return json({ customerId, ...profile });
}

export function riskScoreHandler(request: Request): Response {
	const customerId = readCustomerId(request);
	if (customerId === null) return badRequest('customerId is required');
	const risk = RISK[customerId];
	if (!risk) return notFound(customerId);
	return json({ customerId, ...risk });
}

export function portfolioPositionsHandler(request: Request): Response {
	const customerId = readCustomerId(request);
	if (customerId === null) return badRequest('customerId is required');
	const portfolio = POSITIONS[customerId];
	if (!portfolio) return notFound(customerId);
	return json({
		customerId,
		positions: portfolio.positions,
		totalMarketValue: portfolio.positions.reduce((sum, p) => sum + p.marketValue, 0),
		positionCount: portfolio.positions.length,
		currency: portfolio.currency
	});
}