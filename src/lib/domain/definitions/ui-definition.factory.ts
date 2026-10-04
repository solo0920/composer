import type { ComponentDefinition } from '../components/component-definition';
import type { JsonObject } from '../json';
import type { ComponentLayout, UIDefinition, UIComponentInstance } from './ui-definition';
import { DEFAULT_GRID_COLUMNS, DEFINITION_VERSION, MAX_COMPONENT_DEPTH } from './ui-definition';

export function createUIDefinition(name: string, id: string, columns = DEFAULT_GRID_COLUMNS): UIDefinition {
	return { id, version: DEFINITION_VERSION, name, layout: { type: 'grid', columns }, components: [] };
}

export function createComponentInstance(
	componentDef: ComponentDefinition,
	id: string,
	columns = DEFAULT_GRID_COLUMNS
): UIComponentInstance {
	return {
		id,
		type: componentDef.type,
		props: { ...componentDef.defaultProps },
		layout: resolveLayout(componentDef.defaultLayout, columns)
	};
}

/** Clamps a component's default placement into the grid it is being added to. */
export function resolveLayout(
	preferred: { column?: number; span?: number } | undefined,
	columns: number
): ComponentLayout {
	const span = Math.min(preferred?.span ?? 12, columns);
	const column = Math.min(preferred?.column ?? 1, Math.max(1, columns - span + 1));
	return { column, span };
}

export type ComponentLocation = {
	instance: UIComponentInstance;
	/** Parent list the instance belongs to, or null for a top-level component. */
	siblings: UIComponentInstance[] | null;
	depth: number;
};

/**
 * Depth-first, parents-before-children walk over the component tree.
 *
 * Implemented with an explicit stack rather than recursion so that validating
 * an untrusted, pathologically deep definition cannot overflow the call stack.
 */
export function walkComponents(
	definition: UIDefinition,
	visit: (location: ComponentLocation) => void
): void {
	const stack: { siblings: UIComponentInstance[]; index: number; depth: number }[] = [
		{ siblings: definition.components, index: 0, depth: 0 }
	];

	while (stack.length > 0) {
		const frame = stack[stack.length - 1];
		if (frame.index >= frame.siblings.length) {
			stack.pop();
			continue;
		}
		const instance = frame.siblings[frame.index];
		frame.index += 1;
		visit({ instance, siblings: frame.siblings, depth: frame.depth });
		if (instance.children && instance.children.length > 0) {
			stack.push({ siblings: instance.children, index: 0, depth: frame.depth + 1 });
		}
	}
}

export function findComponentById(
	definition: UIDefinition,
	id: string | null
): UIComponentInstance | undefined {
	if (id === null) return undefined;
	let found: UIComponentInstance | undefined;
	walkComponents(definition, ({ instance }) => {
		if (found === undefined && instance.id === id) found = instance;
	});
	return found;
}

export function collectComponentIds(definition: UIDefinition): string[] {
	const ids: string[] = [];
	walkComponents(definition, ({ instance }) => ids.push(instance.id));
	return ids;
}

/** Highest nesting level present in the tree; a flat definition has depth 1. */
export function measureDepth(definition: UIDefinition): number {
	let deepest = 0;
	walkComponents(definition, ({ depth }) => {
		deepest = Math.max(deepest, depth + 1);
	});
	return deepest;
}

/**
 * Immutably replaces one instance anywhere in the tree. Returns the original
 * definition object when the id is not found, so callers can cheaply detect a
 * no-op.
 */
export function replaceComponentById(
	definition: UIDefinition,
	id: string,
	transform: (instance: UIComponentInstance) => UIComponentInstance
): UIDefinition {
	const apply = (siblings: UIComponentInstance[]): UIComponentInstance[] | undefined => {
		const index = siblings.findIndex((component) => component.id === id);
		if (index !== -1) {
			const next = siblings.slice();
			next[index] = transform(siblings[index]);
			return next;
		}
		for (let i = 0; i < siblings.length; i += 1) {
			const child = siblings[i].children;
			if (child === undefined) continue;
			const replaced = apply(child);
			if (replaced === undefined) continue;
			const next = siblings.slice();
			next[i] = { ...siblings[i], children: replaced };
			return next;
		}
		return undefined;
	};

	const components = apply(definition.components);
	return components === undefined ? definition : { ...definition, components };
}

/**
 * Removes a component anywhere in the tree. A parent whose last child was
 * removed loses its `children` key entirely, so saved JSON does not accumulate
 * empty arrays.
 */
export function removeComponentById(definition: UIDefinition, id: string): UIDefinition {
	const remove = (siblings: UIComponentInstance[]): UIComponentInstance[] =>
		siblings
			.filter((component) => component.id !== id)
			.map((component) => {
				if (component.children === undefined) return component;
				const children = remove(component.children);
				if (children.length > 0) return { ...component, children };
				const { children: _dropped, ...rest } = component;
				return rest;
			});
	return { ...definition, components: remove(definition.components) };
}

/** Appends a component to a target container, or to the root when null. */
export function appendComponent(
	definition: UIDefinition,
	instance: UIComponentInstance,
	parentId: string | null
): UIDefinition {
	if (parentId === null) {
		return { ...definition, components: [...definition.components, instance] };
	}
	return replaceComponentById(definition, parentId, (parent) => ({
		...parent,
		children: [...(parent.children ?? []), instance]
	}));
}

export function updateProps(instance: UIComponentInstance, patch: JsonObject): UIComponentInstance {
	return { ...instance, props: { ...instance.props, ...patch } };
}

export function updateLayout(
	instance: UIComponentInstance,
	layout: ComponentLayout,
	columns = DEFAULT_GRID_COLUMNS
): UIComponentInstance {
	const span = Math.min(Math.max(1, layout.span), columns);
	const column = Math.min(Math.max(1, layout.column), Math.max(1, columns - span + 1));
	return { ...instance, layout: { ...layout, column, span } };
}

export { MAX_COMPONENT_DEPTH };