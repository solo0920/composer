import type { BindingDefinition } from '../bindings/binding-definition';
import type { JsonObject } from '../json';

/** Placement of one component instance inside its parent grid. */
export type ComponentLayout = {
	/** 1-based start column. */
	column: number;
	/** Number of columns to occupy. */
	span: number;
	/** Optional explicit row, for ordering when the grid wraps. */
	row?: number;
};

export type GridLayout = {
	type: 'grid';
	columns: number;
};

export type UIComponentInstance = {
	id: string;
	type: string;
	props: JsonObject;
	layout: ComponentLayout;
	/** Nested components laid out in their own grid inside this component. */
	children?: UIComponentInstance[];
	binding?: BindingDefinition;
};

/**
 * The single source of truth shared by the Composer and the Runtime.
 * It contains domain data only — never Composer UI state such as the
 * selected component id.
 */
export type UIDefinition = {
	id: string;
	version: number;
	name: string;
	layout: GridLayout;
	components: UIComponentInstance[];
};

export const DEFINITION_VERSION = 1;
export const DEFAULT_GRID_COLUMNS = 12;

/**
 * Guard against pathological nesting. Validation rejects anything deeper with
 * a readable message, so the recursive renderer can never be handed a tree
 * that blows the stack.
 */
export const MAX_COMPONENT_DEPTH = 12;