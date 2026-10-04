<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog/index.js';
	import type { AppSummary } from '$lib/domain/apps/app-document';

	let {
		open = $bindable(false),
		apps,
		currentId,
		onopen,
		ondelete
	}: {
		open?: boolean;
		apps: AppSummary[];
		currentId: string | null;
		onopen: (id: string) => void;
		ondelete: (id: string) => void;
	} = $props();
</script>

<Dialog bind:open>
	<DialogContent class="sm:max-w-lg" data-testid="open-app-dialog">
		<DialogHeader>
			<DialogTitle>Open app</DialogTitle>
			<DialogDescription>
				{apps.length === 0
					? 'No saved apps yet.'
					: `${apps.length} saved app${apps.length === 1 ? '' : 's'} in this browser.`}
			</DialogDescription>
		</DialogHeader>

		{#if apps.length === 0}
			<p class="py-6 text-center text-sm text-muted-foreground" data-testid="open-app-empty">
				Use “New app” to create one.
			</p>
		{:else}
			<ul class="flex max-h-72 flex-col gap-1 overflow-y-auto" data-testid="open-app-list">
				{#each apps as app (app.id)}
					<li class="flex items-center gap-2 rounded-md border border-border px-2 py-2">
						<button
							type="button"
							class="flex min-w-0 flex-1 flex-col text-left"
							data-testid="open-app-item"
							data-app-id={app.id}
							onclick={() => {
								onopen(app.id);
								open = false;
							}}
						>
							<span class="truncate text-sm font-medium">
								{app.name}
								{#if app.id === currentId}
									<span class="text-xs text-muted-foreground">(open)</span>
								{/if}
							</span>
							<span class="text-xs text-muted-foreground">
								{app.componentCount} component{app.componentCount === 1 ? '' : 's'} ·
								{new Date(app.updatedAt).toLocaleString()}
							</span>
						</button>
						<Button
							variant="ghost"
							size="sm"
							class="text-destructive"
							data-testid="delete-app"
							onclick={() => ondelete(app.id)}>Delete</Button
						>
					</li>
				{/each}
			</ul>
		{/if}

		<DialogFooter>
			<Button variant="outline" onclick={() => (open = false)} data-testid="close-open-app">
				Close
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>