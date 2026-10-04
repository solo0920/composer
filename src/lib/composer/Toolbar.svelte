<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { Tabs, TabsList, TabsTrigger } from '$lib/components/ui/tabs/index.js';
	import type { ComposerMode, ComposerView } from './state/composer-state.svelte';

	let {
		name,
		mode,
		view,
		dirty,
		message,
		onnamechange,
		onmodechange,
		onviewchange,
		onsave,
		onload,
		onreset
	}: {
		name: string;
		mode: ComposerMode;
		view: ComposerView;
		dirty: boolean;
		message: string | null;
		onnamechange: (name: string) => void;
		onmodechange: (mode: ComposerMode) => void;
		onviewchange: (view: ComposerView) => void;
		onsave: () => void;
		onload: () => void;
		onreset: () => void;
	} = $props();
</script>

<header class="flex flex-wrap items-center gap-3 border-b border-border px-4 py-2">
	<div class="flex items-center gap-2">
		<span class="text-sm font-semibold">UI Definition Composer</span>
		{#if dirty}
			<span class="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800" data-testid="dirty-flag">
				unsaved
			</span>
		{/if}
	</div>

	<Input
		value={name}
		aria-label="Definition name"
		class="h-8 w-56"
		oninput={(event) => onnamechange(event.currentTarget.value)}
	/>

	<div class="flex items-center gap-1">
		<Button size="sm" variant={mode === 'edit' ? 'default' : 'outline'} onclick={() => onmodechange('edit')}>
			Edit
		</Button>
		<Button
			size="sm"
			variant={mode === 'preview' ? 'default' : 'outline'}
			data-testid="preview-toggle"
			onclick={() => onmodechange('preview')}
		>
			Preview
		</Button>
	</div>

	{#if mode === 'edit'}
		<Tabs value={view} onValueChange={(next) => onviewchange(next as ComposerView)}>
			<TabsList>
				<TabsTrigger value="visual">Visual</TabsTrigger>
				<TabsTrigger value="json">JSON</TabsTrigger>
			</TabsList>
		</Tabs>
	{/if}

	<div class="ml-auto flex items-center gap-2">
		{#if message}
			<span
				class="max-w-md truncate text-xs {message.startsWith('Saved') || message.startsWith('Loaded')
					? 'text-muted-foreground'
					: 'text-destructive'}"
				data-testid="toolbar-message">{message}</span
			>
		{/if}
		<Button size="sm" variant="ghost" onclick={onload}>Load</Button>
		<Button size="sm" variant="ghost" onclick={onreset}>Reset</Button>
		<Button size="sm" data-testid="save" onclick={onsave}>Save</Button>
	</div>
</header>

<Separator />