import type { ComponentRegistry } from '../../registry/component-registry';
import type { ApiRegistry } from '../../registry/api-registry';
import type { BindingDefinition } from '../../domain/bindings/binding-definition';
import type { JsonObject } from '../../domain/json';
import {
	DEFAULT_LAYOUT_PRESENTATION,
	DEFAULT_STAGE,
	toStageId,
	type LayoutPresentation,
	type StageId
} from '../stages';
import type { ComponentLayout, UIDefinition, UIComponentInstance } from '../../domain/definitions/ui-definition';
import {
	appendComponent,
	createComponentInstance,
	createUIDefinition,
	findComponentById,
	removeComponentById,
	replaceComponentById,
	updateLayout,
	updateProps
} from '../../domain/definitions/ui-definition.factory';

let idCounter = 0;
function nextId(prefix: string): string {
	idCounter += 1;
	return `${prefix}-${idCounter}`;
}

/**
 * Composer state.
 *
 * `definition` is the single source of truth shared with the Runtime
 * Renderer — the Composer never keeps a second copy. Selection, the active
 * stage, the layout presentation and the dirty-flag are Composer UI state and
 * deliberately live here, outside the domain model.
 */
export class ComposerState {
	definition = $state<UIDefinition>(createUIDefinition('Untitled', nextId('def')));
	selectedComponentId = $state<string | null>(null);
	/**
	 * The single stage currently in effect. It determines which workspace is shown
	 * and which stage is marked in the workflow roadmap. Never persisted: this is
	 * editor state, not screen data.
	 */
	activeStage = $state<StageId>(DEFAULT_STAGE);
	/** How the layout stage is presented. Survives stage changes. */
	layoutPresentation = $state<LayoutPresentation>(DEFAULT_LAYOUT_PRESENTATION);
	dirty = $state(false);

	constructor(
		private readonly components: ComponentRegistry,
		private readonly apis: ApiRegistry
	) {}

	/** Moves to a stage. An unknown id is ignored rather than half-applied. */
	selectStage(id: StageId): void {
		const stage = toStageId(id);
		if (stage === undefined) return;
		this.activeStage = stage;
	}

	/** Switches the layout stage's presentation. Never alters the active stage. */
	setLayoutPresentation(value: LayoutPresentation): void {
		this.layoutPresentation = value;
	}

	get selectedComponent(): UIComponentInstance | undefined {
		return findComponentById(this.definition, this.selectedComponentId);
	}

	get selectedComponentDefinition() {
		const instance = this.selectedComponent;
		return instance ? this.components.get(instance.type) : undefined;
	}

	/**
	 * Where a newly added component goes: inside the selected component when
	 * that component accepts children, otherwise at the root.
	 */
	get insertParentId(): string | null {
		const instance = this.selectedComponent;
		if (!instance) return null;
		return this.components.acceptsChildren(instance.type) ? instance.id : null;
	}

	/** Replaces the whole definition (open, reset, JSON editor). */
	setDefinition(definition: UIDefinition): void {
		this.definition = definition;
		if (findComponentById(definition, this.selectedComponentId) === undefined) {
			this.selectedComponentId = null;
		}
		this.dirty = true;
	}

	rename(name: string): void {
		this.definition = { ...this.definition, name };
		this.dirty = true;
	}

	setColumns(columns: number): void {
		const clamped = Math.min(Math.max(1, Math.round(columns)), 24);
		this.definition = { ...this.definition, layout: { type: 'grid', columns: clamped } };
		this.dirty = true;
	}

	addComponent(type: string, parentId: string | null = this.insertParentId): UIComponentInstance | undefined {
		const componentDef = this.components.get(type);
		if (!componentDef) return undefined;

		if (parentId !== null) {
			const parentType = this.findType(parentId);
			if (parentType === undefined || !this.components.acceptsChildren(parentType)) return undefined;
		}

		const instance = createComponentInstance(componentDef, nextId(type), this.definition.layout.columns);
		this.definition = appendComponent(this.definition, instance, parentId);

		// When nesting, stay on the container so that repeated palette clicks add
		// siblings inside it. Moving the selection to the new child would push the
		// next insert back out to the root, which makes deeper nesting unreachable
		// by clicking alone.
		if (parentId === null) this.selectedComponentId = instance.id;

		this.dirty = true;
		return instance;
	}

	removeComponent(id: string): void {
		this.definition = removeComponentById(this.definition, id);
		if (this.selectedComponentId === id) this.selectedComponentId = null;
		this.dirty = true;
	}

	selectComponent(id: string | null): void {
		this.selectedComponentId = id;
	}

	updateProps(id: string, patch: JsonObject): void {
		this.#replace(id, (instance) => updateProps(instance, patch));
	}

	updateLayout(id: string, layout: ComponentLayout): void {
		this.#replace(id, (instance) => updateLayout(instance, layout, this.definition.layout.columns));
	}

	/** Attaches (or replaces) a binding. Passing undefined detaches it. */
	setBinding(id: string, binding: BindingDefinition | undefined): void {
		this.#replace(id, (instance) => {
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

	findType(id: string): string | undefined {
		return findComponentById(this.definition, id)?.type;
	}

	#replace(id: string, transform: (instance: UIComponentInstance) => UIComponentInstance): void {
		const next = replaceComponentById(this.definition, id, transform);
		if (next === this.definition) return;
		this.definition = next;
		this.dirty = true;
	}
}

/** Serialisable JSON view of the definition for the JSON editor tab. */
export function toJson(definition: UIDefinition): string {
	return JSON.stringify(definition, null, 2);
}