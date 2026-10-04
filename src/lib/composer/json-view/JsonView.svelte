<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';

	/**
	 * Read-only JSON view of the current definition. This is where the seam for
	 * two-way Visual -> JSON -> Visual editing sits: `onapply` already routes a
	 * user-edited document through the same validation boundary as localStorage.
	 */
	let {
		json,
		error = null,
		onapply
	}: {
		json: string;
		error?: string | null;
		onapply: (raw: string) => void;
	} = $props();

	let draft = $state('');

	$effect(() => {
		draft = json;
	});
</script>

<div class="flex flex-col gap-2 p-4">
	<div class="flex items-center justify-between gap-2">
		<p class="text-xs text-muted-foreground">
			Current <span class="font-mono">UIDefinition</span> as JSON.
		</p>
		<div class="flex items-center gap-2">
			<Button variant="outline" size="sm" onclick={() => (draft = json)}>Revert</Button>
			<Button size="sm" onclick={() => onapply(draft)} data-testid="apply-json">
				Apply JSON
			</Button>
		</div>
	</div>

	<textarea
		class="min-h-96 w-full resize-y rounded-md border border-input bg-background p-3 font-mono text-xs leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring"
		aria-label="UI definition JSON"
		bind:value={draft}
	></textarea>

	{#if error}
		<p class="text-xs text-destructive" data-testid="json-error">{error}</p>
	{/if}
</div>