import { ComposerState } from '../composer/state/composer-state.svelte';
import type { AppDocument, AppSummary } from '../domain/apps/app-document';
import type { JsonObject } from '../domain/json';
import { err, ok, type Result } from '../domain/result';
import type { ApiRegistry } from '../registry/api-registry';
import type { ComponentRegistry } from '../registry/component-registry';
import {
	validateUIDefinition,
	type RegistryLookup
} from '../domain/definitions/ui-definition.schema';
import type { FlowDefinition } from '../domain/flows/flow-definition';
import { validateFlows } from '../domain/flows/flow-definition.schema';
import type { StackRegistry } from '../registry/stack-registry';
import {
	createApp as persistCreate,
	deleteApp,
	exportAppJson,
	getActiveAppId,
	listApps,
	loadApp,
	saveApp,
	setActiveApp,
	type AppStorage
} from '../persistence/app-library';
import {
	blankAppWithDemo,
	cloneJson,
	copyAsNewApp,
	createBlankApp,
	downloadAppJson
} from '../apps/app-factory';

export type AppCommand =
	| 'new'
	| 'open'
	| 'save'
	| 'saveAs'
	| 'export'
	| 'settings';

const NAME_REQUIRED = 'An app needs a name.';

/**
 * Owns the app lifecycle behind the File menu: which app is open, what the
 * Composer is editing, and the messages shown to the user. All of it routes
 * through the app library, so there is exactly one source of truth on disk.
 */
export class Workspace {
	readonly composer: ComposerState;
	apps = $state<AppSummary[]>([]);
	app = $state<AppDocument | null>(null);
	message = $state<string | null>(null);

	constructor(
		private readonly storage: AppStorage,
		private readonly components: ComponentRegistry,
		private readonly apis: ApiRegistry,
		private readonly registryLookup: RegistryLookup,
		private readonly stacks: StackRegistry,
		private readonly demoDefinition: AppDocument['definition'],
		private readonly demoFlows: FlowDefinition[]
	) {
		this.composer = new ComposerState(components, apis);
	}

	/** The `$context` values the Preview feeds to bindings. */
	get context(): JsonObject {
		return this.app?.context ?? {};
	}

	get currentAppId(): string | null {
		return this.app?.id ?? null;
	}

	/** Loads the library and reopens the last app, seeding the demo if empty. */
	start(): void {
		this.refreshApps();

		const activeId = getActiveAppId(this.storage);
		if (activeId.ok && activeId.value !== null) {
			const loaded = loadApp(this.storage, activeId.value, this.registryLookup);
			if (loaded.ok) {
				this.#adopt(loaded.value);
				this.message = `Reopened "${loaded.value.name}".`;
				return;
			}
			// The saved app no longer validates; do not silently discard it.
			this.message = loaded.error;
		}

		const seeded = persistCreate(
			this.storage,
			blankAppWithDemo('Customer Risk Dashboard', this.demoDefinition, this.demoFlows)
		);
		if (seeded.ok) {
			this.#adopt({ ...seeded.value, context: { customerId: 'CUST-1001' } });
			this.refreshApps();
		} else {
			this.message = seeded.error;
		}
	}

	refreshApps(): void {
		const result = listApps(this.storage);
		if (result.ok) this.apps = result.value;
		else this.message = result.error;
	}

	newApp(name: string): void {
		const trimmed = this.#requireName(name);
		if (trimmed === null) {
			this.message = NAME_REQUIRED;
			return;
		}
		const created = persistCreate(
			this.storage,
			createBlankApp(trimmed, this.context, this.app?.flows ?? [])
		);
		if (!created.ok) {
			this.message = created.error;
			return;
		}
		this.#adopt(created.value);
		this.refreshApps();
		this.message = `Created "${created.value.name}".`;
	}

	openApp(id: string): void {
		const loaded = loadApp(this.storage, id, this.registryLookup);
		if (!loaded.ok) {
			this.message = loaded.error;
			return;
		}
		this.#adopt(loaded.value);
		setActiveApp(this.storage, loaded.value.id);
		this.message = `Opened "${loaded.value.name}".`;
	}

	save(): void {
		if (!this.app) return;
		const current = this.#currentDocument();
		if (!current.ok) {
			this.message = current.error;
			return;
		}

		const saved = saveApp(this.storage, current.value);
		if (!saved.ok) {
			this.message = saved.error;
			return;
		}
		this.app = saved.value;
		this.composer.markSaved();
		this.refreshApps();
		this.message = `Saved "${saved.value.name}".`;
	}

