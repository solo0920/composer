<script lang="ts">
	import type { UIDefinition } from '$lib/domain/definitions/ui-definition';
	import type { JsonObject } from '$lib/domain/json';
	import type { ApiRegistry } from '$lib/registry/api-registry';
	import type { ComponentRegistry } from '$lib/registry/component-registry';
	import RuntimeRenderer from '$lib/runtime/RuntimeRenderer.svelte';
	import type { PreviewData } from '$lib/runtime/preview-runtime.svelte';
	import type { ComposerState } from './state/composer-state.svelte';
	import { toJson } from './state/composer-state.svelte';
	import Toolbar from './Toolbar.svelte';
	import Canvas from './canvas/Canvas.svelte';
	import ComponentPalette from './palette/ComponentPalette.svelte';
	import Inspector from './inspector/Inspector.svelte';
	import JsonView from './json-view/JsonView.svelte';

	/**
	 * Composer shell. Holds no definition state of its own: everything renders
	 * from `state.definition`, which the Runtime Preview also consumes.
	 */
	let {
		state,
		componentRegistry,
		apiRegistry,
		preview,
		message,
		jsonError,
		onmodechange,
		onsave,
		onload,
		onreset,
		onapplyjson
	}: {
		state: ComposerState;
		componentRegistry: ComponentRegistry;
		apiRegistry: ApiRegistry;
		preview: PreviewData;
		message: string | null;
		jsonError: string | null;
		onmodechange: (mode: 'edit' | 'preview') => void;
		onsave: () => void;
		onload: () => void;
		onreset: () => void;
		onapplyjson: (raw: string) => void;
	} = $props();

	const definition = $derived(state.definition);
	const selected = $derived(state.selectedComponent);
	const selectedDef = $derived(state.selectedComponentDefinition);

	function patchProps(patch: JsonObject): void {
		if (selected) state.updateProps(selected.id, patch);
	}

	function applyJson(raw: string): void {
		onapplyjson(raw);
	}
</script>

<div class="flex h-screen flex-col overflow-hidden bg-background text-foreground">
	<Toolbar
		name={definition.name}
		mode={state.mode}
		view={state.view}
		dirty={state.dirty}
		{message}
		onnamechange={(name) => state.rename(name)}
		onmodechange={onmodechange}
		onviewchange={(view) => (state.view = view)}
		onsave={onsave}
		onload={onload}
		onreset={onreset}
	/>

	{#if state.mode === 'preview'}
		<main class="flex-1 overflow-y-auto p-6">
			<div class="mx-auto max-w-5xl">
				<h1 class="mb-4 text-xl font-bold" data-testid="preview-title">{definition.name}</h1>
				<RuntimeRenderer
					{definition}
					data={preview.data}
					errors={preview.errors}
					loading={preview.loading}
				/>
			</div>
		</main>
	{:else}
		<div class="flex min-h-0 flex-1">
			<ComponentPalette registry={componentRegistry} onadd={(type) => state.addComponent(type)} />

			{#if state.view === 'visual'}
				<Canvas
					{definition}
					selectedId={state.selectedComponentId}
					onselect={(id) => state.selectComponent(id)}
				/>
			{:else}
				<div class="flex-1 overflow-y-auto">
					<JsonView
						json={toJson(definition as UIDefinition)}
						error={jsonError}
						onapply={applyJson}
					/>
				</div>
			{/if}

			{#if selected && selectedDef}
				<Inspector
					componentDef={selectedDef}
					instanceId={selected.id}
					props={selected.props}
					layout={selected.layout}
					binding={selected.binding}
					{apiRegistry}
					onpropschange={patchProps}
					onlayoutchange={(layout) => state.updateLayout(selected!.id, layout)}
					onbindingchange={(binding) => state.setBinding(selected!.id, binding)}
					suggestBinding={(apiId) => state.suggestBinding(apiId)}
					onremove={() => state.removeComponent(selected!.id)}
				/>
			{:else}
				<aside
					class="flex w-80 shrink-0 flex-col items-center justify-center gap-2 border-l border-border p-4 text-center"
				>
					<p class="text-sm font-medium">Nothing selected</p>
					<p class="text-xs text-muted-foreground">
						Select a component on the canvas to edit its properties, layout and binding.
					</p>
				</aside>
			{/if}
		</div>
	{/if}
</div>