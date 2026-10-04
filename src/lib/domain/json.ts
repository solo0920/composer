/**
 * JSON-compatible value. All data crossing a validation boundary
 * (localStorage, HTTP response, hand-edited JSON) is narrowed to this
 * before it enters the domain model.
 */
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type JsonObject = { [key: string]: JsonValue };

export function isJsonObject(value: unknown): value is JsonObject {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}