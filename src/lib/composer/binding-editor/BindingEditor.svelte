<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import type { BindingDefinition } from '$lib/domain/bindings/binding-definition';
	import { describeExpression } from '$lib/domain/bindings/binding-definition';
	import type { FieldDescriptor } from '$lib/domain/fields';
	import type { ApiRegistry } from '$lib/registry/api-registry';
	import ApiCombobox from './ApiCombobox.svelte';

	/**
	 * Declarative Component -> API Function editor. Every row it renders comes
	 * from the selected API's registry metadata, so it never hard-codes API
	 * ids or field names.
	 */
	let {
		registry,
		binding = $bindable<BindingDefinition | undefined>(undefined),
		suggest,
		onChange
	}: {
		registry: ApiRegistry;
		binding?: BindingDefinition;
		/** Registry-derived default mapping, applied when an API is chosen. */
		suggest: (apiId: string) => BindingDefinition | undefined;
		onChange: (binding: BindingDefinition | undefined) => void;
	} = $props();

	const selectedApi = $derived(binding?.api === undefined ? undefined : registry.get(binding.api));
	const inputFields = $derived<FieldDescriptor[]>(selectedApi?.inputSchema ?? []);
	const outputFields = $derived<FieldDescriptor[]>(selectedApi?.outputSchema ?? []);

	function chooseApi(apiId: string | undefined): void {
		if (apiId === undefined) {
			onChange(undefined);
			return;
		}
		const suggested = suggest(apiId);
		const input = binding?.api === apiId ? binding.input : suggested?.input;
		const output = binding?.api === apiId ? binding.output : suggested?.output;
		onChange({ api: apiId, ...(input ? { input } : {}), ...(output ? { output } : {}) });
	}

	function setInput(key: string, expression: string): void {
		if (!binding) return;
		onChange({ ...binding, input: { ...binding.input, [key]: expression } });
	}

	function setOutput(key: string, expression: string): void {
		if (!binding) return;
		onChange({ ...binding, output: { ...binding.output, [key]: expression } });
	}

	function problem(expression: string | undefined, kind: 'input' | 'output'): string | undefined {
		if (expression === undefined) return undefined;
		if (expression.trim().length === 0) return undefined;
		const trimmed = expression.trim();
		const valid = kind === 'input' ? trimmed.startsWith('$context.') : trimmed.startsWith('$.');
		if (valid && describeExpression(trimmed) === trimmed) return undefined;
		return `Not a valid ${kind} expression`;
	}
</script>

<div class="flex flex-col gap-3" data-testid="binding-editor">
	<div class="flex flex-col gap-1.5">
		<Label for="binding-api">API Function</Label>
		<ApiCombobox
			id="binding-api"
			{registry}
			selected={binding?.api}
			invalid={binding !== undefined && selectedApi === undefined}
			onselect={chooseApi}
		/>
		{#if binding !== undefined && selectedApi === undefined}
			<p class="text-xs text-destructive">Unknown API: {binding.api}</p>
		{:else if selectedApi}
			<p class="text-xs text-muted-foreground">
				{selectedApi.method} {selectedApi.path}
			</p>
		{/if}
	</div>

	{#if binding && selectedApi}
		{#if inputFields.length > 0}
			<div class="flex flex-col gap-2">
				<span class="text-xs font-medium text-muted-foreground">Input Mapping</span>
				{#each inputFields as field (field.key)}
					{@const expression = binding.input?.[field.key] ?? ''}
					{@const error = problem(expression, 'input')}
					<div class="flex flex-col gap-1">
						<Label for={`binding-input-${field.key}`} class="text-xs">{field.key}</Label>
						<Input
							id={`binding-input-${field.key}`}
							value={expression}
							placeholder={field.placeholder ?? '$context.key'}
							aria-invalid={error !== undefined}
							class="h-8 font-mono text-xs"
							oninput={(event) => setInput(field.key, event.currentTarget.value)}
						/>
						{#if error}
							<span class="text-xs text-destructive">{error}</span>
						{/if}
					</div>
				{/each}
			</div>
		{/if}

		{#if outputFields.length > 0}
			<div class="flex flex-col gap-2">
				<span class="text-xs font-medium text-muted-foreground">Output Mapping</span>
				{#each outputFields as field (field.key)}
					{@const expression = binding.output?.[field.key] ?? ''}
					{@const error = problem(expression, 'output')}
					<div class="flex flex-col gap-1">
						<Label for={`binding-output-${field.key}`} class="text-xs">{field.key}</Label>
						<Input
							id={`binding-output-${field.key}`}
							value={expression}
							placeholder={field.bindingHint ?? '$.field'}
							aria-invalid={error !== undefined}
							class="h-8 font-mono text-xs"
							oninput={(event) => setOutput(field.key, event.currentTarget.value)}
						/>
						{#if error}
							<span class="text-xs text-destructive">{error}</span>
						{/if}
					</div>
				{/each}
			</div>
		{/if}

		{#if inputFields.length === 0 && outputFields.length === 0}
			<p class="text-xs text-muted-foreground">This API declares no input or output fields.</p>
		{/if}

		<Button variant="ghost" size="sm" class="self-start" onclick={() => onChange(undefined)}>
			Remove binding
		</Button>
	{/if}
</div>