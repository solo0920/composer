import { z } from 'zod';
import { err, ok, type Result } from '../result';
import { NODE_ROLES, stackSupportsRole, type FlowDefinition } from './flow-definition';
import type { StackRegistry } from '../../registry/stack-registry';

const nodeRoleSchema = z.enum(NODE_ROLES as [string, ...string[]]);

const flowNodeSchema = z.object({
	id: z.string().min(1),
	label: z.string().min(1),
	description: z.string().optional(),
	role: nodeRoleSchema,
	stack: z.string().min(1, 'A node needs a technology stack')
});

const flowSchema = z.object({
	id: z.string().min(1),
	label: z.string().min(1),
	description: z.string().optional(),
	nodes: z.array(flowNodeSchema)
});

const flowsSchema = z.array(flowSchema);

export function parseFlows(value: unknown): Result<FlowDefinition[]> {
	const parsed = flowsSchema.safeParse(value);
	if (!parsed.success) {
		const issue = parsed.error.issues[0];
		return err(
			`Invalid flows: ${issue?.path.join('.') ?? ''} ${issue?.message ?? 'malformed document'}`.trim()
		);
	}
	return ok(parsed.data as FlowDefinition[]);
}

/**
 * Validates that every node points at a registered stack that can actually
 * serve its role, so the Binding panel can never offer or store an impossible
 * pairing.
 */
export function validateFlows(value: unknown, registry: StackRegistry): Result<FlowDefinition[]> {
	const parsed = parseFlows(value);
	if (!parsed.ok) return parsed;

	for (const flow of parsed.value) {
		const seen = new Set<string>();
		for (const node of flow.nodes) {
			if (seen.has(node.id)) {
				return err(`Invalid flows: duplicate node id "${node.id}" in flow "${flow.id}"`);
			}
			seen.add(node.id);

			const stack = registry.get(node.stack);
			if (!stack) {
				return err(`Invalid flows: unknown technology stack "${node.stack}"`);
			}
			if (!stackSupportsRole(stack, node.role)) {
				return err(
					`Invalid flows: stack "${stack.id}" cannot serve role "${node.role}" (node "${node.id}")`
				);
			}
		}
	}

	return ok(parsed.value);
}