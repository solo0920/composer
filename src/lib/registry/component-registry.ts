import type { ComponentDefinition } from '../domain/components/component-definition';

export type CategoryGroup<T> = {
	category: string;
	items: T[];
};

/**
 * Read-only view over a fixed set of component definitions. Adding a component
 * means adding an entry to the definitions array — never editing the Composer.
 */
export type ComponentRegistry<T extends ComponentDefinition = ComponentDefinition> = {
	list(): T[];
	get(type: string): T | undefined;
	has(type: string): boolean;
	/** Whether a component type may hold nested children in the component tree. */
	acceptsChildren(type: string): boolean;
	listByCategory(): CategoryGroup<T>[];
};

const CATEGORY_ORDER = ['Layout', 'Basic', 'Data'];

export function createComponentRegistry<T extends ComponentDefinition>(
	definitions: readonly T[]
): ComponentRegistry<T> {
	const byType = new Map<string, T>(definitions.map((definition) => [definition.type, definition]));

	return {
		list: () => definitions.slice(),
		get: (type) => byType.get(type),
		has: (type) => byType.has(type),
		acceptsChildren: (type) => byType.get(type)?.acceptsChildren === true,
		listByCategory: () => {
			const groups = new Map<string, T[]>();
			for (const definition of definitions) {
				const category = definition.category ?? 'Other';
				const bucket = groups.get(category);
				if (bucket) bucket.push(definition);
				else groups.set(category, [definition]);
			}
			return [...groups.entries()]
				.sort(([a], [b]) => categoryRank(a) - categoryRank(b))
				.map(([category, items]) => ({ category, items }));
		}
	};
}

function categoryRank(category: string): number {
	const index = CATEGORY_ORDER.indexOf(category);
	return index === -1 ? CATEGORY_ORDER.length : index;
}