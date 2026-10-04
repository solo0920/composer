<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog/index.js';

	let {
		open = $bindable(false),
		title,
		description,
		initialValue = '',
		confirmLabel = 'Create',
		testid,
		onconfirm
	}: {
		open?: boolean;
		title: string;
		description: string;
		initialValue?: string;
		confirmLabel?: string;
		testid: string;
		onconfirm: (name: string) => void;
	} = $props();

	let name = $state('');

	// Re-seed the field each time the dialog opens so a previous attempt does
	// not linger.
	$effect(() => {
		if (open) name = initialValue;
	});

	function submit(event: SubmitEvent): void {
		event.preventDefault();
		if (name.trim().length === 0) return;
		onconfirm(name);
		open = false;
	}
</script>

<Dialog bind:open>
	<DialogContent class="sm:max-w-md" data-testid={testid}>
		<form onsubmit={submit}>
			<DialogHeader>
				<DialogTitle>{title}</DialogTitle>
				<DialogDescription>{description}</DialogDescription>
			</DialogHeader>

			<div class="flex flex-col gap-1.5 py-2">
				<Label for={`${testid}-name`}>App name</Label>
				<Input
					id={`${testid}-name`}
					bind:value={name}
					data-testid="app-name-input"
					placeholder="My app"
					required
				/>
			</div>

			<DialogFooter>
				<Button type="button" variant="outline" onclick={() => (open = false)}>Cancel</Button>
				<Button type="submit" data-testid="app-name-confirm">{confirmLabel}</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>