<script lang="ts">
	import type { JsonObject } from '$lib/domain/json';

	let { props }: { props: JsonObject } = $props();

	const text = $derived(typeof props['text'] === 'string' ? props['text'] : '');
	const variant = $derived(typeof props['variant'] === 'string' ? props['variant'] : 'body');

	const VARIANTS: Record<string, string> = {
		heading: 'text-2xl font-bold tracking-tight',
		subtitle: 'text-lg font-semibold tracking-tight',
		body: 'text-sm',
		caption: 'text-xs text-muted-foreground'
	};

	const classes = $derived(VARIANTS[variant] ?? VARIANTS['body']);
</script>

<p class={classes} data-testid="text-component">{text}</p>