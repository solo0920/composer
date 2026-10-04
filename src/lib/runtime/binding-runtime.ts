import type { ApiDefinition } from '../domain/api/api-definition';
import type { BindingDefinition } from '../domain/bindings/binding-definition';
import { parseContextRef, parsePayloadRef, readPath } from '../domain/bindings/binding-definition';
import type { JsonObject, JsonValue } from '../domain/json';
import { ApiCallError, type ApiClient } from './api-client';

export type BindingStatus = 'ok' | 'error';

export type BindingResult =
	| { status: 'ok'; data: JsonObject; payload: JsonValue }
	| { status: 'error'; message: string };

export type BindingContext = Record<string, JsonValue>;

/**
 * Resolves `input` expressions against the runtime context. Mappings whose
 * context key is absent are omitted, so the API receives only what the context
 * actually provides and can answer with a precise 400 if something is missing.
 */
export function resolveBindingInput(
	input: Record<string, string> | undefined,
	context: BindingContext
): JsonObject {
	const resolved: JsonObject = {};
	for (const [key, expression] of Object.entries(input ?? {})) {
		const contextKey = parseContextRef(expression.trim());
		if (contextKey === undefined) continue;
		const value = readPath(context, [contextKey]);
		if (value !== undefined) resolved[key] = value;
	}
	return resolved;
}

/**
 * Resolves `output` expressions against the API payload. Mapped keys whose
 * path is missing from the payload are omitted so that the component renders
 * only what the API actually returned.
 */
export function resolveBindingOutput(
	output: Record<string, string> | undefined,
	payload: JsonValue
): JsonObject {
	const resolved: JsonObject = {};
	for (const [key, expression] of Object.entries(output ?? {})) {
		const path = parsePayloadRef(expression.trim());
		if (path === undefined) continue;
		const value = readPath(payload, path);
		if (value !== undefined) resolved[key] = value;
	}
	return resolved;
}

/**
 * Runs one Component -> API Function binding. Failures are returned as values,
 * never thrown, so the Preview can render an error next to the component that
 * produced it instead of blanking the whole screen.
 */
export async function executeBinding(
	binding: BindingDefinition,
	api: ApiDefinition | undefined,
	context: BindingContext,
	client: ApiClient
): Promise<BindingResult> {
	if (!api) {
		return { status: 'error', message: `Unknown API: ${binding.api}` };
	}

	try {
		const input = resolveBindingInput(binding.input, context);
		const payload = await client({ method: api.method, path: api.path, input });
		return { status: 'ok', data: resolveBindingOutput(binding.output, payload), payload };
	} catch (cause) {
		if (cause instanceof ApiCallError) return { status: 'error', message: cause.message };
		return {
			status: 'error',
			message: `Unexpected error while calling ${binding.api}: ${
				cause instanceof Error ? cause.message : String(cause)
			}`
		};
	}
}