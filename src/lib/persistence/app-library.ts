import type { AppDocument, AppIndex, AppSummary } from '../domain/apps/app-document';
import { summarise } from '../domain/apps/app-document';
import { parseAppDocument, parseAppIndex } from '../domain/apps/app-document.schema';
import type { RegistryLookup } from '../domain/definitions/ui-definition.schema';
import { validateUIDefinition } from '../domain/definitions/ui-definition.schema';
import type { UIDefinition } from '../domain/definitions/ui-definition';
import { err, ok, type Result } from '../domain/result';

/**
 * Multi-app library backed by Web Storage.
 *
 * An index lists the apps so the Open dialog can render without reading every
 * document; each document lives under its own key. All reads validate before
 * they can become domain state, so a corrupted or stale entry is reported
 * instead of cast.
 */

export const INDEX_KEY = 'uidc.apps.index.v1';
export const APP_KEY_PREFIX = 'uidc.app.v1.';

/** Minimal slice of the Web Storage API, so tests can supply their own. */
export type AppStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function appKey(id: string): string {
	return `${APP_KEY_PREFIX}${id}`;
}

export function readIndex(storage: AppStorage): Result<AppIndex> {
	const raw = readRaw(storage, INDEX_KEY);
	if (raw.status === 'missing') return ok({ activeId: null, apps: [] });
	if (raw.status === 'error') return err(raw.error);
	return parseAppIndex(raw.json);
}

function writeIndex(storage: AppStorage, index: AppIndex): Result<AppIndex> {
	const written = writeJson(storage, INDEX_KEY, index, 'app index');
	return written.ok ? ok(index) : written;
}

type RawRead =
	| { status: 'missing' }
	| { status: 'error'; error: string }
	| { status: 'ok'; json: unknown };

function readRaw(storage: AppStorage, key: string): RawRead {
	let raw: string | null;
	try {
		raw = storage.getItem(key);
	} catch (cause) {
		return { status: 'error', error: `Could not read storage: ${describe(cause)}` };
	}
	if (raw === null) return { status: 'missing' };
	try {
		return { status: 'ok', json: JSON.parse(raw) };
	} catch (cause) {
		return { status: 'error', error: `Saved data is not valid JSON: ${describe(cause)}` };
	}
}

function writeJson(
	storage: AppStorage,
	key: string,
	value: unknown,
	label: string
): Result<true> {
	try {
		storage.setItem(key, JSON.stringify(value, null, 2));
		return ok(true);
	} catch (cause) {
		return err(`Could not save ${label}: ${describe(cause)}`);
	}
}

export function listApps(storage: AppStorage): Result<AppSummary[]> {
	const index = readIndex(storage);
	return index.ok ? ok(index.value.apps) : index;
}

/**
 * Loads one app and validates its definition against the registries, so an app
 * saved before a component or API was removed fails with a readable message.
 */
export function loadApp(
	storage: AppStorage,
	id: string,
	registries: RegistryLookup
): Result<AppDocument> {
	const raw = readRaw(storage, appKey(id));
	if (raw.status === 'missing') return err(`App not found: ${id}`);
	if (raw.status === 'error') return err(raw.error);

	const document = parseAppDocument(raw.json);
	if (!document.ok) return document;

	const validated = validateUIDefinition(document.value.definition, registries);
	if (!validated.ok) return err(`App "${document.value.name}": ${validated.error}`);

	return ok({ ...document.value, definition: validated.value });
}

export function saveApp(storage: AppStorage, app: AppDocument): Result<AppDocument> {
	const stamped: AppDocument = { ...app, updatedAt: new Date().toISOString() };
	const written = writeJson(storage, appKey(stamped.id), stamped, 'app');
	if (!written.ok) return written;

	const index = readIndex(storage);
	if (!index.ok) return index;

	const apps = index.value.apps.filter((summary) => summary.id !== stamped.id);
	apps.push(summarise(stamped));
	const updated = writeIndex(storage, {
		activeId: index.value.activeId ?? stamped.id,
		// Newest first, with an id tie-break so two apps saved in the same
		// millisecond still have a stable, explainable order.
		apps: apps.sort(
			(a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id)
		)
	});
	if (!updated.ok) return updated;

	return ok(stamped);
}

export function createApp(
	storage: AppStorage,
	app: AppDocument
): Result<AppDocument> {
	const index = readIndex(storage);
	if (!index.ok) return index;
	if (index.value.apps.some((summary) => summary.id === app.id)) {
		return err(`App already exists: ${app.name}`);
	}
	return saveApp(storage, app);
}

export function deleteApp(storage: AppStorage, id: string): Result<null> {
	const index = readIndex(storage);
	if (!index.ok) return err(index.error);

	try {
		storage.removeItem(appKey(id));
	} catch (cause) {
		return err(`Could not delete app: ${describe(cause)}`);
	}

	const remaining = index.value.apps.filter((summary) => summary.id !== id);
	const updated = writeIndex(storage, {
		activeId: index.value.activeId === id ? null : index.value.activeId,
		apps: remaining
	});
	if (!updated.ok) return err(updated.error);

	return ok(null);
}

export function setActiveApp(storage: AppStorage, id: string | null): Result<AppIndex> {
	const index = readIndex(storage);
	if (!index.ok) return index;
	return writeIndex(storage, { ...index.value, activeId: id });
}

export function getActiveAppId(storage: AppStorage): Result<string | null> {
	const index = readIndex(storage);
	return index.ok ? ok(index.value.activeId) : err(index.error);
}

/** Serialises an app for download. Pure, so it is trivially testable. */
export function exportAppJson(app: AppDocument): string {
	return JSON.stringify(
		{
			format: 'uidc.app',
			version: 1,
			name: app.name,
			createdAt: app.createdAt,
			context: app.context,
			definition: app.definition
		},
		null,
		2
	);
}

export type ExportPayload = {
	name: string;
	createdAt: string;
	context: Record<string, unknown>;
	definition: UIDefinition;
};

/**
 * Reads an exported payload back into an app. Used by tests and kept separate
 * from `loadApp` because an export has no storage key behind it yet.
 */
export function parseExport(value: unknown, registries: RegistryLookup): Result<ExportPayload> {
	if (typeof value !== 'object' || value === null) {
		return err('Invalid app export: expected an object');
	}
	const record = value as Record<string, unknown>;
	if (record['format'] !== 'uidc.app') {
		return err('Invalid app export: missing "format": "uidc.app"');
	}

	const validated = validateUIDefinition(record['definition'], registries);
	if (!validated.ok) return err(validated.error);

	return ok({
		name: typeof record['name'] === 'string' ? record['name'] : 'Imported app',
		createdAt: typeof record['createdAt'] === 'string' ? record['createdAt'] : new Date().toISOString(),
		context:
			typeof record['context'] === 'object' && record['context'] !== null
				? (record['context'] as Record<string, unknown>)
				: {},
		definition: validated.value
	});
}

export function describe(cause: unknown): string {
	return cause instanceof Error ? cause.message : String(cause);
}