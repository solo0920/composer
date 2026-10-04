// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/svelte';
import WorkflowRoadmap from './WorkflowRoadmap.svelte';
import { STAGES, type StageId } from '../stages';

afterEach(cleanup);

/**
 * Contract section 4: the indicator is presentational. It renders the stage list,
 * marks exactly one stage, and decides nothing about what content is shown.
 */
function roadmap(activeStage: StageId = 'layout') {
	return render(WorkflowRoadmap, { props: { stages: STAGES, activeStage } });
}

const markedStages = (container: HTMLElement) =>
	[...container.querySelectorAll('[data-testid="workflow-stage"]')]
		.filter((node) => node.getAttribute('aria-current') === 'step')
		.map((node) => node.getAttribute('data-stage-id'));

describe('WorkflowRoadmap', () => {
	it('renders all three stages', () => {
		const { container } = roadmap();
		expect(container.querySelectorAll('[data-testid="workflow-stage"]')).toHaveLength(3);
	});

	it('renders the stage labels in workflow order', () => {
		const { container } = roadmap();
		expect(
			[...container.querySelectorAll('[data-testid="workflow-stage-label"]')].map((n) =>
				n.textContent?.trim()
			)
		).toEqual(['Binding', 'UI Layout', 'Preview']);
	});

	it('marks exactly one stage as active for every valid stage', () => {
		for (const stage of ['binding', 'layout', 'preview'] as const) {
			const { container } = roadmap(stage);
			expect(markedStages(container)).toEqual([stage]);
		}
	});

	it('signals the active stage without relying on colour alone', () => {
		const { container } = roadmap('preview');
		const active = container.querySelector('[data-stage-id="preview"]');
		// aria-current is the non-colour signal required by FR-008.
		expect(active?.getAttribute('aria-current')).toBe('step');

		const inactive = container.querySelector('[data-stage-id="layout"]');
		expect(inactive?.hasAttribute('aria-current')).toBe(false);
	});

	it('marks the active stage visually as well as semantically', () => {
		const { container } = roadmap('binding');
		const active = container.querySelector('[data-stage-id="binding"]');
		const inactive = container.querySelector('[data-stage-id="layout"]');
		expect(active?.getAttribute('data-active')).toBe('true');
		expect(inactive?.getAttribute('data-active')).toBe('false');
	});

	it('labels each stage with its order so the sequence is conveyed', () => {
		const { container } = roadmap();
		expect(
			[...container.querySelectorAll('[data-testid="workflow-stage"]')].map(
				(n) => n.getAttribute('data-order')
			)
		).toEqual(['1', '2', '3']);
	});

	it('exposes the roadmap as one labelled group', () => {
		const { container } = roadmap();
		const group = container.querySelector('[data-testid="workflow-roadmap"]');
		expect(group?.getAttribute('role')).toBe('group');
		expect(group?.getAttribute('aria-label')).toBe('Authoring workflow');
	});

	it('renders in stage order even when the array arrives unordered', () => {
		// Contract section 4 requires every stage rendered "in `order`", so the
		// sequence comes from the data, not from the array it arrived in.
		const reversed = [...STAGES].reverse();
		const { container } = render(WorkflowRoadmap, {
			props: { stages: reversed, activeStage: 'preview' }
		});
		expect(
			[...container.querySelectorAll('[data-testid="workflow-stage"]')].map((n) =>
				n.getAttribute('data-stage-id')
			)
		).toEqual(['binding', 'layout', 'preview']);
	});
});