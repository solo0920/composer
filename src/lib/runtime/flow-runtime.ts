import type { FlowDefinition, FlowNode } from '../domain/flows/flow-definition';
import type { StackRegistry } from '../registry/stack-registry';

export type NodeStatus =
	| { state: 'active'; stackLabel: string }
	| { state: 'unsupported'; stackLabel: string; message: string }
	| { state: 'invalid'; message: string };

export type FlowStatus = {
	flowId: string;
	nodes: { node: FlowNode; status: NodeStatus }[];
	/** Nodes that cannot run as configured. Empty means the flow is green. */
	blocking: string[];
};

/**
 * Resolves each flow node's chosen stack against the Stack Registry.
 *
 * A node on an unimplemented stack resolves to `unsupported` with a readable
 * message, so switching a node to json-render in the Binding panel produces an
 * honest warning in the Preview rather than a silently unchanged UI.
 */
export function resolveFlowStatus(
	flows: FlowDefinition[],
	registry: StackRegistry
): FlowStatus[] {
	return flows.map((flow) => {
		const blocking: string[] = [];
		const nodes = flow.nodes.map((node) => {
			const stack = registry.get(node.stack);

			if (!stack) {
				const message = `Unknown technology stack: ${node.stack}`;
				blocking.push(message);
				return { node, status: { state: 'invalid', message } as NodeStatus };
			}
			if (!stack.roles.includes(node.role)) {
				const message = `${stack.label} cannot serve the ${node.role} role`;
				blocking.push(message);
				return { node, status: { state: 'invalid', message } as NodeStatus };
			}
			if (!stack.implemented) {
				const message = `${stack.label} is declared but not implemented in this MVP`;
				blocking.push(message);
				return { node, status: { state: 'unsupported', stackLabel: stack.label, message } as NodeStatus };
			}
			return { node, status: { state: 'active', stackLabel: stack.label } as NodeStatus };
		});

		return { flowId: flow.id, nodes, blocking };
	});
}

/** Every blocking message across all flows, for a single summary line. */
export function summarizeBlocking(statuses: FlowStatus[]): string[] {
	return statuses.flatMap((status) => status.blocking);
}