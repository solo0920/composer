<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import type { JsonObject, JsonValue } from '$lib/domain/json';
	import type { ApiRegistry } from '$lib/registry/api-registry';
	import type { ComponentDefinition } from '$lib/domain/components/component-definition';
	import type { BindingDefinition } from '$lib/domain/bindings/binding-definition';
	import BindingEditor from '../binding-editor/BindingEditor.svelte';

	/**
	 * Inspector for the selected component. The Properties form is generated from
	 * the component's registry `propsSchema`; no component type is named here.
	 */
	let {
		componentDef,
		instanceId,
		props,
		layout,
		binding,
		apiRegistry,
		onpropschange,
		onlayoutchange,
		onbindingchange,
		suggestBinding,
		onremove
	}: {
		componentDef: ComponentDefinition;
		instanceId: string;
		props: JsonObject;
		layout: { column: number; span: number };
		binding?: BindingDefinition;
		apiRegistry: ApiRegistry;
		onpropschange: (patch: JsonObject) => void;
		onlayoutchange: (layout: { column: number; span: number }) => void;
		onbindingchange: (binding: BindingDefinition | undefined) => void;
		suggestBinding: (apiId: string) => BindingDefinition | undefined;
		onremove: () => void;
	} = $props();

	const columns = 12;

	function setProp(key: string, raw: string, type: string): void {
		onpropschange({ [key]: coerce(raw, type) });
	}

	function coerce(raw: string, type: string): JsonValue {
		if (type === 'number') {
			const parsed = Number(raw);
			return Number.isFinite(parsed) ? parsed : 0;
		}
		if (type === 'boolean') return raw === 'true';
		return raw;
	}
</script>

<aside class="flex w-80 shrink-0 flex-col gap-4 overflow-y-auto border-l border-border p-4">
	<header class="flex items-start justify-between gap-2">
		<div>
			<h2 class="text-sm font-semibold" data-testid="inspector-title">{componentDef.label}</h2>
			<p class="font-mono text-xs text-muted-foreground">{instanceId}</p>
		</div>
		<Button variant="ghost" size="sm" class="text-destructive" onclick={onremove} data-testid="delete-component">
			Delete
		</Button>
	</header>

	<section class="flex flex-col gap-2">
		<h3 class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Properties</h3>
		{#each componentDef.propsSchema as field (field.key)}
			<div class="flex flex-col gap-1">
				<Label for={`prop-${field.key}`} class="text-xs">{field.label}</Label>
				<Input
					id={`prop-${field.key}`}
					data-testid="prop-input"
					value={String(props[field.key] ?? '')}
					placeholder={field.placeholder}
					oninput={(event) => setProp(field.key, event.currentTarget.value, field.type)}
				/>
			</div>
		{/each}
	</section>

	<Separator />

	<section class="flex flex-col gap-2">
		<h3 class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Layout</h3>
		<div class="grid grid-cols-2 gap-2">
			<div class="flex flex-col gap-1">
				<Label for="layout-column" class="text-xs">Column</Label>
				<Input
					id="layout-column"
					type="number"
					min="1"
					max={columns}
					value={String(layout.column)}
					oninput={(event) => onlayoutchange({ ...layout, column: Number(event.currentTarget.value) })}
				/>
			</div>
			<div class="flex flex-col gap-1">
				<Label for="layout-span" class="text-xs">Span</Label>
				<Input
					id="layout-span"
					type="number"
					min="1"
					max={columns}
					value={String(layout.span)}
					oninput={(event) => onlayoutchange({ ...layout, span: Number(event.currentTarget.value) })}
				/>
			</div>
		</div>
	</section>

	<Separator />

	<section class="flex flex-col gap-2">
		<h3 class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Binding</h3>
		<BindingEditor
			registry={apiRegistry}
			bind:binding
			suggest={suggestBinding}
			onChange={onbindingchange}
		/>
	</section>
</aside>