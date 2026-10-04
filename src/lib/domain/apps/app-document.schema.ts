import { z } from 'zod';
import { err, ok, type Result } from '../result';
import { parseFlows } from '../flows/flow-definition.schema';
import type { AppDocument, AppIndex } from './app-document';

/**
 * Structural validation for a persisted app. The UI definition inside is
 * validated separately against the registries by the caller, because that check
 * needs registry access this layer does not have.
 */

const jsonObjectSchema = z.record(z.string(), z.unknown());

const appDocumentSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1, 'An app needs a name'),
	createdAt: z.string().min(1),
	updatedAt: z.string().min(1),
	definition: z.unknown(),
	context: jsonObjectSchema,
	flows: z.unknown()
});

const appIndexSchema = z.object({
	activeId: z.string().nullable(),
	apps: z.array(
		z.object({
			id: z.string().min(1),
			name: z.string().min(1),
			updatedAt: z.string().min(1),
			componentCount: z.number().int().min(0)
		})
	)
});

export function parseAppDocument(value: unknown): Result<AppDocument> {
	const parsed = appDocumentSchema.safeParse(value);
	if (!parsed.success) {
		const first = parsed.error.issues[0];
		const path = first?.path.join('.') ?? '';
		return err(
			`Invalid app: ${path.length > 0 ? `${path}: ` : ''}${first?.message ?? 'malformed document'}`
		);
	}
	const flows = parseFlows(parsed.data.flows);
	if (!flows.ok) return flows;

	return ok({ ...(parsed.data as AppDocument), flows: flows.value });
}

export function parseAppIndex(value: unknown): Result<AppIndex> {
	const parsed = appIndexSchema.safeParse(value);
	if (!parsed.success) {
		return err(`Invalid app index: ${parsed.error.issues[0]?.message ?? 'malformed index'}`);
	}
	return ok(parsed.data as AppIndex);
}