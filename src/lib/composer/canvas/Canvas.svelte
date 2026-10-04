<script lang="ts">
	import type { UIDefinition } from '$lib/domain/definitions/ui-definition';
	import { svelteComponentRegistry } from '$lib/runtime/renderer-registry.svelte';

	/**
	 * Composer canvas: an editable 12-column grid. It renders each component with
	 * its registry renderer so the Canvas and the Runtime Preview always agree
	 * about how a component looks — there is only one Preview layout.
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
				{@const resolved = svelteComponentRegistry.get(instance.type)}
				{@const isSelected = instance.id === selectedId}
				<div
					data-canvas-item
					data-testid="canvas-item"
					data-component-id={instance.id}
					data-component-type={instance.type}
					class="min-w-0 cursor-pointer rounded-md text-left ring-offset-2 transition-shadow
						{isSelected ? 'ring-2 ring-ring' : 'hover:ring-1 hover:ring-ring/40'}"
					style:grid-column="{instance.layout.column} / span {instance.layout.span}"
					style:grid-row={instance.layout.row ?? 'auto'}
					onclick={() => onselect(instance.id)}
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
						{@const runtimeProps = { props: instance.props, data: {} }}
						<resolved.renderer {...runtimeProps} />
					{:else}
						<p class="text-sm text-destructive">Unknown component: {instance.type}</p>
					{/if}

					<div class="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
						<span class="rounded bg-muted px-1 py-0.5 font-mono">{instance.id}</span>
						<span>
							col {instance.layout.column} · span {instance.layout.span}
						</span>
						{#if instance.binding}
							<span class="rounded bg-muted px-1 py-0.5 font-mono text-foreground">
								{instance.binding.api}
							</span>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>