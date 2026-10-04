// @vitest-environment jsdom
import { describe, expect, it, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/svelte';
import RuntimeRenderer from './RuntimeRenderer.svelte';
import { createUIDefinition } from '../domain/definitions/ui-definition.factory';
import type { UIDefinition } from '../domain/definitions/ui-definition';
import { createDemoDefinition } from '../demo/customer-risk-dashboard';

afterEach(cleanup);

function definitionWith(components: UIDefinition['components']): UIDefinition {
	return { ...createUIDefinition('Test', 'def-1'), components };
}

describe('RuntimeRenderer: definition -> registry -> component', () => {
	it('renders the demo definition into the grid', () => {
		const { container } = render(RuntimeRenderer, { props: { definition: createDemoDefinition() } });

		const root = container.querySelector('[data-testid="runtime-root"]');
		expect(root).not.toBeNull();
		expect(root?.getAttribute('data-definition-name')).toBe('Customer Risk Dashboard');
		expect(container.querySelectorAll('[data-testid="runtime-item"]')).toHaveLength(4);
	});

	it('lays components out on the definition grid using column and span', () => {
		const { container } = render(RuntimeRenderer, { props: { definition: createDemoDefinition() } });

		const risk = container.querySelector('[data-component-id="risk-score"]');
		expect(risk?.getAttribute('style')).toContain('grid-column: 1 / span 6');

		const portfolio = container.querySelector('[data-component-id="portfolio"]');
		expect(portfolio?.getAttribute('style')).toContain('grid-column: 7 / span 6');
	});

	it('renders the Text component using registry metadata', () => {
		const { container } = render(RuntimeRenderer, { props: { definition: createDemoDefinition() } });

		const title = container.querySelector('[data-component-type="text"] [data-testid="text-component"]');
		expect(title?.textContent).toBe('Customer Risk Dashboard');
	});

	it('passes resolved binding data into a data component', () => {
		const { container } = render(RuntimeRenderer, {
			props: {
				definition: createDemoDefinition(),
				data: { 'risk-score': { score: 27, band: 'Low' } }
			}
		});

		const card = container.querySelector('[data-component-id="risk-score"]');
		expect(card?.querySelector('h3')?.textContent).toBe('Risk Score');

		const values = [...card!.querySelectorAll('[data-testid="data-card-value"]')].map((n) => n.textContent);
		expect(values).toEqual(['27', 'Low']);
	});

	it('shows the empty text when a data component has no resolved data', () => {
		const { container } = render(RuntimeRenderer, {
			props: { definition: createDemoDefinition(), data: {} }
		});

		const card = container.querySelector('[data-component-id="risk-score"]');
		expect(card?.textContent).toContain('No data');
	});

	it('renders an unknown component as a readable error instead of crashing', () => {
		const definition = definitionWith([
			{
				id: 'ghost',
				type: 'RiskScore',
				props: {},
				layout: { column: 1, span: 12 }
			}
		]);

		const { container } = render(RuntimeRenderer, { props: { definition } });
		expect(container.querySelector('[data-testid="unknown-component"]')?.textContent).toBe(
			'Unknown component: RiskScore'
		);
	});

	it('surfaces a binding error and loading flag next to the component', () => {
		const { container } = render(RuntimeRenderer, {
			props: {
				definition: createDemoDefinition(),
				errors: { 'risk-score': 'API request failed: GET /api/mock/risk/score responded 500' },
				loading: { 'risk-score': true }
			}
		});

		const card = container.querySelector('[data-component-id="risk-score"]');
		expect(card?.textContent).toContain('Loading…');
		expect(card?.querySelector('[data-testid="binding-error"]')?.textContent).toBe(
			'API request failed: GET /api/mock/risk/score responded 500'
		);
	});

	it('renders every registered component type', () => {
		const definition = definitionWith([
			{ id: 'a', type: 'container', props: { title: 'Box', subtitle: 'sub' }, layout: { column: 1, span: 12 } },
			{ id: 'b', type: 'text', props: { text: 'Hello', variant: 'body' }, layout: { column: 1, span: 6 } },
			{ id: 'c', type: 'button', props: { label: 'Go', variant: 'outline' }, layout: { column: 7, span: 6 } },
			{
				id: 'd',
				type: 'data-card',
				props: { title: 'Card', emptyText: 'Nothing' },
				layout: { column: 1, span: 12 }
			}
		]);

		const { container } = render(RuntimeRenderer, { props: { definition } });

		expect(container.querySelector('[data-testid="container-slot"]')).not.toBeNull();
		expect(container.querySelector('[data-testid="text-component"]')?.textContent).toBe('Hello');
		expect(container.querySelector('[data-testid="button-component"]')?.textContent).toBe('Go');
		expect(container.querySelector('[data-testid="data-card-value"]')).toBeNull();
	});

	it('renders an empty definition without error', () => {
		const { container } = render(RuntimeRenderer, {
			props: { definition: createUIDefinition('Empty', 'def-1') }
		});
		expect(container.querySelectorAll('[data-testid="runtime-item"]')).toHaveLength(0);
	});
});