	saveAs(name: string): void {
		if (!this.app) return;
		const trimmed = this.#requireName(name);
		if (trimmed === null) {
			this.message = NAME_REQUIRED;
			return;
		}
		const current = this.#currentDocument();
		if (!current.ok) {
			this.message = current.error;
			return;
		}

		const copy = copyAsNewApp(current.value, trimmed);
		// Keep the copy's definition name in step with its app name.
		copy.definition = { ...copy.definition, name: trimmed };

		const created = persistCreate(this.storage, copy);
		if (!created.ok) {
			this.message = created.error;
			return;
		}
		this.#adopt(created.value);
		this.refreshApps();
		this.message = `Saved as "${created.value.name}".`;
	}

	deleteAppById(id: string): void {
		const removed = deleteApp(this.storage, id);
		if (!removed.ok) {
			this.message = removed.error;
			return;
		}
		if (this.app?.id === id) this.app = null;
		this.refreshApps();
		this.message = 'App deleted.';
	}

	/** Downloads the open app as JSON. No storage side effect. */
	exportApp(): void {
		if (!this.app) return;
		const current = this.#currentDocument();
		if (!current.ok) {
			this.message = current.error;
			return;
		}
		downloadAppJson(current.value, exportAppJson(current.value));
		this.message = `Exported "${current.value.name}".`;
	}

	/** Renames the app, which is the same thing as renaming its definition. */
	renameApp(name: string): void {
		if (!this.app) return;
		const trimmed = this.#requireName(name);
		if (trimmed === null) {
			this.message = NAME_REQUIRED;
			return;
		}
		this.composer.rename(trimmed);
		this.app = { ...this.app, name: trimmed };
	}

	/**
	 * Applies settings: app name, grid columns and the runtime `$context`
	 * values. Rows with a blank key are dropped here rather than in the dialog,
	 * so the rule holds for every caller.
	 */
	applySettings(settings: { name: string; columns: number; context: JsonObject }): void {
		if (!this.app) return;
		const trimmed = this.#requireName(settings.name);
		if (trimmed === null) {
			this.message = NAME_REQUIRED;
			return;
		}

		this.composer.setColumns(settings.columns);
		this.composer.rename(trimmed);

		const context: JsonObject = {};
		for (const [key, value] of Object.entries(settings.context)) {
			if (key.trim().length > 0) context[key] = value;
		}
		this.app = { ...this.app, name: trimmed, context };
		this.composer.dirty = true;
		this.message = 'Settings applied.';
	}

	/** Flows of the open app. */
	get flows(): FlowDefinition[] {
		return this.app?.flows ?? [];
	}

	/**
	 * Chooses the technology stack for one flow node. The pairing is validated
	 * against the Stack Registry so a node can never hold a stack that cannot
	 * serve its role.
	 */
	setNodeStack(flowId: string, nodeId: string, stackId: string): void {
		if (!this.app) return;
		if (!this.stacks.has(stackId)) {
			this.message = `Unknown technology stack: ${stackId}`;
			return;
		}

		const flows = cloneJson(this.app.flows);
		const flow = flows.find((candidate) => candidate.id === flowId);
		const node = flow?.nodes.find((candidate) => candidate.id === nodeId);
		if (!flow || !node) {
			this.message = `Unknown node: ${nodeId}`;
			return;
		}

		const previous = node.stack;
		node.stack = stackId;

		const validated = validateFlows(flows, this.stacks);
		if (!validated.ok) {
			node.stack = previous;
			this.message = validated.error;
			return;
		}

		this.app = { ...this.app, flows: validated.value };
		this.composer.dirty = true;
		this.message = `${node.label} now uses ${this.stacks.get(stackId)?.label ?? stackId}.`;
	}

	resetToDemo(): void {
		if (this.app) this.app = { ...this.app, flows: cloneJson(this.demoFlows) };
		if (!this.app) return;
		this.composer.setDefinition(cloneJson(this.demoDefinition));
		this.message = 'Reset to the Customer Risk Dashboard demo.';
	}

	/** Returns the trimmed name, or null when it is blank. */
	#requireName(name: string): string | null {
		const trimmed = name.trim();
		return trimmed.length > 0 ? trimmed : null;
	}

	/**
	 * The app name and the definition name are the same thing, so the document
	 * always takes its name from the composer. They cannot drift apart.
	 *
	 * The definition is deep-copied through JSON so that the reactive proxy in
	 * ComposerState is never persisted, and the copy is validated on the way
	 * out — nothing reaches storage that could not be loaded back.
	 */
	#currentDocument(): Result<AppDocument> {
		const app = this.app;
		if (!app) return err('No app is open');

		const plain = JSON.stringify(this.composer.definition);
		const validated = validateUIDefinition(JSON.parse(plain), this.registryLookup);
		if (!validated.ok) return err(validated.error);

		return ok({ ...app, name: validated.value.name, definition: validated.value });
	}

	#adopt(document: AppDocument): void {
		this.app = document;
		this.composer.setDefinition(document.definition);
		this.composer.markSaved();
		setActiveApp(this.storage, document.id);
	}
}