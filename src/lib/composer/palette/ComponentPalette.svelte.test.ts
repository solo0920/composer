// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/svelte';
import ComponentPalette from './ComponentPalette.svelte';
import { componentRegistry } from '$lib/registry';

afterEach(cleanup);

function palette(insertTarget: string | null = null) {
	return render(ComponentPalette, {
		props: { registry: componentRegistry, insertTarget, onadd: () => {} }
	});
}

describe('ComponentPalette', () => {
	it('renders one group per registry category, in registry order', () => {
		const { container } = palette();
		const categories = [...container.querySelectorAll('section[data-category]')].map(
			(node) => node.getAttribute('data-category')
		);
		expect(categories).toEqual(['Layout', 'Basic', 'Data']);
	});

	it('shows every registered component inside its category', () => {
		const { container } = palette();
		const types = [...container.querySelectorAll('[data-testid="palette-item"]')].map((node) =>
			node.getAttribute('data-component-type')
		);
		expect(types).toEqual(['container', 'text', 'button', 'data-card']);
	});

	it('shows a component count per category from registry metadata', () => {
		const { container } = palette();
		expect(
			container.querySelector('[data-testid="palette-category"][data-category="Basic"]')?.textContent
		).toContain('(2)');
	});

	it('starts with every category expanded', () => {
		const { container } = palette();
		expect(container.querySelectorAll('[data-testid="palette-group-items"]')).toHaveLength(3);
		expect(container.querySelectorAll('[data-testid="palette-item"]')).toHaveLength(4);
	});
});

describe('collapsing categories', () => {
	it('hides a category’s items when its header is clicked', async () => {
		const { container, getAllByTestId } = palette();

		await getAllByTestId('palette-category')[0].click();

		// Layout is collapsed; Basic and Data are untouched.
		expect(container.querySelectorAll('[data-testid="palette-group-items"]')).toHaveLength(2);
		expect(container.querySelector('section[data-category="Layout"] [data-testid="palette-item"]')).toBeNull();
		expect(container.querySelectorAll('[data-testid="palette-item"]')).toHaveLength(3);
		expect(getAllByTestId('palette-category')[0].getAttribute('aria-expanded')).toBe('false');
	});

	it('collapses only the clicked category', async () => {
		const { container, getAllByTestId } = palette();
		const headers = getAllByTestId('palette-category');

		await headers[1].click();

		expect(container.querySelectorAll('[data-testid="palette-group-items"]')).toHaveLength(2);
		expect(container.querySelector('section[data-category="Basic"] [data-testid="palette-item"]')).toBeNull();
	});

	it('expands again on a second click', async () => {
		const { container, getAllByTestId } = palette();

		await getAllByTestId('palette-category')[0].click();
		await getAllByTestId('palette-category')[0].click();

		expect(container.querySelectorAll('[data-testid="palette-group-items"]')).toHaveLength(3);
		expect(getAllByTestId('palette-category')[0].getAttribute('aria-expanded')).toBe('true');
	});

	it('keeps independent collapse state per category', async () => {
		const { getAllByTestId } = palette();
		const headers = getAllByTestId('palette-category');

		await headers[0].click();
		await headers[2].click();

		expect(headers.map((h) => h.getAttribute('aria-expanded'))).toEqual(['false', 'true', 'false']);
	});
});

describe('insert target hint', () => {
	it('reports the root when nothing is selected', () => {
		expect(palette(null).getByTestId('palette-insert-target').textContent).toContain(
			'Adding at the root level'
		);
	});

	it('names the container the next add will land in', () => {
		expect(palette('container-2').getByTestId('palette-insert-target').textContent).toContain(
			'Adding inside container-2'
		);
	});
});