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

	/**
	 * jsdom does not implement the browser's Enter/Space activation behaviour for
	 * buttons, so "operable by keyboard" cannot be proven here by dispatching key
	 * events: such a test would pass regardless of the markup. The structural
	 * guarantee that makes a control keyboard operable is asserted below, and the
	 * real traversal and activation are exercised in `e2e/composer.spec.ts`.
	 *
	 * The one thing jsdom *can* falsify is focus, so each stage is asserted to take
	 * focus, and the absence of the usual focus-order sabotage (`tabindex`) is
	 * asserted directly rather than inferred.
	 */
	describe('keyboard operation (FR-008, research R4)', () => {
		const interactive = () =>
			render(WorkflowRoadmap, {
				props: { stages: STAGES, activeStage: 'layout', onselect: () => {} }
			});

		it('renders each stage as a native button, which is what makes it keyboard operable', () => {
			const { container } = interactive();
			const controls = container.querySelectorAll('[data-testid="workflow-stage"]');
			expect(controls).toHaveLength(3);

			for (const control of controls) {
				expect(control.tagName).toBe('BUTTON');
				// `type="button"` keeps Enter from submitting anything the control is
				// nested in.
				expect(control.getAttribute('type')).toBe('button');
			}
		});

		it('leaves every stage in the normal tab order', () => {
			// A custom tabindex is the usual way to drop a control out of the tab
			// order, so none may appear on any stage.
			const { container } = interactive();
			for (const control of container.querySelectorAll('[data-testid="workflow-stage"]')) {
				expect(control.hasAttribute('tabindex')).toBe(false);
				expect(control.hasAttribute('disabled')).toBe(false);
			}
		});

		it('lets each stage take focus', () => {
			const { container } = interactive();
			for (const control of container.querySelectorAll('[data-testid="workflow-stage"]')) {
				(control as HTMLElement).focus();
				expect(document.activeElement).toBe(control);
			}
		});

		it('offers no selectable control when the roadmap is only a status display', () => {
			// Without a handler the stages describe the position in the workflow
			// rather than offering controls that would do nothing.
			const { container } = roadmap();
			for (const control of container.querySelectorAll('[data-testid="workflow-stage"]')) {
				expect(control.tagName).not.toBe('BUTTON');
				expect(control.hasAttribute('tabindex')).toBe(false);
			}
		});

		it('signals the active stage by weight as well as by colour', () => {
			// FR-008 requires the active state to be perceivable without colour
			// vision. `aria-current` covers assistive technology; the weight change
			// covers a sighted reader who cannot distinguish the fill colours.
			const { container } = interactive();
			const active = container.querySelector('[data-stage-id="layout"]')!;
			const inactive = container.querySelector('[data-stage-id="binding"]')!;

			expect(active.className).toContain('font-medium');
			expect(inactive.className).not.toContain('font-medium');
			expect(active.getAttribute('aria-current')).toBe('step');
		});

		it('reaches the stages with accessible names that include the step number', () => {
			const { container } = interactive();
			for (const control of container.querySelectorAll('[data-testid="workflow-stage"]')) {
				// The numeral is part of the control's text, so the accessible name
				// carries the position as well as the label.
				expect(control.textContent?.replace(/\s+/g, ' ').trim()).toMatch(
					/^[123] (Binding|UI Layout|Preview)$/
				);
			}
		});
	});
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