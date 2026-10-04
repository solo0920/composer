<script lang="ts">
	import type { UIDefinition, UIComponentInstance } from '$lib/domain/definitions/ui-definition';
	import { svelteComponentRegistry } from './renderer-registry.svelte';
	import type { RendererProps } from './renderer-registry.svelte';
	import RenderNode from './RenderNode.svelte';

	/**
	 * Renders one component and, recursively, its children.
	 *
	 * Children are laid out in their own grid using the same column count as
	 * the root definition. Every level reads from the same flat
	 * `data`/`errors`/`loading` maps keyed by component id, so nesting does not
	 * change how binding results are delivered.
	 */
	let {
		instance,
		columns,
		data = {},
		errors = {},
		loading = {},
		depth = 0
	}: {
		instance: UIComponentInstance;
		columns: number;
		data?: Record<string, RendererProps['data']>;
		errors?: Record<string, string>;
		loading?: Record<string, boolean>;
		depth?: number;
	} = $props();

	const resolved = $derived(svelteComponentRegistry.get(instance.type));
	const children = $derived(instance.children ?? []);
	const columnTemplate = $derived(`repeat(${columns}, minmax(0, 1fr))`);
	const runtimeProps = $derived<RendererProps>({
		props: instance.props,
		data: data[instance.id] ?? {}
	});
</script>

<div
	class="min-w-0"
	style:grid-column="{instance.layout.column} / span {instance.layout.span}"
	style:grid-row={instance.layout.row ?? 'auto'}
	data-testid="runtime-item"
	data-component-id={instance.id}
	data-component-type={instance.type}
	data-depth={depth}
>
	{#if resolved}
		<resolved.renderer {...runtimeProps} />
	{:else}
		<p class="text-sm text-destructive" data-testid="unknown-component">
			Unknown component: {instance.type}
		</p>
	{/if}

	{#if loading[instance.id]}
		<p class="mt-1 text-xs text-muted-foreground">Loading…</p>
	{/if}
	{#if errors[instance.id]}
		<p class="mt-1 text-xs text-destructive" data-testid="binding-error">{errors[instance.id]}</p>
	{/if}

	{#if children.length > 0}
		<div class="mt-2 grid gap-3" style:grid-template-columns={columnTemplate} data-testid="runtime-children">
			{#each children as child (child.id)}
				<RenderNode
					instance={child}
					{columns}
					{data}
					{errors}
					{loading}
					depth={depth + 1}
				/>
			{/each}
		</div>
	{/if}
</div>