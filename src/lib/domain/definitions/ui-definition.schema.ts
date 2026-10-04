import { z } from 'zod';
import { err, ok, type Result } from '../result';
import { describeExpression, parseContextRef, parsePayloadRef } from '../bindings/binding-definition';
import type { UIDefinition, UIComponentInstance } from './ui-definition';
import { DEFAULT_GRID_COLUMNS, DEFINITION_VERSION, MAX_COMPONENT_DEPTH } from './ui-definition';
import { measureDepth, walkComponents } from './ui-definition.factory';

/**
 * What validation needs from the registries, stated as a port so that the
 * domain does not depend on a concrete registry implementation.
 */
export type RegistryLookup = {
	hasComponent(type: string): boolean;
	acceptsChildren(type: string): boolean;
	hasApi(id: string): boolean;
};

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

const componentInstanceSchema: z.ZodType<UIComponentInstance> = z.lazy(() =>
	z.object({
		id: z.string().min(1),
		type: z.string().min(1),
		props: z.record(z.string(), jsonValueSchema),
		layout: componentLayoutSchema,
		children: z.array(componentInstanceSchema).optional(),
		binding: bindingSchema.optional()
	})
) as z.ZodType<UIComponentInstance>;

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
 * Full validation for external data (localStorage, imported files, hand-edited
 * JSON): structure first, then cross-references against the registries, so a
 * definition referencing a component or API that no longer exists fails with a
 * readable message instead of rendering as a silent gap.
 */
export function validateUIDefinition(value: unknown, registries: RegistryLookup): Result<UIDefinition> {
	const parsed = parseUIDefinition(value);
	if (!parsed.ok) return parsed;

	const definition = parsed.value;
	const seenIds = new Set<string>();

	try {
		walkComponents(definition, ({ instance }) => {
			if (seenIds.has(instance.id)) {
				throw new ValidationError(`duplicate component id "${instance.id}"`);
			}
			seenIds.add(instance.id);

			if (!registries.hasComponent(instance.type)) {
				throw new ValidationError(`unknown component "${instance.type}"`);
			}
			if (instance.layout.span > definition.layout.columns) {
				throw new ValidationError(
					`component "${instance.id}" spans ${instance.layout.span} columns but the grid has ${definition.layout.columns}`
				);
			}
			if (instance.layout.column > definition.layout.columns) {
				throw new ValidationError(
					`component "${instance.id}" starts at column ${instance.layout.column} but the grid has ${definition.layout.columns} columns`
				);
			}
			if (
				instance.children &&
				instance.children.length > 0 &&
				!registries.acceptsChildren(instance.type)
			) {
				throw new ValidationError(`component "${instance.type}" cannot contain children`);
			}
			if (instance.binding) {
				if (!registries.hasApi(instance.binding.api)) {
					throw new ValidationError(`unknown API "${instance.binding.api}"`);
				}
				for (const [key, expression] of Object.entries(instance.binding.input ?? {})) {
					if (parseContextRef(expression.trim()) === undefined) {
						throw new ValidationError(
							`invalid binding input "${key}": ${describeExpression(expression)}`
						);
					}
				}
				for (const [key, expression] of Object.entries(instance.binding.output ?? {})) {
					if (parsePayloadRef(expression.trim()) === undefined) {
						throw new ValidationError(
							`invalid binding output "${key}": ${describeExpression(expression)}`
						);
					}
				}
			}
		});
	} catch (cause) {
		if (cause instanceof ValidationError) {
			return err(`Invalid UI Definition: ${cause.message}`);
		}
		throw cause;
	}

	const depth = measureDepth(definition);
	if (depth > MAX_COMPONENT_DEPTH) {
		return err(
			`Invalid UI Definition: component nesting is ${depth} levels deep, the maximum is ${MAX_COMPONENT_DEPTH}`
		);
	}

	return ok(definition);
}

/** Thrown internally to abort validation with a message that needs no path prefix. */
class ValidationError extends Error {}

function formatIssues(error: z.ZodError): string {
	const issues = error.issues.slice(0, 5).map((issue) => {
		const path = issue.path.join('.');
		return path.length > 0 ? `${path}: ${issue.message}` : issue.message;
	});
	const suffix = error.issues.length > issues.length ? ` (+${error.issues.length - issues.length} more)` : '';
	return `Invalid UI Definition: ${issues.join('; ')}${suffix}`;
}

export { DEFAULT_GRID_COLUMNS, DEFINITION_VERSION, MAX_COMPONENT_DEPTH };