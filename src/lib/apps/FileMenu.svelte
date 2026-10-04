<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuSeparator,
		DropdownMenuTrigger
	} from '$lib/components/ui/dropdown-menu/index.js';
	import { ChevronDown, FilePlus2, FolderOpen, Save, CopyPlus, Download, Settings } from '@lucide/svelte';

	/**
	 * File menu. Emits intents only — every action is carried out by the
	 * Workspace, so this component holds no app state of its own.
	 */
	let {
		disabled = false,
		oncommand
	}: {
		disabled?: boolean;
		oncommand: (command: 'new' | 'open' | 'save' | 'saveAs' | 'export' | 'settings') => void;
	} = $props();
</script>

<DropdownMenu>
	<DropdownMenuTrigger>
		{#snippet child({ props: triggerProps })}
			<Button
				{...triggerProps}
				variant="outline"
				size="sm"
				class="gap-1"
				data-testid="file-menu"
				{disabled}
			>
				<FilePlus2 class="size-4" />
				File
				<ChevronDown class="size-3.5 opacity-60" />
			</Button>
		{/snippet}
	</DropdownMenuTrigger>

	<DropdownMenuContent align="start" class="w-56">
		<DropdownMenuItem data-testid="file-new" onclick={() => oncommand('new')}>
			<FilePlus2 class="size-4" />
			New app
		</DropdownMenuItem>
		<DropdownMenuItem data-testid="file-open" onclick={() => oncommand('open')}>
			<FolderOpen class="size-4" />
			Open app…
		</DropdownMenuItem>
		<DropdownMenuSeparator />
		<DropdownMenuItem data-testid="file-save" disabled={disabled} onclick={() => oncommand('save')}>
			<Save class="size-4" />
			Save
		</DropdownMenuItem>
		<DropdownMenuItem data-testid="file-save-as" disabled={disabled} onclick={() => oncommand('saveAs')}>
			<CopyPlus class="size-4" />
			Save as…
		</DropdownMenuItem>
		<DropdownMenuItem data-testid="file-export" disabled={disabled} onclick={() => oncommand('export')}>
			<Download class="size-4" />
			Export app…
		</DropdownMenuItem>
		<DropdownMenuSeparator />
		<DropdownMenuItem data-testid="file-settings" onclick={() => oncommand('settings')}>
			<Settings class="size-4" />
			Settings…
		</DropdownMenuItem>
	</DropdownMenuContent>
</DropdownMenu>