import type { ApiRegistry } from '../registry/api-registry';
import type { UIDefinition } from '../domain/definitions/ui-definition';
import type { JsonObject } from '../domain/json';
import type { ApiClient } from './api-client';
import { executeBinding, type BindingContext } from './binding-runtime';

export type PreviewData = {
	data: Record<string, JsonObject>;
	errors: Record<string, string>;
	loading: Record<string, boolean>;
};

/**
 * Executes every binding in a definition and holds the resolved data for the
 * RuntimeRenderer. This is the only place in the app that calls the API client,
 * which is what keeps components free of any knowledge of backend URLs.
 */
export class PreviewRuntime {
	#data = $state<Record<string, JsonObject>>({});
	#errors = $state<Record<string, string>>({});
	#loading = $state<Record<string, boolean>>({});
	#token = 0;

	constructor(
		private readonly apiRegistry: ApiRegistry,
		private readonly client: ApiClient
	) {}

	get data(): Record<string, JsonObject> {
		return this.#data;
	}

	get errors(): Record<string, string> {
		return this.#errors;
	}

	get loading(): Record<string, boolean> {
		return this.#loading;
	}

	/**
	 * Reloads all bound components. Results from a superseded run are discarded
	 * so that rapid edits cannot leave stale data on screen.
	 */
	async load(definition: UIDefinition, context: BindingContext): Promise<void> {
		const run = ++this.#token;
		const bound = definition.components.flatMap((instance) =>
			instance.binding ? [{ id: instance.id, binding: instance.binding }] : []
		);

		if (bound.length === 0) {
			this.#data = {};
			this.#errors = {};
			this.#loading = {};
			return;
		}

		this.#loading = Object.fromEntries(bound.map(({ id }) => [id, true]));
		this.#errors = Object.fromEntries(bound.map(({ id }) => [id, '']));

		const results = await Promise.all(
			bound.map(async ({ id, binding }) => ({
				id,
				result: await executeBinding(binding, this.apiRegistry.get(binding.api), context, this.client)
			}))
		);

		if (run !== this.#token) return;

		const data: Record<string, JsonObject> = {};
		const errors: Record<string, string> = {};
		for (const { id, result } of results) {
			if (result.status === 'ok') data[id] = result.data;
			else errors[id] = result.message;
		}
		this.#data = data;
		this.#errors = errors;
		this.#loading = {};
	}
}