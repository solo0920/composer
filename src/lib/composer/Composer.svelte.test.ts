// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/svelte';
import Composer from './Composer.svelte';
import { apiRegistry, componentRegistry, registryLookup, stackRegistry } from '../registry';
import { Workspace } from '../apps/workspace.svelte';
import { createDemoDefinition } from '../demo/customer-risk-dashboard';
import { createDemoFlows } from '../demo/customer-risk-dashboard.flows';
import type { StageId } from './stages';

afterEach(cleanup);

function memoryStorage(): Storage {
	const map = new Map<string, string>();
	return {
		get length() {
			return map.size;
		},
		clear: () => map.clear(),
		getItem: (key) => map.get(key) ?? null,
		key: () => null,
		removeItem: (key) => void map.delete(key),
		setItem: (key, value) => void map.set(key, value)
	} as Storage;
}

const emptyPreview = { data: {}, errors: {}, loading: {} };

function mount() {
	const workspace = new Workspace(
		memoryStorage(),
		componentRegistry,
		apiRegistry,
		registryLookup,
		stackRegistry,
		createDemoDefinition(),
		createDemoFlows()
	);
	workspace.start();

	const rendered = render(Composer, {
		props: {
			workspace,
			componentRegistry,
			apiRegistry,
			stackRegistry,
			preview: emptyPreview,
			jsonError: null,
			onapplyjson: () => {}
		}
	});

	return { ...rendered, workspace };
}

const markedStage = (container: HTMLElement) =>
	container.querySelector('[aria-current="step"]')?.getAttribute('data-stage-id') ?? null;

/** Raw clicks do not flush Svelte's reactivity, so use the awaitable helper. */
const clickStage = async (container: HTMLElement, stage: StageId) => {
	const button = container.querySelector(`[data-stage-id="${stage}"]`);
	if (!button) throw new Error(`stage not rendered: ${stage}`);
	await fireEvent.click(button);
};

const hasCanvas = (c: HTMLElement) => c.querySelector('[data-testid="canvas-grid"]') !== null;
const hasBinding = (c: HTMLElement) => c.querySelector('[data-testid="binding-panel"]') !== null;
const hasPreview = (c: HTMLElement) => c.querySelector('[data-testid="preview-title"]') !== null;

