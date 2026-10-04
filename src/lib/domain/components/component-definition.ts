import type { FieldDescriptor } from '../fields';
import type { JsonObject } from '../json';

/**
 * Registry-facing metadata for one visual component type.
 *
 * The Composer never switches on `type`: it asks the registry for a definition
 * and renders whatever `propsSchema` / `defaultProps` it declares. Adding a
 * component therefore means adding one entry here, not editing Composer code.
 */
export type ComponentDefinition = {
	type: string;
	label: string;
	description?: string;
	category?: string;
	/** Drives the Inspector's Properties form. */
	propsSchema: FieldDescriptor[];
	defaultProps: JsonObject;
	defaultLayout?: { column?: number; span?: number };
	/** Set when the component renders values resolved from its binding output. */
	displaysBindingData?: boolean;
};

export function componentCategory(definition: ComponentDefinition): string {
	return definition.category ?? 'Other';
}