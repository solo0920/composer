<script lang="ts">
	import {
		Select,
		SelectContent,
		SelectItem,
		SelectTrigger
	} from '$lib/components/ui/select/index.js';
	import StackBadge from './StackBadge.svelte';
	import { ROLE_LABELS, type FlowDefinition } from '$lib/domain/flows/flow-definition';
	import type { StackRegistry } from '$lib/registry/stack-registry';
	import { resolveFlowStatus } from '$lib/runtime/flow-runtime';

	/**
	 * Binding panel: every end-to-end flow this app describes, and the
	 * technology stack chosen for each node. Both the flow list and the options
	 * in each dropdown come from the registries, so adding a flow node or a
	 * stack needs no change here.
	 */
	let {
		flows,
		registry,
		onselectstack
	}: {
		flows: FlowDefinition[];
		registry: StackRegistry;
		onselectstack: (flowId: string, nodeId: string, stackId: string) => void;
	} = $props();

	const statuses = $derived(resolveFlowStatus(flows, registry));
</script>

<div class="flex-1 overflow-y-auto p-4" data-testid="binding-panel">
	<h2 class="text-sm font-semibold">Binding</h2>
	<p class="mt-1 text-xs text-muted-foreground">
		Each node of each end-to-end flow, and the technology stack that implements it. Options come from the
		Stack Registry.
	</p>

	{#if flows.length === 0}
		<p class="py-12 text-center text-sm text-muted-foreground" data-testid="binding-panel-empty">
			This app declares no flows.
		</p>
	{:else}
		<div class="mt-4 flex flex-col gap-6">
			{#each flows as flow (flow.id)}
				{@const status = statuses.find((candidate) => candidate.flowId === flow.id)}
				<section class="flex flex-col gap-2" data-testid="flow" data-flow-id={flow.id}>
					<header>
						<h3 class="text-sm font-medium">{flow.label}</h3>
						{#if flow.description}
							<p class="text-xs text-muted-foreground">{flow.description}</p>
						{/if}
					</header>

					{#if status && status.blocking.length > 0}
						<p class="text-xs text-destructive" data-testid="flow-blocking">
							{status.blocking.join(' · ')}
						</p>
					{/if}

					<ul class="flex flex-col gap-2">
						{#each flow.nodes as node (node.id)}
							{@const options = registry.forRole(node.role)}
							{@const nodeStatus = status?.nodes.find((entry) => entry.node.id === node.id)?.status}
							<li
								class="flex flex-wrap items-center gap-3 rounded-md border border-border px-3 py-2"
								data-testid="flow-node"
								data-node-id={node.id}
								data-role={node.role}
							>
								<div class="flex min-w-40 flex-1 flex-col">
									<span class="text-sm font-medium">{node.label}</span>
									<span class="text-xs text-muted-foreground">
										{ROLE_LABELS[node.role]} role
										{#if node.description}· {node.description}{/if}
									</span>
								</div>

								{#if nodeStatus?.state === 'unsupported'}
									<span class="text-xs text-destructive">{nodeStatus.message}</span>
								{/if}

								<Select
									type="single"
									value={node.stack}
									onValueChange={(next: string) => onselectstack(flow.id, node.id, next)}
								>
									<SelectTrigger
										class="w-56"
										data-testid="node-stack-select"
										data-node-id={node.id}
										aria-label={`Stack for ${node.label}`}
									>
										<!-- Render the label ourselves: bits-ui's SelectValue would show
										     the raw stack id in the closed trigger. -->
										{options.find((option) => option.id === node.stack)?.label ?? node.stack}
									</SelectTrigger>
									<SelectContent>
										{#each options as stack (stack.id)}
											<SelectItem value={stack.id} data-testid="node-stack-option" data-stack-id={stack.id}>
												<span class="flex items-center gap-2">
													<span>{stack.label}</span>
													<StackBadge implemented={stack.implemented} />
												</span>
											</SelectItem>
										{/each}
									</SelectContent>
								</Select>
							</li>
						{/each}
					</ul>
				</section>
			{/each}
		</div>
	{/if}
</div>