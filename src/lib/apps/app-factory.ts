import type { AppDocument } from '../domain/apps/app-document';
import type { FlowDefinition } from '../domain/flows/flow-definition';
import { createUIDefinition } from '../domain/definitions/ui-definition.factory';
import type { JsonObject } from '../domain/json';

let sequence = 0;

/**
 * Deep-copies JSON-shaped domain data.
 *
 * `structuredClone` cannot be used here because values read out of Svelte
 * `$state` are proxies, and proxies are not cloneable. Definitions, flows and
 * context are JSON by construction, so a JSON round trip is both correct and
 * the only thing that works at this boundary.
 */
export function cloneJson<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

/** Monotonic, collision-resistant enough for a single-browser app library. */
export function newAppId(prefix = 'app'): string {
	sequence += 1;
	const stamp = Date.now().toString(36);
	const salt = Math.random().toString(36).slice(2, 8);
	return `${prefix}-${stamp}-${sequence}-${salt}`;
}

export function newDefinitionId(prefix = 'def'): string {
	return newAppId(prefix);
}

export function createBlankApp(
	name: string,
	context: JsonObject,
	flows: FlowDefinition[]
): AppDocument {
	const now = new Date().toISOString();
	return {
		id: newAppId(),
		name,
		createdAt: now,
		updatedAt: now,
		definition: createUIDefinition(name, newDefinitionId()),
		context: { ...context },
		flows: cloneJson(flows)
	};
}

export function blankAppWithDemo(
	name: string,
	demoDefinition: AppDocument['definition'],
	flows: FlowDefinition[]
): AppDocument {
	const now = new Date().toISOString();
	return {
		id: newAppId(),
		name,
		createdAt: now,
		updatedAt: now,
		definition: cloneJson(demoDefinition),
		context: {},
		flows: cloneJson(flows)
	};
}

/** `Save as` produces an independent copy with a new id, leaving the original intact. */
export function copyAsNewApp(app: AppDocument, name: string): AppDocument {
	const now = new Date().toISOString();
	return {
		...app,
		id: newAppId(),
		name,
		createdAt: now,
		updatedAt: now,
		definition: cloneJson(app.definition),
		context: { ...app.context },
		flows: cloneJson(app.flows)
	};
}

/** Triggers a browser download of the app as JSON. */
export function downloadAppJson(app: AppDocument, json: string): void {
	const blob = new Blob([json], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = `${slugify(app.name)}.uidc.json`;
	document.body.appendChild(anchor);
	anchor.click();
	anchor.remove();

	// Revoking synchronously can cancel the download before the browser has
	// read the blob, so release it on a later tick instead.
	setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export function slugify(name: string): string {
	const slug = name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
	return slug.length > 0 ? slug : 'app';
}