<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { ChevronDown, ChevronRight } from '@lucide/svelte';
	import type { ComponentRegistry } from '$lib/registry/component-registry';

	/**
	 * Palette driven entirely by Component Registry metadata: the list, the
	 * labels, the grouping and which groups are collapsible all come from the
	 * registry. Categories start expanded; collapse state is local UI state and
	 * is never written into the definition.
	 */
	let {
		registry,
		insertTarget,
		onadd
	}: {
		registry: ComponentRegistry;
		/** Id of the container the next added component will land in, if any. */
		insertTarget?: string | null;
		onadd: (type: string) => void;
	} = $props();

	const groups = $derived(registry.listByCategory());
	let collapsed = $state<Record<string, boolean>>({});

	function toggle(category: string): void {
		collapsed = { ...collapsed, [category]: !collapsed[category] };
	}
</script>

<aside class="flex w-56 shrink-0 flex-col gap-3 overflow-y-auto border-r border-border p-3">
	<div>
		<h2 class="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Components</h2>
		<p class="text-xs text-muted-foreground" data-testid="palette-insert-target">
			{#if insertTarget}
				Adding inside <span class="font-mono text-foreground">{insertTarget}</span>
			{:else}
				Adding at the root level
			{/if}
		</p>
	</div>

	{#each groups as group (group.category)}
		<section class="flex flex-col gap-1.5" data-category={group.category}>
			<Button
				variant="ghost"
				size="sm"
				class="h-7 justify-start gap-1 px-1 text-muted-foreground"
				data-testid="palette-category"
				data-category={group.category}
				aria-expanded={collapsed[group.category] !== true}
				onclick={() => toggle(group.category)}
			>
				{#if collapsed[group.category] === true}
					<ChevronRight class="size-3.5" />
				{:else}
					<ChevronDown class="size-3.5" />
				{/if}
				<span class="text-xs font-medium">{group.category}</span>
				<span class="text-xs text-muted-foreground">({group.items.length})</span>
			</Button>

			{#if collapsed[group.category] !== true}
				<div class="flex flex-col gap-1.5" data-testid="palette-group-items">
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
								{#if component.acceptsChildren}
									<span class="text-[10px] font-normal text-muted-foreground">accepts children</span>
								{/if}
							</span>
						</Button>
					{/each}
				</div>
			{/if}
		</section>
	{/each}
</aside>