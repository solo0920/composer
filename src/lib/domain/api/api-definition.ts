import type { FieldDescriptor } from '../fields';

/**
 * Metadata for one backend API function. Deliberately a separate domain from
 * `ComponentDefinition`: components render, APIs describe HTTP endpoints, and a
 * `BindingDefinition` is the only thing that relates the two.
 */
export type ApiDefinition = {
	id: string;
	name: string;
	description?: string;
	category?: string;
	method: 'GET' | 'POST';
	path: string;
	inputSchema?: FieldDescriptor[];
	outputSchema?: FieldDescriptor[];
};

/** Domain prefix (`customer.getProfile` -> `customer`), used for grouping in pickers. */
export function apiCategory(api: ApiDefinition): string {
	if (api.category) return api.category;
	const [prefix] = api.id.split('.');
	return prefix ?? 'other';
}