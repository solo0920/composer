import { z } from 'zod';
import { err, ok, type Result } from '../result';
import { describeExpression, parseContextRef, parsePayloadRef } from '../bindings/binding-definition';
import type { UIDefinition } from './ui-definition';
import { DEFAULT_GRID_COLUMNS, DEFINITION_VERSION } from './ui-definition';

const jsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
	z.union([
		z.string(),
		z.number(),
		z.boolean(),
		z.null(),
		z.array(jsonValueSchema),
		z.record(z.string(), jsonValueSchema)
	])
);

const bindingSchema = z.object({
	api: z.string().min(1, 'Binding requires an API id'),
	input: z.record(z.string(), z.string()).optional(),
	output: z.record(z.string(), z.string()).optional()
});

const componentLayoutSchema = z.object({
	column: z.number().int().min(1),
	span: z.number().int().min(1),
	row: z.number().int().min(1).optional()
});

const componentInstanceSchema = z.object({
	id: z.string().min(1),
	type: z.string().min(1),
	props: z.record(z.string(), jsonValueSchema),
	layout: componentLayoutSchema,
	binding: bindingSchema.optional()
});

const uiDefinitionSchema = z.object({
	id: z.string().min(1),
	version: z.number().int(),
	name: z.string(),
	layout: z.object({
		type: z.literal('grid'),
		columns: z.number().int().min(1).max(24)
	}),
	components: z.array(componentInstanceSchema)
});

export type RegistryLookup = {
	hasComponent(type: string): boolean;
	hasApi(id: string): boolean;
};

/**
 * Structural validation only. Used by the JSON editor, where no registries are
 * in scope.
 */
export function parseUIDefinition(value: unknown): Result<UIDefinition> {
	const parsed = uiDefinitionSchema.safeParse(value);
	if (!parsed.success) {
		return err(formatIssues(parsed.error));
	}
	return ok(parsed.data as UIDefinition);
}

/**
 * Full validation for external data (localStorage, hand-edited JSON): structure
 * first, then cross-references against the registries so that a definition
 * referencing a component or API that no longer exists fails with a readable
 * message instead of rendering as a silent gap.
 */
export function validateUIDefinition(value: unknown, registries: RegistryLookup): Result<UIDefinition> {
	const parsed = parseUIDefinition(value);
	if (!parsed.ok) return parsed;

	const definition = parsed.value;
	const seenIds = new Set<string>();

	for (const component of definition.components) {
		if (seenIds.has(component.id)) {
			return err(`Invalid UI Definition: duplicate component id "${component.id}"`);
		}
		seenIds.add(component.id);

		if (!registries.hasComponent(component.type)) {
			return err(`Invalid UI Definition: unknown component "${component.type}"`);
		}
		if (component.layout.span > definition.layout.columns) {
			return err(
				`Invalid UI Definition: component "${component.id}" spans ${component.layout.span} columns but the grid has ${definition.layout.columns}`
			);
		}
		if (component.layout.column > definition.layout.columns) {
			return err(
				`Invalid UI Definition: component "${component.id}" starts at column ${component.layout.column} but the grid has ${definition.layout.columns} columns`
			);
		}
		if (component.binding) {
			if (!registries.hasApi(component.binding.api)) {
				return err(`Invalid UI Definition: unknown API "${component.binding.api}"`);
			}
			for (const [key, expression] of Object.entries(component.binding.input ?? {})) {
				if (parseContextRef(expression.trim()) === undefined) {
					return err(`Invalid binding input "${key}": ${describeExpression(expression)}`);
				}
			}
			for (const [key, expression] of Object.entries(component.binding.output ?? {})) {
				if (parsePayloadRef(expression.trim()) === undefined) {
					return err(`Invalid binding output "${key}": ${describeExpression(expression)}`);
				}
			}
		}
	}

	return ok(definition);
}

function formatIssues(error: z.ZodError): string {
	const issues = error.issues.slice(0, 5).map((issue) => {
		const path = issue.path.join('.');
		return path.length > 0 ? `${path}: ${issue.message}` : issue.message;
	});
	const suffix = error.issues.length > issues.length ? ` (+${error.issues.length - issues.length} more)` : '';
	return `Invalid UI Definition: ${issues.join('; ')}${suffix}`;
}

export { DEFAULT_GRID_COLUMNS, DEFINITION_VERSION };