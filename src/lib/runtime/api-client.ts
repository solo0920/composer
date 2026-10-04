import type { JsonObject, JsonValue } from '../domain/json';

export type ApiRequest = {
	method: 'GET' | 'POST';
	path: string;
	input: JsonObject;
};

export type ApiClient = (request: ApiRequest) => Promise<JsonValue>;

/**
 * Raised when an API call cannot produce usable JSON. The message is written to
 * be shown to a user in the Preview panel.
 */
export class ApiCallError extends Error {
	constructor(
		message: string,
		readonly status?: number
	) {
		super(message);
		this.name = 'ApiCallError';
	}
}

export type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

const NETWORK_ERROR = 'API request failed';

export type ApiClientOptions = {
	/**
	 * Origin that relative `ApiDefinition.path` values resolve against.
	 * Defaults to the page origin so that browser calls hit the same origin as
	 * the Composer.
	 */
	baseUrl?: string;
};

export function createApiClient(
	fetcher: Fetcher = fetch,
	options: ApiClientOptions = {}
): ApiClient {
	const baseUrl = options.baseUrl ?? globalThis.location?.origin ?? 'http://localhost';

	return async ({ method, path, input }) => {
		const url = new URL(path, baseUrl);
		const init: RequestInit = { method, headers: { accept: 'application/json' } };

		if (method === 'GET') {
			for (const [key, value] of Object.entries(input)) {
				url.searchParams.set(key, stringifyParam(value));
			}
		} else {
			init.headers = { ...init.headers, 'content-type': 'application/json' };
			init.body = JSON.stringify(input);
		}

		let response: Response;
		try {
			response = await fetcher(url.toString(), init);
		} catch (cause) {
			throw new ApiCallError(`${NETWORK_ERROR}: ${method} ${path} (${describeCause(cause)})`);
		}

		if (!response.ok) {
			throw new ApiCallError(
				`${NETWORK_ERROR}: ${method} ${path} responded ${response.status}`,
				response.status
			);
		}

		try {
			return (await response.json()) as JsonValue;
		} catch {
			throw new ApiCallError(
				`${NETWORK_ERROR}: ${method} ${path} returned a non-JSON response`,
				response.status
			);
		}
	};
}

function stringifyParam(value: JsonValue): string {
	if (value === null) return '';
	if (typeof value === 'object') return JSON.stringify(value);
	return String(value);
}

function describeCause(cause: unknown): string {
	if (cause instanceof Error) return cause.message;
	return 'network unreachable';
}