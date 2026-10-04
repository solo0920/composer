<script lang="ts">
	import type { UIDefinition } from '$lib/domain/definitions/ui-definition';
	import CanvasNode from './CanvasNode.svelte';

	/**
	 * Composer canvas: an editable grid of the component tree. Select a cell to
	 * edit it in the Inspector; clicking empty space clears the selection.
	 */
	let {
		definition,
		selectedId = null,
		onselect
	}: {
		definition: UIDefinition;
		selectedId?: string | null;
		onselect: (id: string | null) => void;
	} = $props();

	const columnTemplate = $derived(`repeat(${definition.layout.columns}, minmax(0, 1fr))`);
</script>

<div class="flex-1 overflow-y-auto p-4">
	{#if definition.components.length === 0}
		<p class="py-16 text-center text-sm text-muted-foreground">
			No components yet. Add one from the palette.
		</p>
	{:else}
		<div
			class="grid gap-3"
			style:grid-template-columns={columnTemplate}
			data-testid="canvas-grid"
			role="presentation"
			onclick={(event) => {
				const target = event.target as HTMLElement;
				if (target.closest('[data-canvas-item]') === null) onselect(null);
			}}
			onkeydown={(event) => {
				if (event.key === 'Escape') onselect(null);
			}}
		>
			{#each definition.components as instance (instance.id)}
				<CanvasNode
					{instance}
					columns={definition.layout.columns}
					{selectedId}
					{onselect}
				/>
			{/each}
		</div>
	{/if}
</div>