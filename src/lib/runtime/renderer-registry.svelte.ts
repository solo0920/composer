import type { Component } from 'svelte';
import type { ComponentDefinition } from '../domain/components/component-definition';
import type { JsonObject } from '../domain/json';
import { createComponentRegistry, type ComponentRegistry } from '../registry/component-registry';
import { componentDefinitions } from '../registry/component-definitions';
import Button from './renderers/Button.svelte';
import Container from './renderers/Container.svelte';
import DataCard from './renderers/DataCard.svelte';
import Text from './renderers/Text.svelte';

/**
 * Props every runtime component receives. `props` comes from the definition,
 * `data` is the result of executing the component's binding. A component
 * receives neither the registry nor the API client — it only renders.
 */
export type RendererProps = {
	props: JsonObject;
	data: JsonObject;
};

/** A domain ComponentDefinition plus the Svelte component that renders it. */
export type SvelteComponentDefinition = ComponentDefinition & {
	renderer: Component<RendererProps>;
};

/**
 * Type -> implementation. Component *metadata* lives in
 * `registry/component-definitions` and is what the Composer reads; only the
 * renderer binding is added here. Adding a component therefore means one
 * metadata entry plus one renderer, with no Composer change.
 */
const RENDERERS: Record<string, Component<RendererProps>> = {
	container: Container,
	text: Text,
	button: Button,
	'data-card': DataCard
};

export const svelteComponentDefinitions: SvelteComponentDefinition[] = componentDefinitions.map(
	(definition) => {
		const renderer = RENDERERS[definition.type];
		if (!renderer) {
			throw new Error(`No renderer registered for component "${definition.type}"`);
		}
		return { ...definition, renderer };
	}
);

export const svelteComponentRegistry: ComponentRegistry<SvelteComponentDefinition> =
	createComponentRegistry(svelteComponentDefinitions);