<script lang="ts">
	import type { Stage, StageId } from '../stages';

	/**
	 * Presentational workflow indicator.
	 *
	 * It renders the stages it is given and reports the active one. It deliberately
	 * decides nothing about what content the workspace shows, so the highlighted stage
	 * cannot drift away from the content below it.
	 *
	 * Read-only in this phase: `onselect` is optional and, when absent, the stages
	 * render as a plain status sequence rather than as controls.
	 */
	let {
		stages,
		activeStage,
		onselect
	}: {
		stages: readonly Stage[];
		activeStage: StageId;
		onselect?: (stage: StageId) => void;
	} = $props();

	const ordered = $derived([...stages].sort((a, b) => a.order - b.order));
</script>

<nav
	class="flex flex-wrap items-center gap-1 border-b border-border bg-muted/40 px-4 py-2"
	role="group"
	aria-label="Authoring workflow"
	data-testid="workflow-roadmap"
>
	{#each ordered as stage, index (stage.id)}
		{@const isActive = stage.id === activeStage}
		{@const interactive = onselect !== undefined}

		{#if interactive}
			<button
				type="button"
				data-testid="workflow-stage"
				data-stage-id={stage.id}
				data-order={stage.order}
				data-active={isActive}
				aria-current={isActive ? 'step' : undefined}
				class="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors
					{isActive
					? 'bg-primary font-medium text-primary-foreground'
					: 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
				onclick={() => onselect?.(stage.id)}
			>
				<span class="text-xs tabular-nums opacity-70">{stage.order}</span>
				<span data-testid="workflow-stage-label">{stage.label}</span>
			</button>
		{:else}
			<span
				data-testid="workflow-stage"
				data-stage-id={stage.id}
				data-order={stage.order}
				data-active={isActive}
				aria-current={isActive ? 'step' : undefined}
				class="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm
					{isActive
					? 'bg-primary font-medium text-primary-foreground'
					: 'text-muted-foreground'}"
			>
				<span class="text-xs tabular-nums opacity-70">{stage.order}</span>
				<span data-testid="workflow-stage-label">{stage.label}</span>
			</span>
		{/if}

		{#if index < ordered.length - 1}
			<span class="text-muted-foreground/50" aria-hidden="true">&rarr;</span>
		{/if}
	{/each}
</nav>