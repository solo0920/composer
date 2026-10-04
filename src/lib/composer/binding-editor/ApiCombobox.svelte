<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import {
		Command,
		CommandEmpty,
		CommandGroup,
		CommandInput,
		CommandItem,
		CommandList
	} from '$lib/components/ui/command/index.js';
	import { Popover, PopoverContent, PopoverTrigger } from '$lib/components/ui/popover/index.js';
	import { cn } from '$lib/utils.js';
	import type { ApiRegistry } from '$lib/registry/api-registry';

	/**
	 * Searchable API picker. The option list and the grouping come entirely from
	 * the API Registry — adding an API needs no change here.
	 */
	let {
		registry,
		selected,
		onselect,
		id,
		invalid = false
	}: {
		registry: ApiRegistry;
		selected: string | undefined;
		onselect: (apiId: string | undefined) => void;
		id?: string;
		invalid?: boolean;
	} = $props();

	let open = $state(false);

	const groups = $derived(registry.listByCategory());
	const current = $derived(selected === undefined ? undefined : registry.get(selected));
</script>

<Popover bind:open>
	<PopoverTrigger>
		{#snippet child({ props: triggerProps })}
			<Button
				{...triggerProps}
				{id}
				variant="outline"
				role="combobox"
				aria-expanded={open}
				class={cn(
					'w-full justify-between font-normal',
					invalid && 'border-destructive',
					!current && 'text-muted-foreground'
				)}
			>
				<span class="truncate" data-testid="api-combobox-value">
					{current ? `${current.id} — ${current.name}` : 'Select an API function'}
				</span>
			</Button>
		{/snippet}
	</PopoverTrigger>

	<PopoverContent class="w-[--bits-popover-trigger-width] p-0" align="start">
		<Command>
			<CommandInput placeholder="Search APIs…" />
			<CommandList>
				<CommandEmpty>No API matches that search.</CommandEmpty>
				{#each groups as group (group.category)}
					<CommandGroup heading={group.category}>
						{#each group.items as api (api.id)}
							<CommandItem
								value={`${api.id} ${api.name} ${api.description ?? ''}`}
								onSelect={() => {
									onselect(api.id);
									open = false;
								}}
							>
								<div class="flex flex-col">
									<span class="text-sm font-medium">{api.id}</span>
									<span class="text-xs text-muted-foreground">{api.description}</span>
								</div>
							</CommandItem>
						{/each}
					</CommandGroup>
				{/each}
			</CommandList>
		</Command>
	</PopoverContent>
</Popover>