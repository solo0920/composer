<script lang="ts">
	/** Small inline marker distinguishing stacks this MVP can run from ones it cannot. */
	let { implemented }: { implemented: boolean } = $props();
</script>

<span
	class="rounded px-1 py-0.5 text-[10px] font-medium
		{implemented ? 'bg-emerald-100 text-emerald-800' : 'bg-muted text-muted-foreground'}"
	data-testid="stack-badge"
	data-implemented={implemented}
>
	{implemented ? 'implemented' : 'planned'}
</span>