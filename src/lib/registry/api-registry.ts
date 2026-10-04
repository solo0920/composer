import type { ApiDefinition } from '../domain/api/api-definition';
import type { CategoryGroup } from './component-registry';

/**
 * Read-only view over a fixed set of API definitions. Kept separate from
 * `ComponentRegistry`: the Binding Editor is the only place the two meet.
 */
export type ApiRegistry = {
	list(): ApiDefinition[];
	get(id: string): ApiDefinition | undefined;
	has(id: string): boolean;
	listByCategory(): CategoryGroup<ApiDefinition>[];
};

export function createApiRegistry(definitions: readonly ApiDefinition[]): ApiRegistry {
	const byId = new Map<string, ApiDefinition>(definitions.map((definition) => [definition.id, definition]));

	return {
		list: () => definitions.slice(),
		get: (id) => byId.get(id),
		has: (id) => byId.has(id),
		listByCategory: () => {
			const groups = new Map<string, ApiDefinition[]>();
			for (const definition of definitions) {
				const category = definition.category ?? definition.id.split('.')[0] ?? 'other';
				const bucket = groups.get(category);
				if (bucket) bucket.push(definition);
				else groups.set(category, [definition]);
			}
			return [...groups.entries()].map(([category, items]) => ({ category, items }));
		}
	};
}