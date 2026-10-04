<script lang="ts">
	import type { UIDefinition } from '$lib/domain/definitions/ui-definition';
	import type { JsonObject } from '$lib/domain/json';
	import RenderNode from './RenderNode.svelte';

	/**
	 * Runtime renderer: UIDefinition -> registry lookup -> component tree.
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
</script>

<div
	class="grid w-full gap-4"
	style:grid-template-columns={columnTemplate}
	data-testid="runtime-root"
	data-definition-name={definition.name}
>
	{#each definition.components as instance (instance.id)}
		<RenderNode {instance} columns={definition.layout.columns} {data} {errors} {loading} depth={0} />
	{/each}
</div>