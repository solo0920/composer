<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog/index.js';
	import type { JsonObject } from '$lib/domain/json';
	import { DEFAULT_GRID_COLUMNS } from '$lib/domain/definitions/ui-definition';

	let {
		open = $bindable(false),
		appName,
		columns,
		context,
		onapply
	}: {
		open?: boolean;
		appName: string;
		columns: number;
		context: JsonObject;
		onapply: (settings: { name: string; columns: number; context: JsonObject }) => void;
	} = $props();

	/** Editing rows are string-keyed while the user types; parsed on apply. */
	let nameInput = $state('');
	let rows = $state<{ key: string; value: string }[]>([]);
	let columnInput = $state('');

	$effect(() => {
		if (open) {
			nameInput = appName;
			columnInput = String(columns);
			rows = Object.entries(context).map(([key, value]) => ({
				key,
				value: typeof value === 'string' ? value : JSON.stringify(value)
			}));
		}
	});

	function addRow(): void {
		rows = [...rows, { key: '', value: '' }];
	}

	function removeRow(index: number): void {
		rows = rows.filter((_, i) => i !== index);
	}

	function apply(): void {
		const parsed: JsonObject = {};
		for (const row of rows) {
			parsed[row.key] = row.value;
		}
		const nextColumns = Number(columnInput);
		onapply({
			name: nameInput,
			columns: Number.isFinite(nextColumns) ? nextColumns : DEFAULT_GRID_COLUMNS,
			context: parsed
		});
		open = false;
	}
</script>

<Dialog bind:open>
	<DialogContent class="sm:max-w-md" data-testid="settings-dialog">
		<DialogHeader>
			<DialogTitle>Settings</DialogTitle>
			<DialogDescription>
				App name, grid size, and the values that <span class="font-mono">$context.*</span> bindings
				read.
			</DialogDescription>
		</DialogHeader>

		<div class="flex flex-col gap-1.5">
			<Label for="settings-name">App name</Label>
			<Input id="settings-name" bind:value={nameInput} data-testid="settings-name" />
		</div>

		<div class="flex flex-col gap-1.5">
			<Label for="settings-columns">Grid columns</Label>
			<Input
				id="settings-columns"
				type="number"
				min="1"
				max="24"
				bind:value={columnInput}
				data-testid="settings-columns"
			/>
		</div>

		<Separator />

		<div class="flex flex-col gap-2">
			<span class="text-xs font-medium text-muted-foreground">Runtime context</span>
			{#each rows as row, index (index)}
				<div class="flex items-center gap-2">
					<Input
						value={row.key}
						placeholder="key"
						aria-label="Context key"
						data-testid="settings-context-key"
						oninput={(event) => {
							const next = rows.slice();
							next[index] = { ...next[index], key: event.currentTarget.value };
							rows = next;
						}}
					/>
					<Input
						value={row.value}
						placeholder="value"
						aria-label="Context value"
						data-testid="settings-context-value"
						oninput={(event) => {
							const next = rows.slice();
							next[index] = { ...next[index], value: event.currentTarget.value };
							rows = next;
						}}
					/>
					<Button variant="ghost" size="sm" onclick={() => removeRow(index)}>Remove</Button>
				</div>
			{/each}
			<Button variant="outline" size="sm" class="self-start" onclick={addRow} data-testid="settings-add-context">
				Add context value
			</Button>
			<p class="text-xs text-muted-foreground">
				Context values are available to bindings as
				<span class="font-mono">$context.&lt;key&gt;</span>.
			</p>
		</div>

		<DialogFooter>
			<Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
			<Button onclick={apply} data-testid="settings-apply">Apply</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>