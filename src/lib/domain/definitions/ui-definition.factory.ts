import type { ComponentDefinition } from '../components/component-definition';
import type { JsonObject } from '../json';
import type { ComponentLayout, UIDefinition, UIComponentInstance } from './ui-definition';
import { DEFAULT_GRID_COLUMNS, DEFINITION_VERSION } from './ui-definition';

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

export function findComponent(definition: UIDefinition, id: string | null): UIComponentInstance | undefined {
	if (id === null) return undefined;
	return definition.components.find((component) => component.id === id);
}

export function updateProps(
	instance: UIComponentInstance,
	patch: JsonObject
): UIComponentInstance {
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