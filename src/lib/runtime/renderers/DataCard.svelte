<script lang="ts">
	import type { JsonObject } from '$lib/domain/json';

	let {
		props,
		data
	}: {
		props: JsonObject;
		data: JsonObject;
	} = $props();

	const rows = $derived(
		Object.entries(data).map(([key, value]) => ({ key, value: formatValue(value) }))
	);

	const title = $derived(asText(props['title'], 'Data'));
	const emptyText = $derived(asText(props['emptyText'], 'No data'));

	function asText(value: unknown, fallback: string): string {
		return typeof value === 'string' && value.length > 0 ? value : fallback;
	}

	function formatValue(value: unknown): string {
		if (value === null || value === undefined) return '—';
		if (typeof value === 'object') return JSON.stringify(value);
		return String(value);
	}
</script>

<section class="flex h-full flex-col gap-2 rounded-lg border border-border bg-card p-4 text-card-foreground">
	<h3 class="text-sm font-semibold tracking-tight">{title}</h3>
	{#if rows.length === 0}
		<p class="text-sm text-muted-foreground">{emptyText}</p>
	{:else}
		<dl class="grid grid-cols-1 gap-2 sm:grid-cols-2">
			{#each rows as row (row.key)}
				<div class="flex flex-col">
					<dt class="text-xs text-muted-foreground">{row.key}</dt>
					<dd class="text-sm font-medium break-words" data-testid="data-card-value">
						{row.value}
					</dd>
				</div>
			{/each}
		</dl>
	{/if}
</section>