describe('Composer: indicator and content always agree', () => {
	it('marks the layout stage and shows the canvas on first paint', () => {
		const { container } = mount();
		expect(markedStage(container)).toBe('layout');
		expect(hasCanvas(container)).toBe(true);
		expect(hasBinding(container)).toBe(false);
		expect(hasPreview(container)).toBe(false);
	});

	it('renders exactly one top-level bar containing both nav and header', () => {
		const { container } = mount();
		const header = container.querySelector('[data-testid="composer-header"]');

		// One bar, not two stacked ones.
		expect(container.querySelectorAll('header')).toHaveLength(1);
		expect(header).not.toBeNull();

		// The workflow stages live inside that same bar rather than in their own.
		const roadmap = container.querySelector('[data-testid="workflow-roadmap"]');
		expect(roadmap).not.toBeNull();
		expect(header!.contains(roadmap!)).toBe(true);
	});

	it('keeps file, stage, status and save controls in the one bar', () => {
		const { container } = mount();
		const header = container.querySelector('[data-testid="composer-header"]')!;
		for (const testId of ['file-menu', 'workflow-roadmap', 'app-name', 'save', 'reset']) {
			expect(header.querySelector(`[data-testid="${testId}"]`), testId).not.toBeNull();
		}
	});

	it('no longer offers a second control that duplicates the stage control', () => {
		const { container } = mount();
		// The pre-consolidation toggles are gone, so exactly one control group governs
		// what the workspace shows (spec SC-004).
		for (const removed of ['preview-toggle', 'view-binding', 'view-compose']) {
			expect(container.querySelector(`[data-testid="${removed}"]`), removed).toBeNull();
		}
	});

	it('marks exactly one stage as active', () => {
		const { container } = mount();
		expect(container.querySelectorAll('[aria-current="step"]')).toHaveLength(1);
	});

	it('shows the binding workspace for the binding stage', async () => {
		const { container } = mount();
		await clickStage(container, 'binding');
		expect(markedStage(container)).toBe('binding');
		expect(hasBinding(container)).toBe(true);
		expect(hasCanvas(container)).toBe(false);
		expect(hasPreview(container)).toBe(false);
	});

	it('shows the rendered view for the preview stage', async () => {
		const { container } = mount();
		await clickStage(container, 'preview');
		expect(markedStage(container)).toBe('preview');
		expect(hasPreview(container)).toBe(true);
		expect(hasCanvas(container)).toBe(false);
		expect(hasBinding(container)).toBe(false);
	});

	it('keeps the indicator and content agreeing across a full round trip', async () => {
		const { container } = mount();
		for (const stage of ['binding', 'preview', 'layout', 'binding', 'layout'] as const) {
			await clickStage(container, stage);
			expect(markedStage(container)).toBe(stage);
			// Exactly one workspace is ever on screen.
			const shown = [hasBinding(container), hasCanvas(container), hasPreview(container)].filter(Boolean);
			expect(shown).toHaveLength(1);
		}
	});

	it('leaves state untouched when the active stage is selected again', async () => {
		const { container } = mount();
		await clickStage(container, 'preview');
		await clickStage(container, 'preview');
		expect(markedStage(container)).toBe('preview');
		expect(hasPreview(container)).toBe(true);
	});

	it('preserves unsaved edits and the dirty flag across a stage change', async () => {
		const { container, workspace } = mount();
		const added = workspace.composer.addComponent('text')!;
		workspace.composer.updateProps(added.id, { text: 'Kept' });
		expect(workspace.composer.dirty).toBe(true);

		await clickStage(container, 'preview');
		await clickStage(container, 'layout');

		expect(workspace.composer.dirty).toBe(true);
		expect(container.querySelector('[data-testid="dirty-flag"]')).not.toBeNull();
		expect(
			workspace.composer.definition.components.some((c) => c.props['text'] === 'Kept')
		).toBe(true);
	});

	it('exposes the workflow stages as the only navigation control', () => {
		const { container } = mount();
		// Stage selection happens only through the roadmap; nothing else competes.
		expect(container.querySelectorAll('[data-testid="workflow-stage"]')).toHaveLength(3);
	});
});

describe('Composer: layout presentation belongs to the layout stage', () => {
	const presentationControl = (c: HTMLElement) => c.querySelector('[role="tablist"]');

	it('offers the presentation control on the layout stage only', async () => {
		const { container } = mount();
		expect(presentationControl(container)).not.toBeNull();

		await clickStage(container, 'binding');
		expect(presentationControl(container)).toBeNull();

		await clickStage(container, 'preview');
		expect(presentationControl(container)).toBeNull();
	});

	it('renders the structured view instead of the canvas when selected', async () => {
		const { container } = mount();
		const jsonTab = [...container.querySelectorAll('[role="tab"]')].find(
			(node) => node.textContent?.trim() === 'JSON'
		);
		expect(jsonTab).toBeDefined();
		await fireEvent.click(jsonTab!);

		expect(hasCanvas(container)).toBe(false);
		expect(container.querySelector('textarea[aria-label="UI definition JSON"]')).not.toBeNull();
	});

	it('preserves the structured view across a stage change and back', async () => {
		const { container } = mount();
		await fireEvent.click(
			[...container.querySelectorAll('[role="tab"]')].find(
				(node) => node.textContent?.trim() === 'JSON'
			)!
		);
		expect(container.querySelector('textarea[aria-label="UI definition JSON"]')).not.toBeNull();

		await clickStage(container, 'preview');
		await clickStage(container, 'layout');

		expect(container.querySelector('textarea[aria-label="UI definition JSON"]')).not.toBeNull();
		expect(hasCanvas(container)).toBe(false);
	});
});