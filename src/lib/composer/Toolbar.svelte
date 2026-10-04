<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { Tabs, TabsList, TabsTrigger } from '$lib/components/ui/tabs/index.js';
	import type { LayoutPresentation, Stage, StageId } from './stages';
	import FileMenu from '../apps/FileMenu.svelte';
	import WorkflowRoadmap from './workflow/WorkflowRoadmap.svelte';

	/**
	 * The composer's single top-level bar.
	 *
	 * The workflow stages live inline here rather than in a second bar above it, and
	 * the earlier `Compose`/`Binding` and `Edit`/`Preview` toggles are gone: they
	 * duplicated the stage control. Exactly one control group now decides what the
	 * workspace shows.
	 */
	let {
		appName,
		stages,
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
		stages: readonly Stage[];
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

	// The presentation control only applies to the layout stage, so it is never
	// offered where it would have no effect.
	const showsLayoutPresentation = $derived(activeStage === 'layout');
</script>

<header
	class="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2"
	data-testid="composer-header"
>
	<FileMenu disabled={!hasApp} oncommand={onfilecommand} />

	<Separator orientation="vertical" class="mr-1 h-5" />

	<WorkflowRoadmap {stages} {activeStage} onselect={onstagechange} />

	<Separator orientation="vertical" class="ml-1 h-5" />

	<div class="flex min-w-0 items-center gap-2">
		<span class="truncate text-sm font-semibold" data-testid="app-name">{appName}</span>
		{#if dirty}
			<span
				class="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800"
				data-testid="dirty-flag">unsaved</span
			>
		{/if}
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
		<Button
			size="sm"
			variant="ghost"
			onclick={onreset}
			disabled={!hasApp}
			data-testid="reset">Reset</Button
		>
		<Button size="sm" onclick={() => onfilecommand('save')} disabled={!hasApp} data-testid="save">Save</Button>
	</div>
</header>