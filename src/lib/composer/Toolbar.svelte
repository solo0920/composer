<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { Tabs, TabsList, TabsTrigger } from '$lib/components/ui/tabs/index.js';
	import type { LayoutPresentation, StageId } from './stages';
	import FileMenu from '../apps/FileMenu.svelte';

	let {
		appName,
		activeStage,
		layoutPresentation,
		dirty,
		hasApp,
		message,
		onstagechange,
		onpresentationchange,
		onreset,
		onfilecommand
	}: {
		appName: string;
		activeStage: StageId;
		layoutPresentation: LayoutPresentation;
		dirty: boolean;
		hasApp: boolean;
		message: string | null;
		onstagechange: (stage: StageId) => void;
		onpresentationchange: (value: LayoutPresentation) => void;
		onreset: () => void;
		onfilecommand: (command: 'new' | 'open' | 'save' | 'saveAs' | 'export' | 'settings') => void;
	} = $props();

	const SUCCESS_PREFIXES = [
		'Saved',
		'Created',
		'Opened',
		'Reopened',
		'Exported',
		'Settings',
		'Reset'
	];

	const messageTone = $derived(
		message !== null && SUCCESS_PREFIXES.some((prefix) => message.startsWith(prefix))
			? 'text-muted-foreground'
			: 'text-destructive'
	);

	// True while the layout stage owns the presentation control, so it is never
	// offered on a stage where it would have no effect.
	const showsLayoutPresentation = $derived(activeStage === 'layout');
</script>

<header class="flex flex-wrap items-center gap-3 border-b border-border px-4 py-2">
	<FileMenu disabled={!hasApp} oncommand={onfilecommand} />

	<Separator orientation="vertical" class="h-5" />

	<div class="flex items-center gap-2">
		<span class="text-sm font-semibold" data-testid="app-name">{appName}</span>
		{#if dirty}
			<span
				class="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800"
				data-testid="dirty-flag">unsaved</span
			>
		{/if}
	</div>

	<!-- TEMPORARY SHIM (removed in User Story 2 and User Story 4). These controls
	     predate the workflow roadmap and delegate to the same stage axis, so the
	     application stays fully usable while the roadmap is built. -->
	<div class="flex items-center gap-1" data-testid="legacy-mode-toggle">
		<Button
			size="sm"
			variant={activeStage === 'preview' ? 'default' : 'outline'}
			data-testid="preview-toggle"
			onclick={() => onstagechange('preview')}
		>
			Preview
		</Button>
	</div>

	<div class="flex items-center gap-1" data-testid="workspace-view">
		<Button
			size="sm"
			variant={activeStage === 'binding' ? 'secondary' : 'ghost'}
			data-testid="view-binding"
			onclick={() => onstagechange('binding')}
		>
			Binding
		</Button>
		<Button
			size="sm"
			variant={activeStage === 'layout' ? 'secondary' : 'ghost'}
			data-testid="view-compose"
			onclick={() => onstagechange('layout')}
		>
			Compose
		</Button>
	</div>

	{#if showsLayoutPresentation}
		<Tabs
			value={layoutPresentation}
			onValueChange={(next) => onpresentationchange(next as LayoutPresentation)}
		>
			<TabsList>
				<TabsTrigger value="visual">Visual</TabsTrigger>
				<TabsTrigger value="json">JSON</TabsTrigger>
			</TabsList>
		</Tabs>
	{/if}

	<div class="ml-auto flex items-center gap-2">
		{#if message}
			<span class="max-w-md truncate text-xs {messageTone}" data-testid="toolbar-message">{message}</span>
		{/if}
		<Button size="sm" variant="ghost" onclick={onreset} disabled={!hasApp}>Reset</Button>
		<Button size="sm" onclick={() => onfilecommand('save')} disabled={!hasApp} data-testid="save">Save</Button>
	</div>
</header>