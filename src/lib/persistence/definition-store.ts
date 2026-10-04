import type { UIDefinition } from '../domain/definitions/ui-definition';
import { validateUIDefinition, type RegistryLookup } from '../domain/definitions/ui-definition.schema';
import { err, ok, type Result } from '../domain/result';

export const STORAGE_KEY = 'uidc.definition.v1';

/** Minimal slice of the Web Storage API, so tests can supply their own. */
export type DefinitionStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/**
 * Loads a definition from storage. Untrusted JSON is validated against the
 * registries before it can become domain state; a bad or stale payload is
 * reported rather than cast.
 */
export function loadDefinition(
	storage: DefinitionStorage,
	registries: RegistryLookup
): Result<UIDefinition> {
	let raw: string | null;
	try {
		raw = storage.getItem(STORAGE_KEY);
	} catch (cause) {
		return err(`Could not read stored definition: ${describe(cause)}`);
	}

	if (raw === null) {
		return err('No saved definition found.');
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch (cause) {
		return err(`Saved definition is not valid JSON: ${describe(cause)}`);
	}

	return validateUIDefinition(parsed, registries);
}

export function saveDefinition(storage: DefinitionStorage, definition: UIDefinition): Result<UIDefinition> {
	try {
		storage.setItem(STORAGE_KEY, JSON.stringify(definition, null, 2));
		return ok(definition);
	} catch (cause) {
		return err(`Could not save definition: ${describe(cause)}`);
	}
}

export function clearDefinition(storage: DefinitionStorage): Result<null> {
	try {
		storage.removeItem(STORAGE_KEY);
		return ok(null);
	} catch (cause) {
		return err(`Could not clear saved definition: ${describe(cause)}`);
	}
}

function describe(cause: unknown): string {
	return cause instanceof Error ? cause.message : String(cause);
}