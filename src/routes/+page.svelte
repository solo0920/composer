<script lang="ts">
	import { onMount } from 'svelte';
	import Composer from '$lib/composer/Composer.svelte';
	import { ComposerState } from '$lib/composer/state/composer-state.svelte';
	import { validateUIDefinition } from '$lib/domain/definitions/ui-definition.schema';
	import { createDemoDefinition, PREVIEW_CONTEXT } from '$lib/demo/customer-risk-dashboard';
	import {
		clearDefinition,
		loadDefinition,
		saveDefinition
	} from '$lib/persistence/definition-store';
	import { apiRegistry, componentRegistry } from '$lib/registry';
	import { createApiClient } from '$lib/runtime/api-client';
	import { PreviewRuntime } from '$lib/runtime/preview-runtime.svelte';

	const registries = { hasComponent: componentRegistry.has, hasApi: apiRegistry.has };

	const composer = new ComposerState(componentRegistry, apiRegistry);
	const previewRuntime = new PreviewRuntime(apiRegistry, createApiClient());

	let message = $state<string | null>(null);
	let jsonError = $state<string | null>(null);

	const preview = $derived({
		data: previewRuntime.data,
		errors: previewRuntime.errors,
		loading: previewRuntime.loading
	});

	// The Preview reads the same definition the Composer edits, so an edit is
	// visible in the Preview without a second copy of the state.
	$effect(() => {
		const definition = composer.definition;
		if (composer.mode !== 'preview') return;
		void previewRuntime.load(definition, PREVIEW_CONTEXT);
	});

	onMount(() => {
		const loaded = loadDefinition(localStorage, registries);
		if (loaded.ok) {
			composer.setDefinition(loaded.value);
			composer.markSaved();
			message = 'Loaded saved definition.';
		} else {
			composer.setDefinition(createDemoDefinition());
			composer.markSaved();
		}
	});

	function save(): void {
		const result = saveDefinition(localStorage, composer.definition);
		if (result.ok) {
			composer.markSaved();
			message = `Saved at ${new Date().toLocaleTimeString()}.`;
		} else {
			message = result.error;
		}
	}

	function load(): void {
		const result = loadDefinition(localStorage, registries);
		if (result.ok) {
			composer.setDefinition(result.value);
			composer.markSaved();
			message = 'Loaded saved definition.';
		} else {
			message = result.error;
		}
	}

	function reset(): void {
		clearDefinition(localStorage);
		composer.setDefinition(createDemoDefinition());
		composer.markSaved();
		message = 'Reset to the Customer Risk Dashboard demo.';
	}

	function applyJson(raw: string): void {
		let parsed: unknown;
		try {
			parsed = JSON.parse(raw);
		} catch (cause) {
			jsonError = `Invalid JSON: ${cause instanceof Error ? cause.message : String(cause)}`;
			return;
		}

		const validated = validateUIDefinition(parsed, registries);
		if (!validated.ok) {
			jsonError = validated.error;
			return;
		}

		jsonError = null;
		composer.setDefinition(validated.value);
		message = 'Applied JSON to the definition.';
	}
</script>

<svelte:head>
	<title>UI Definition Composer</title>
</svelte:head>

<Composer
	state={composer}
	{componentRegistry}
	{apiRegistry}
	{preview}
	{message}
	{jsonError}
	onmodechange={(mode) => (composer.mode = mode)}
	onsave={save}
	onload={load}
	onreset={reset}
	onapplyjson={applyJson}
/>