<script lang="ts">
	import type { JsonObject } from '$lib/domain/json';
	import type { UIDefinition } from '$lib/domain/definitions/ui-definition';
	import { svelteComponentRegistry } from './renderer-registry.svelte';
	import type { RendererProps } from './renderer-registry.svelte';

	/**
	 * Runtime renderer: UIDefinition -> registry lookup -> component.
	 * Knows nothing about the Composer. It receives resolved binding data that
	 * was fetched elsewhere, so rendering stays a pure function of its inputs.
	 */
	let {
		definition,
		data = {},
		errors = {},
		loading = {}
	}: {
		definition: UIDefinition;
		data?: Record<string, JsonObject>;
		errors?: Record<string, string>;
		loading?: Record<string, boolean>;
	} = $props();

	const columnTemplate = $derived(`repeat(${definition.layout.columns}, minmax(0, 1fr))`);

	function rendererProps(componentId: string, instanceProps: JsonObject): RendererProps {
		return { props: instanceProps, data: data[componentId] ?? {} };
	}
</script>

<div
	class="grid w-full gap-4"
	style:grid-template-columns={columnTemplate}
	data-testid="runtime-root"
	data-definition-name={definition.name}
>
	{#each definition.components as instance (instance.id)}
		{@const resolved = svelteComponentRegistry.get(instance.type)}
		<div
			class="min-w-0"
			style:grid-column="{instance.layout.column} / span {instance.layout.span}"
			style:grid-row={instance.layout.row ?? 'auto'}
			data-testid="runtime-item"
			data-component-id={instance.id}
			data-component-type={instance.type}
		>
			{#if resolved}
				{@const runtimeProps = rendererProps(instance.id, instance.props)}
				<resolved.renderer {...runtimeProps} />
			{:else}
				<p class="text-sm text-destructive" data-testid="unknown-component">
					Unknown component: {instance.type}
				</p>
			{/if}

			{#if loading[instance.id]}
				<p class="mt-1 text-xs text-muted-foreground">Loading…</p>
			{/if}
			{#if errors[instance.id]}
				<p class="mt-1 text-xs text-destructive" data-testid="binding-error">
					{errors[instance.id]}
				</p>
			{/if}
		</div>
	{/each}
</div>