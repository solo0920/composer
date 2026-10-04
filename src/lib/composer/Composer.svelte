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
	import { STAGES, type LayoutPresentation } from './stages';
	import { Tabs, TabsList, TabsTrigger } from '$lib/components/ui/tabs/index.js';

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

	/**
	 * Whether any component points at an API function. A definition with no bindings
	 * still renders, so this drives an explanation (FR-014) rather than replacing the
	 * rendered view.
	 */
	const hasBindings = $derived(
		definition.components.some((component) => (component.binding?.api ?? '').trim() !== '')
	);

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
	<!-- One top-level bar. The workflow stages render inline inside it, and all
	     stage-to-content mapping stays in the branch below, so the highlighted stage
	     cannot drift away from what is shown. -->
	<Toolbar
		stages={STAGES}
		appName={definition.name}
		activeStage={composer.activeStage}
		dirty={composer.dirty}
		{hasApp}
		message={workspace.message}
		onstagechange={(stage) => composer.selectStage(stage)}
		onreset={() => workspace.resetToDemo()}
		onfilecommand={run}
	/>

	<!-- The single stage-to-content mapping. Nothing else in the app decides what the
	     workspace shows, so the active stage can never disagree with the content. -->
	{#if composer.activeStage === 'preview'}
		{#if !hasApp}
			<!-- FR-015: with no app open there is nothing to render, so the preview stage
			     says so rather than falling through to another stage's content. The
			     indicator keeps marking `preview`, which is the stage that was asked for. -->
			<main
				class="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center"
				data-testid="no-app-state"
			>
				<p class="text-sm font-medium">No app is open</p>
				<p class="max-w-md text-xs text-muted-foreground">
					Open or create an app from the File menu to compose and preview it.
				</p>
			</main>
		{:else}
			<main class="flex-1 overflow-y-auto p-6">
				<div class="mx-auto max-w-5xl">
					<h1 class="mb-4 text-xl font-bold" data-testid="preview-title">{definition.name}</h1>

					<!-- FR-014: the rendered view is still shown, but an app with nothing
					     bound explains that instead of appearing broken. -->
					{#if !hasBindings}
						<div
							class="mb-4 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground"
							data-testid="no-bindings-state"
						>
							Nothing is bound in this app yet, so the preview shows the layout without
							live data. Add a binding on the Binding stage to fill it in.
						</div>
					{/if}

					<RuntimeRenderer
						{definition}
						data={preview.data}
						errors={preview.errors}
						loading={preview.loading}
					/>
				</div>
			</main>
		{/if}
	{:else if composer.activeStage === 'binding'}
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

			<!-- The layout stage owns its own presentation control (FR-010). It lives
			     here rather than in the header because it means nothing on the other two
			     stages, and the choice is part of how this stage is worked on. -->
			<div class="flex min-w-0 flex-1 flex-col">
				<div
					class="flex items-center gap-2 border-b border-border px-4 py-1.5"
					data-testid="layout-presentation-bar"
				>
					<span class="text-xs font-medium text-muted-foreground">Presentation</span>
					<Tabs
						value={composer.layoutPresentation}
						onValueChange={(next) => composer.setLayoutPresentation(next as LayoutPresentation)}
					>
						<TabsList>
							<TabsTrigger value="visual">Visual</TabsTrigger>
							<TabsTrigger value="json">JSON</TabsTrigger>
						</TabsList>
					</Tabs>
				</div>

				{#if composer.layoutPresentation === 'visual'}
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
			</div>

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