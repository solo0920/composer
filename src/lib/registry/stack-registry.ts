import type { TechnologyStack } from '../domain/flows/flow-definition';
import type { NodeRole } from '../domain/flows/flow-definition';
import type { CategoryGroup } from './component-registry';

/**
 * Registry of technology stacks a flow node can be assigned to. Kept separate
 * from the Component and API registries: a stack describes *how* a step is
 * implemented, not what it renders or which endpoint it calls.
 */
export type StackRegistry = {
	list(): TechnologyStack[];
	get(id: string): TechnologyStack | undefined;
	has(id: string): boolean;
	/** Stacks able to serve a role, implemented ones first. */
	forRole(role: NodeRole): TechnologyStack[];
	listByCategory(): CategoryGroup<TechnologyStack>[];
};

export function createStackRegistry(definitions: readonly TechnologyStack[]): StackRegistry {
	const byId = new Map<string, TechnologyStack>(definitions.map((d) => [d.id, d]));

	return {
		list: () => definitions.slice(),
		get: (id) => byId.get(id),
		has: (id) => byId.has(id),
		forRole: (role) =>
			definitions
				.filter((stack) => stack.roles.includes(role))
				.sort((a, b) => Number(b.implemented) - Number(a.implemented)),
		listByCategory: () => {
			const groups = new Map<string, TechnologyStack[]>();
			for (const definition of definitions) {
				const category = definition.category ?? 'Other';
				const bucket = groups.get(category);
				if (bucket) bucket.push(definition);
				else groups.set(category, [definition]);
			}
			return [...groups.entries()].map(([category, items]) => ({ category, items }));
		}
	};
}