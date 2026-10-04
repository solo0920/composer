import type { ComponentRegistry } from '../../registry/component-registry';
import type { ApiRegistry } from '../../registry/api-registry';
import type { BindingDefinition } from '../../domain/bindings/binding-definition';
import type { JsonObject, JsonValue } from '../../domain/json';
import type { ComponentLayout, UIDefinition, UIComponentInstance } from '../../domain/definitions/ui-definition';
import {
	createComponentInstance,
	createUIDefinition,
	findComponent,
	updateLayout,
	updateProps
} from '../../domain/definitions/ui-definition.factory';

export type ComposerMode = 'edit' | 'preview';
export type ComposerView = 'visual' | 'json';

let idCounter = 0;
function nextId(prefix: string): string {
	idCounter += 1;
	return `${prefix}-${idCounter}`;
}

/**
 * Composer state.
 *
 * `definition` is the single source of truth shared with the Runtime
 * Renderer — the Composer never keeps a second copy. Selection, mode, view and
 * dirty-flag are Composer UI state and deliberately live here, outside the
 * domain model.
 */
export class ComposerState {
	definition = $state<UIDefinition>(createUIDefinition('Untitled', nextId('def')));
	selectedComponentId = $state<string | null>(null);
	mode = $state<ComposerMode>('edit');
	view = $state<ComposerView>('visual');
	dirty = $state(false);

	constructor(
		private readonly components: ComponentRegistry,
		private readonly apis: ApiRegistry
	) {}

	get selectedComponent(): UIComponentInstance | undefined {
		return findComponent(this.definition, this.selectedComponentId);
	}

	get selectedComponentDefinition() {
		const instance = this.selectedComponent;
		return instance ? this.components.get(instance.type) : undefined;
	}

	/** Replaces the whole definition (load, reset, JSON editor). */
	setDefinition(definition: UIDefinition): void {
		this.definition = definition;
		if (!findComponent(definition, this.selectedComponentId)) {
			this.selectedComponentId = null;
		}
		this.dirty = true;
	}

	rename(name: string): void {
		this.definition = { ...this.definition, name };
		this.dirty = true;
	}

	addComponent(type: string): UIComponentInstance | undefined {
		const componentDef = this.components.get(type);
		if (!componentDef) return undefined;

		const instance = createComponentInstance(componentDef, nextId(type), this.definition.layout.columns);
		this.definition = { ...this.definition, components: [...this.definition.components, instance] };
		this.selectedComponentId = instance.id;
		this.dirty = true;
		return instance;
	}

	removeComponent(id: string): void {
		this.definition = {
			...this.definition,
			components: this.definition.components.filter((component) => component.id !== id)
		};
		if (this.selectedComponentId === id) this.selectedComponentId = null;
		this.dirty = true;
	}

	selectComponent(id: string | null): void {
		this.selectedComponentId = id;
	}

	updateProps(id: string, patch: JsonObject): void {
		this.#mutate(id, (instance) => updateProps(instance, patch));
	}

	updateLayout(id: string, layout: ComponentLayout): void {
		this.#mutate(id, (instance) => updateLayout(instance, layout, this.definition.layout.columns));
	}

	/** Attaches (or replaces) a binding. Passing undefined detaches it. */
	setBinding(id: string, binding: BindingDefinition | undefined): void {
		this.#mutate(id, (instance) => {
			if (binding === undefined) {
				const { binding: _removed, ...rest } = instance;
				return rest as UIComponentInstance;
			}
			return { ...instance, binding };
		});
	}

	/**
	 * Default mapping suggestions derived from API registry metadata, so the
	 * Binding Editor never hard-codes API field names.
	 */
	suggestBinding(apiId: string): BindingDefinition | undefined {
		const api = this.apis.get(apiId);
		if (!api) return undefined;

		const input = Object.fromEntries(
			(api.inputSchema ?? []).map((field) => [field.key, `$context.${field.key}`])
		);
		const output = Object.fromEntries(
			(api.outputSchema ?? [])
				.map((field) => [field.key, field.bindingHint ?? `$.${field.key}`])
				.filter(([, expression]) => typeof expression === 'string')
		);

		return { api: apiId, input, output };
	}

	markSaved(): void {
		this.dirty = false;
	}

	#mutate(id: string, transform: (instance: UIComponentInstance) => UIComponentInstance): void {
		const index = this.definition.components.findIndex((component) => component.id === id);
		if (index === -1) return;

		const components = this.definition.components.slice();
		components[index] = transform(components[index]);
		this.definition = { ...this.definition, components };
		this.dirty = true;
	}
}

/** Serialisable JSON view of the definition for the JSON editor tab. */
export function toJson(definition: UIDefinition): string {
	return JSON.stringify(definition, null, 2);
}

export function propsJsonValue(value: JsonValue): string {
	return typeof value === 'string' ? value : JSON.stringify(value);
}