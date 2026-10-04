<script lang="ts">
	import type { JsonObject } from '$lib/domain/json';
	import type { ApiRegistry } from '$lib/registry/api-registry';
	import type { ComponentRegistry } from '$lib/registry/component-registry';
import type { StackRegistry } from '$lib/registry/stack-registry';
	import type { Workspace } from '../apps/workspace.svelte';
	import RuntimeRenderer from '$lib/runtime/RuntimeRenderer.svelte';
	import type { PreviewData } from '$lib/runtime/preview-runtime.svelte';
	import { toJson } from './state/composer-state.svelte';
	import AppNameDialog from '../apps/AppNameDialog.svelte';
	import ComponentPalette from './palette/ComponentPalette.svelte';
	import Canvas from './canvas/Canvas.svelte';
	import Inspector from './inspector/Inspector.svelte';
	import JsonView from './json-view/JsonView.svelte';
	import BindingPanel from './binding-editor/BindingPanel.svelte';
import OpenAppDialog from '../apps/OpenAppDialog.svelte';
	import SettingsDialog from '../apps/SettingsDialog.svelte';
	import Toolbar from './Toolbar.svelte';

	/**
	 * Composer shell. Holds no definition state of its own: everything renders
	 * from `workspace.composer.definition`, which the Runtime Preview also
	 * consumes.
	 */
	let {
		workspace,
		componentRegistry,
		apiRegistry,
		stackRegistry,
		preview,
		jsonError,
		onapplyjson
	}: {
		workspace: Workspace;
		componentRegistry: ComponentRegistry;
		apiRegistry: ApiRegistry;
		stackRegistry: StackRegistry;
		preview: PreviewData;
		jsonError: string | null;
		onapplyjson: (raw: string) => void;
	} = $props();

	const composer = $derived(workspace.composer);
	const definition = $derived(composer.definition);
	const selected = $derived(composer.selectedComponent);
	const selectedDef = $derived(composer.selectedComponentDefinition);
	const insertTarget = $derived(composer.insertParentId);
	const hasApp = $derived(workspace.app !== null);

	let workspaceView = $state<'compose' | 'binding'>('compose');

	// One flag per dialog so each can be bound directly.
	let openNew = $state(false);
	let openOpen = $state(false);
	let openSaveAs = $state(false);
	let openSettings = $state(false);

	function run(command: 'new' | 'open' | 'save' | 'saveAs' | 'export' | 'settings'): void {
		switch (command) {
			case 'new':
				openNew = true;
				return;
			case 'open':
				openOpen = true;
				return;
			case 'saveAs':
				openSaveAs = true;
				return;
			case 'settings':
				openSettings = true;
				return;
			case 'save':
				workspace.save();
				return;
			case 'export':
				workspace.exportApp();
				return;
		}
	}
</script>

<div class="flex h-screen flex-col overflow-hidden bg-background text-foreground">
	<Toolbar
		appName={definition.name}
		mode={composer.mode}
		view={composer.view}
		dirty={composer.dirty}
		{hasApp}
		message={workspace.message}
		onmodechange={(mode) => (composer.mode = mode)}
		onviewchange={(view) => (composer.view = view)}
		onreset={() => workspace.resetToDemo()}
		onfilecommand={run}
		bind:workspaceView
	/>

	{#if composer.mode === 'preview' && hasApp}
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
	{:else if workspaceView === 'binding'}
		<BindingPanel
			flows={workspace.flows}
			registry={stackRegistry}
			onselectstack={(flowId, nodeId, stackId) => workspace.setNodeStack(flowId, nodeId, stackId)}
		/>
	{:else}
		<div class="flex min-h-0 flex-1">
			<ComponentPalette
				registry={componentRegistry}
				{insertTarget}
				onadd={(type) => composer.addComponent(type)}
			/>

			{#if composer.view === 'visual'}
				<Canvas
					{definition}
					selectedId={composer.selectedComponentId}
					onselect={(id) => composer.selectComponent(id)}
				/>
			{:else}
				<div class="flex-1 overflow-y-auto">
					<JsonView json={toJson(definition)} error={jsonError} onapply={onapplyjson} />
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
					onpropschange={(patch: JsonObject) => composer.updateProps(selected!.id, patch)}
					onlayoutchange={(layout) => composer.updateLayout(selected!.id, layout)}
					onbindingchange={(binding) => composer.setBinding(selected!.id, binding)}
					suggestBinding={(apiId) => composer.suggestBinding(apiId)}
					onremove={() => composer.removeComponent(selected!.id)}
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

<AppNameDialog
	bind:open={openNew}
	title="New app"
	description="Creates an empty app and switches to it."
	initialValue="Untitled app"
	confirmLabel="Create"
	testid="new-app-dialog"
	onconfirm={(name) => workspace.newApp(name)}
/>

<AppNameDialog
	bind:open={openSaveAs}
	title="Save as"
	description="Saves a copy of this app under a new name."
	initialValue={workspace.app ? `${workspace.app.name} copy` : ''}
	confirmLabel="Save as"
	testid="save-as-dialog"
	onconfirm={(name) => workspace.saveAs(name)}
/>

<OpenAppDialog
	bind:open={openOpen}
	apps={workspace.apps}
	currentId={workspace.currentAppId}
	onopen={(id) => workspace.openApp(id)}
	ondelete={(id) => workspace.deleteAppById(id)}
/>

<SettingsDialog
	bind:open={openSettings}
	appName={workspace.app?.name ?? ''}
	columns={definition.layout.columns}
	context={workspace.context}
	onapply={(settings) => workspace.applySettings(settings)}
/>