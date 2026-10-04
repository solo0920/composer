/**
 * A readable result of an operation that can fail with a user-facing message.
 * Used at validation boundaries (localStorage, JSON editor, HTTP) so that
 * failures surface as text instead of being swallowed.
 */
export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export function ok<T>(value: T): Result<T> {
	return { ok: true, value };
}

export function err<T = never>(error: string): Result<T> {
	return { ok: false, error };
}