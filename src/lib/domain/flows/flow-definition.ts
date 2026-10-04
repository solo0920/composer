/**
 * A flow is one end-to-end user journey through the platform; a node is one
 * step of it. Each node declares what it does (`role`) and which technology
 * stack implements it (`stack`).
 *
 * This is a separate domain from `BindingDefinition`: a binding says "this
 * component calls this API function", while a node says "this step of the
 * journey is carried by this technology".
 */

/** What kind of work a node performs. Constrains which stacks may serve it. */
export type NodeRole = 'render' | 'data' | 'state';

export const NODE_ROLES: NodeRole[] = ['render', 'data', 'state'];

export type FlowNode = {
	id: string;
	label: string;
	description?: string;
	role: NodeRole;
	/** Id of the technology stack chosen for this node. */
	stack: string;
};

export type FlowDefinition = {
	id: string;
	label: string;
	description?: string;
	nodes: FlowNode[];
};

/** A technology that can implement a node of a given role. */
export type TechnologyStack = {
	id: string;
	label: string;
	description?: string;
	category?: string;
	/** Roles this stack is able to serve. */
	roles: NodeRole[];
	/**
	 * Whether this MVP can actually execute the stack. Declared stacks are
	 * selectable and validated, but the runtime reports them as unsupported
	 * rather than pretending to run them.
	 */
	implemented: boolean;
};

export function stackSupportsRole(stack: TechnologyStack, role: NodeRole): boolean {
	return stack.roles.includes(role);
}

export const ROLE_LABELS: Record<NodeRole, string> = {
	render: 'Render',
	data: 'Data',
	state: 'State'
};