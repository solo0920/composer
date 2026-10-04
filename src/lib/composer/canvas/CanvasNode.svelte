<script lang="ts">
	import type { UIDefinition, UIComponentInstance } from '$lib/domain/definitions/ui-definition';
	import { svelteComponentRegistry } from '$lib/runtime/renderer-registry.svelte';
	import type { RendererProps } from '$lib/runtime/renderer-registry.svelte';
	import CanvasNode from './CanvasNode.svelte';

	/**
	 * One editable canvas cell, rendered recursively so nested components are
	 * visible and selectable at any depth. Uses the same registry renderers as
	 * the Runtime Preview, so Canvas and Preview never disagree about
	 * appearance.
	 */
	let {
		instance,
		columns,
		selectedId,
		onselect
	}: {
		instance: UIComponentInstance;
		columns: number;
		selectedId: string | null;
		onselect: (id: string) => void;
	} = $props();

	const resolved = $derived(svelteComponentRegistry.get(instance.type));
	const children = $derived(instance.children ?? []);
	const isSelected = $derived(instance.id === selectedId);
	const columnTemplate = $derived(`repeat(${columns}, minmax(0, 1fr))`);
	const runtimeProps = $derived<RendererProps>({ props: instance.props, data: {} });
</script>

<div
	data-canvas-item
	data-testid="canvas-item"
	data-component-id={instance.id}
	data-component-type={instance.type}
	class="min-w-0 cursor-pointer rounded-md text-left ring-offset-2 transition-shadow
		{isSelected ? 'ring-2 ring-ring' : 'hover:ring-1 hover:ring-ring/40'}"
	style:grid-column="{instance.layout.column} / span {instance.layout.span}"
	style:grid-row={instance.layout.row ?? 'auto'}
	onclick={(event) => {
		event.stopPropagation();
		onselect(instance.id);
	}}
	onkeydown={(event) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			onselect(instance.id);
		}
	}}
	role="button"
	tabindex="0"
	aria-pressed={isSelected}
>
	{#if resolved}
		<resolved.renderer {...runtimeProps} />
	{:else}
		<p class="text-sm text-destructive">Unknown component: {instance.type}</p>
	{/if}

	<div class="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
		<span class="rounded bg-muted px-1 py-0.5 font-mono">{instance.id}</span>
		<span>col {instance.layout.column} · span {instance.layout.span}</span>
		{#if children.length > 0}
			<span class="rounded bg-muted px-1 py-0.5">{children.length} child{children.length === 1 ? '' : 'ren'}</span>
		{/if}
		{#if instance.binding}
			<span class="rounded bg-muted px-1 py-0.5 font-mono text-foreground">{instance.binding.api}</span>
		{/if}
	</div>

	{#if children.length > 0}
		<div class="mt-2 grid gap-3" style:grid-template-columns={columnTemplate} data-testid="canvas-children">
			{#each children as child (child.id)}
				<CanvasNode
					instance={child}
					{columns}
					{selectedId}
					{onselect}
				/>
			{/each}
		</div>
	{/if}
</div>