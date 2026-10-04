<script lang="ts">
	import { onMount } from 'svelte';
	import { Workspace } from '$lib/apps/workspace.svelte';
	import Composer from '$lib/composer/Composer.svelte';
	import { validateUIDefinition } from '$lib/domain/definitions/ui-definition.schema';
	import { createDemoDefinition } from '$lib/demo/customer-risk-dashboard';
	import { apiRegistry, componentRegistry, registryLookup } from '$lib/registry';
	import { createApiClient } from '$lib/runtime/api-client';
	import { PreviewRuntime } from '$lib/runtime/preview-runtime.svelte';

	const workspace = new Workspace(
		localStorage,
		componentRegistry,
		apiRegistry,
		registryLookup,
		createDemoDefinition()
	);

	const previewRuntime = new PreviewRuntime(apiRegistry, createApiClient());
	let jsonError = $state<string | null>(null);

	const preview = $derived({
		data: previewRuntime.data,
		errors: previewRuntime.errors,
		loading: previewRuntime.loading
	});

	// The Preview reads the same definition the Composer edits, so an edit is
	// visible in the Preview without a second copy of the state.
	$effect(() => {
		const definition = workspace.composer.definition;
		const context = workspace.context;
		if (workspace.composer.mode !== 'preview') return;
		void previewRuntime.load(definition, context);
	});

	onMount(() => workspace.start());

	function applyJson(raw: string): void {
		let parsed: unknown;
		try {
			parsed = JSON.parse(raw);
		} catch (cause) {
			jsonError = `Invalid JSON: ${cause instanceof Error ? cause.message : String(cause)}`;
			return;
		}

		const validated = validateUIDefinition(parsed, registryLookup);
		if (!validated.ok) {
			jsonError = validated.error;
			return;
		}

		jsonError = null;
		workspace.composer.setDefinition(validated.value);
		workspace.message = 'Applied JSON to the definition.';
	}
</script>

<svelte:head>
	<title>UI Definition Composer</title>
</svelte:head>

<Composer
	{workspace}
	{componentRegistry}
	{apiRegistry}
	{preview}
	{jsonError}
	onapplyjson={applyJson}
/>