<script lang="ts">
	import type { JsonObject } from '$lib/domain/json';

	let { props }: { props: JsonObject } = $props();

	const title = $derived(asText(props['title'], ''));
	const subtitle = $derived(asText(props['subtitle'], ''));

	function asText(value: unknown, fallback: string): string {
		return typeof value === 'string' && value.length > 0 ? value : fallback;
	}
</script>

<section
	class="flex h-full flex-col gap-1 rounded-lg border-2 border-dashed border-border p-4 text-foreground"
>
	{#if title}
		<h2 class="text-base font-semibold tracking-tight">{title}</h2>
	{/if}
	{#if subtitle}
		<p class="text-sm text-muted-foreground">{subtitle}</p>
	{/if}
	<div class="min-h-8" data-testid="container-slot"></div>
</section>