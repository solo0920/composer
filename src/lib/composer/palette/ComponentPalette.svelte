<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import type { ComponentRegistry } from '$lib/registry/component-registry';

	/**
	 * Palette driven entirely by Component Registry metadata: the list, the
	 * labels and the grouping are all read from the registry.
	 */
	let {
		registry,
		onadd
	}: {
		registry: ComponentRegistry;
		onadd: (type: string) => void;
	} = $props();

	const groups = $derived(registry.listByCategory());
</script>

<aside class="flex w-56 shrink-0 flex-col gap-4 overflow-y-auto border-r border-border p-3">
	<div>
		<h2 class="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Components</h2>
	</div>

	{#each groups as group (group.category)}
		<section class="flex flex-col gap-1.5">
			<h3 class="text-xs font-medium text-muted-foreground">{group.category}</h3>
			{#each group.items as component (component.type)}
				<Button
					variant="outline"
					size="sm"
					class="h-auto justify-start py-2 text-left"
					data-testid="palette-item"
					data-component-type={component.type}
					onclick={() => onadd(component.type)}
				>
					<span class="flex flex-col">
						<span class="text-sm font-medium">{component.label}</span>
						{#if component.description}
							<span class="text-xs font-normal text-muted-foreground">{component.description}</span>
						{/if}
					</span>
				</Button>
			{/each}
		</section>
	{/each}
</aside>