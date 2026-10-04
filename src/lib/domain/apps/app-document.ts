import type { UIDefinition } from '../definitions/ui-definition';
import type { FlowDefinition } from '../flows/flow-definition';
import type { JsonObject } from '../json';

/**
 * A named, saved app: one UI definition plus the runtime context its bindings
 * read from. This is the unit the File menu operates on (new / open / save /
 * save as / export).
 */
export type AppDocument = {
	id: string;
	name: string;
	createdAt: string;
	updatedAt: string;
	definition: UIDefinition;
	/** Values available to `$context.*` expressions in bindings. */
	context: JsonObject;
	/** End-to-end journeys and the technology stack chosen for each node. */
	flows: FlowDefinition[];
};

/** Lightweight row for the app library list, without the definition body. */
export type AppSummary = {
	id: string;
	name: string;
	updatedAt: string;
	componentCount: number;
};

/** Persisted alongside the app list so a reload reopens the last app. */
export type AppIndex = {
	activeId: string | null;
	apps: AppSummary[];
};

export function summarise(app: AppDocument): AppSummary {
	let componentCount = 0;
	const pending = [app.definition.components];
	while (pending.length > 0) {
		const siblings = pending.pop()!;
		for (const instance of siblings) {
			componentCount += 1;
			if (instance.children) pending.push(instance.children);
		}
	}
	return { id: app.id, name: app.name, updatedAt: app.updatedAt, componentCount };
}