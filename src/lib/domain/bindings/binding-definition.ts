import { isJsonObject, type JsonValue } from '../json';

/**
 * Declarative Component -> API Function binding.
 *
 *   { api: 'customer.getProfile',
 *     input:  { customerId: '$context.customerId' },
 *     output: { name: '$.name', email: '$.email' } }
 *
 * Only two expression forms exist in this MVP: `$context.<key>` reads the
 * runtime context, `$.<path>` reads the API response payload.
 */
export type BindingDefinition = {
	api: string;
	input?: Record<string, string>;
	output?: Record<string, string>;
};

export const CONTEXT_PREFIX = '$context.';
export const PAYLOAD_ROOT = '$';

/** `$context.customerId` -> `customerId`; anything else -> undefined. */
export function parseContextRef(expression: string): string | undefined {
	if (!expression.startsWith(CONTEXT_PREFIX)) return undefined;
	const key = expression.slice(CONTEXT_PREFIX.length);
	return key.length > 0 ? key : undefined;
}

/** `$.a.b` -> `['a','b']`; anything else -> undefined. */
export function parsePayloadRef(expression: string): string[] | undefined {
	if (!expression.startsWith(`${PAYLOAD_ROOT}.`)) return undefined;
	const path = expression.slice(PAYLOAD_ROOT.length + 1);
	const segments = path.split('.');
	if (segments.length === 0 || segments.some((s) => s.length === 0)) return undefined;
	return segments;
}

/**
 * Walks a dot-separated path through a JSON payload. Object keys and array
 * indices are both addressable; a missing or non-traversable link yields
 * undefined rather than throwing.
 */
export function readPath(root: JsonValue, path: string[]): JsonValue | undefined {
	let current: JsonValue | undefined = root;
	for (const segment of path) {
		if (Array.isArray(current)) {
			const index = Number(segment);
			if (!Number.isInteger(index) || index < 0) return undefined;
			current = current[index];
			continue;
		}
		if (!isJsonObject(current)) return undefined;
		current = current[segment];
	}
	return current;
}

/** Human-readable classification used by the Binding Editor to explain bad input. */
export function describeExpression(expression: string): string {
	const trimmed = expression.trim();
	if (parseContextRef(trimmed)) return trimmed;
	if (parsePayloadRef(trimmed)) return trimmed;
	if (trimmed.length === 0) return 'expression is empty';
	return `unsupported expression "${trimmed}" (expected ${CONTEXT_PREFIX}<key> or ${PAYLOAD_ROOT}.<path>)`;
}