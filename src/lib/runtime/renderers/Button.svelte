<script lang="ts">
	import { Button, type ButtonVariant } from '$lib/components/ui/button/index.js';
	import type { JsonObject } from '$lib/domain/json';

	let { props }: { props: JsonObject } = $props();

	/**
	 * Component definitions may only name a variant the runtime understands.
	 * Unknown names fall back to the default instead of reaching into shadcn's
	 * variant union with an unchecked cast.
	 */
	const VARIANTS: Record<string, ButtonVariant> = {
		default: 'default',
		secondary: 'secondary',
		outline: 'outline',
		ghost: 'ghost',
		destructive: 'destructive'
	};

	const label = $derived(typeof props['label'] === 'string' && props['label'] ? props['label'] : 'Button');
	const variantName = $derived(typeof props['variant'] === 'string' ? props['variant'] : 'default');
	const variant = $derived(VARIANTS[variantName] ?? 'default');
</script>

<div class="flex h-full items-start">
	<Button data-testid="button-component" {variant} type="button">{label}</Button>
</div>