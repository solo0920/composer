import { expect, test } from '@playwright/test';

/**
 * The critical user flow, end to end in a real browser:
 *
 *   palette -> composer -> UI definition -> binding -> real HTTP mock API
 *   -> runtime renderer -> live preview -> save -> reload -> still there
 */

test.beforeEach(async ({ page }) => {
	await page.goto('/');
	// Clear once, after the first load, so that a reload inside a test still
	// exercises persistence rather than a freshly wiped store.
	await page.evaluate(() => window.localStorage.clear());
	await page.reload();
	await expect(page.getByTestId('canvas-grid')).toBeVisible();
});

test('renders the demo definition with live API data in Preview', async ({ page }) => {
	await expect(page.locator('[data-testid="canvas-item"]')).toHaveCount(4);

	await page.getByTestId('preview-toggle').click();
	await expect(page.getByTestId('preview-title')).toHaveText('Customer Risk Dashboard');

	// Data arrives over real HTTP from the mock SvelteKit endpoints.
	await expect(page.getByTestId('data-card-value').first()).toBeVisible();
	const body = await page.getByTestId('runtime-root').innerText();
	expect(body).toContain('Ada Lovelace');
	expect(body).toContain('ada@example.com');
	expect(body).toContain('Gold');
	expect(body).toContain('27');
	expect(body).toContain('Low');
	expect(body).toContain('24540.5');
	expect(await page.getByTestId('binding-error').count()).toBe(0);
});

test('adds a component, edits it, binds it to an API and previews the result', async ({ page }) => {
	// 1. Add from the Component Registry via the palette.
	await page.getByTestId('palette-item').filter({ hasText: 'DataCard' }).click();
	await expect(page.locator('[data-testid="canvas-item"]')).toHaveCount(5);
	const added = page.locator('[data-testid="canvas-item"]').last();
	const addedId = await added.getAttribute('data-component-id');

	// 2. Edit a prop through the registry-driven Properties form.
	await page.getByTestId('inspector-title').waitFor();
	await page.getByLabel('Title').fill('Bound Card');
	await expect(added.locator('h3')).toHaveText('Bound Card');

	// 3. Change layout through the Inspector.
	await page.getByLabel('Span').fill('4');
	await expect
		.poll(() => added.evaluate((el) => getComputedStyle(el).gridColumn))
		.toBe('1 / span 4');

	// 4. Bind it to a real API through the Combobox.
	await page.getByRole('combobox').click();
	await page.getByPlaceholder('Search APIs…').fill('risk');
	await page.getByRole('option', { name: /risk\.getScore/ }).click();
	await expect(page.getByTestId('api-combobox-value')).toContainText('risk.getScore');

	// Mappings are prefilled from API registry metadata.
	await expect(page.getByLabel('customerId')).toHaveValue('$context.customerId');
	await expect(page.getByLabel('score')).toHaveValue('$.score');

	// 5. The bound card shows real API data in Preview.
	await page.getByTestId('preview-toggle').click();
	const previewCard = page.locator(`[data-component-id="${addedId}"]`);
	await expect(previewCard).toContainText('Bound Card');
	await expect(previewCard).toContainText('27');
	await expect(previewCard).toContainText('Low');
});

test('deletes a component from the canvas', async ({ page }) => {
	await expect(page.locator('[data-testid="canvas-item"]')).toHaveCount(4);

	await page.locator('[data-testid="canvas-item"]').first().click();
	await page.getByTestId('delete-component').click();

	await expect(page.locator('[data-testid="canvas-item"]')).toHaveCount(3);
});

test('saves and reloads the definition, including an edit', async ({ page }) => {
	await page.locator('[data-testid="canvas-item"]').first().click();
	await page.getByTestId('prop-input').first().fill('Edited Title');
	await expect(page.getByTestId('dirty-flag')).toBeVisible();

	await page.getByTestId('save').click();
	await expect(page.getByTestId('dirty-flag')).toHaveCount(0);

	await page.reload();
	await expect(page.getByTestId('canvas-grid')).toBeVisible();
	await expect(page.locator('[data-testid="canvas-item"]')).toHaveCount(4);
	await expect(page.locator('[data-testid="text-component"]').first()).toHaveText('Edited Title');
	await expect(page.getByTestId('dirty-flag')).toHaveCount(0);
});

test('reset restores the demo definition and clears the saved one', async ({ page }) => {
	await page.locator('[data-testid="canvas-item"]').first().click();
	await page.getByTestId('delete-component').click();
	await expect(page.locator('[data-testid="canvas-item"]')).toHaveCount(3);

	await page.getByTestId('save').click();

	await page.getByRole('button', { name: 'Reset' }).click();
	await expect(page.locator('[data-testid="canvas-item"]')).toHaveCount(4);
	await expect(page.locator('[data-testid="text-component"]').first()).toHaveText(
		'Customer Risk Dashboard'
	);
});

test('shows the definition JSON and rejects an invalid edit', async ({ page }) => {
	await page.getByRole('tab', { name: 'JSON' }).click();

	const json = page.getByLabel('UI definition JSON');
	await expect(json).toHaveValue(/"Customer Risk Dashboard"/);
	await expect(json).toHaveValue(/customer\.getProfile/);

	await json.fill('{ not json');
	await page.getByTestId('apply-json').click();
	await expect(page.getByTestId('json-error')).toContainText('Invalid JSON');

	await json.fill(
		JSON.stringify({
			id: 'x',
			version: 1,
			name: 'X',
			layout: { type: 'grid', columns: 12 },
			components: [
				{ id: 'a', type: 'RiskScore', props: {}, layout: { column: 1, span: 6 } }
			]
		})
	);
	await page.getByTestId('apply-json').click();
	await expect(page.getByTestId('json-error')).toContainText('unknown component "RiskScore"');

	// A valid edit round-trips back into the visual composer.
	await page.getByRole('tab', { name: 'Visual' }).click();
	await expect(page.locator('[data-testid="canvas-item"]')).toHaveCount(4);
});

test('shows a readable binding error when the API request fails', async ({ page }) => {
	// Route the profile call to a 500 so the failure is observable in Preview.
	await page.route('**/api/mock/customer/profile**', (route) =>
		route.fulfill({ status: 500, body: '{"error":"boom"}' })
	);

	await page.getByTestId('preview-toggle').click();

	await expect(page.getByTestId('binding-error')).toContainText(
		'API request failed: GET /api/mock/customer/profile responded 500'
	);
});

test('composes a nested component tree like a JSON spec', async ({ page }) => {
	/** Direct children of a canvas cell, in DOM order. */
	const childrenOf = (id: string) =>
		page.locator(
			`[data-testid="canvas-item"][data-component-id="${id}"] > [data-testid="canvas-children"] > [data-testid="canvas-item"]`
		);
	const lastChildId = async (id: string) =>
		(await childrenOf(id).last().getAttribute('data-component-id')) ?? '';

	// Adding a Container puts it at the root and selects it.
	await page.getByTestId('palette-item').filter({ hasText: 'Container' }).click();
	const boxId = await page.locator('[data-testid="canvas-item"]').last().getAttribute('data-component-id');
	const box = page.locator(`[data-testid="canvas-item"][data-component-id="${boxId}"]`);
	await expect(page.getByTestId('palette-insert-target')).toContainText(`Adding inside ${boxId}`);

	// The next add nests inside it rather than becoming a sibling.
	await page.getByTestId('palette-item').filter({ hasText: 'Text' }).click();
	const innerId = await lastChildId(boxId);
	expect(innerId).not.toBe(boxId);
	await expect(childrenOf(boxId)).toHaveCount(1);
	await expect(box).toContainText('1 child');
	await expect(
		page.locator(`[data-testid="canvas-item"][data-component-id="${innerId}"]`)
	).toHaveCount(1);

	// Repeated clicks keep adding siblings inside the same container.
	await page.getByTestId('palette-item').filter({ hasText: 'Button' }).click();
	const buttonId = await lastChildId(boxId);
	await expect(childrenOf(boxId)).toHaveCount(2);
	await expect(box).toContainText('2 children');

	// A Text cannot contain children, so selecting it retargets the root.
	await page.locator(`[data-component-id="${innerId}"]`).click();
	await expect(page.getByTestId('palette-insert-target')).toContainText('Adding at the root level');

	// Re-selecting the container retargets nesting; a container added now lands
	// inside box rather than at the root.
	await page.locator(`[data-component-id="${boxId}"]`).click();
	await expect(page.getByTestId('palette-insert-target')).toContainText(`Adding inside ${boxId}`);
	await page.getByTestId('palette-item').filter({ hasText: 'Container' }).click();
	await expect(childrenOf(boxId)).toHaveCount(3);
	const nestedBoxId = await lastChildId(boxId);

	await page.locator(`[data-component-id="${nestedBoxId}"]`).click();
	await page.getByTestId('palette-item').filter({ hasText: 'Button' }).click();
	await expect(childrenOf(nestedBoxId)).toHaveCount(1);
	const deepestId = await lastChildId(nestedBoxId);
	expect(deepestId).toBeTruthy();

	// Editing the deepest component still works through the same Inspector.
	// Select it first, so the form shows the Button's fields rather than the
	// parent container's.
	await page.locator(`[data-component-id="${deepestId}"]`).click();
	await expect(page.getByTestId('inspector-title')).toHaveText('Button');
	await page.getByLabel('Label').fill('Deep Button');
	await expect(page.locator(`[data-component-id="${deepestId}"]`)).toContainText('Deep Button');

	// The whole tree survives save + reload.
	await page.getByTestId('save').click();
	await page.reload();
	await expect(page.locator(`[data-component-id="${innerId}"]`)).toHaveCount(1);
	await expect(page.locator(`[data-component-id="${buttonId}"]`)).toHaveCount(1);
	await expect(page.locator(`[data-component-id="${deepestId}"]`)).toContainText('Deep Button');
	await expect(childrenOf(boxId)).toHaveCount(3);
	await expect(childrenOf(nestedBoxId)).toHaveCount(1);

	// And it renders in Preview at the same nesting.
	await page.getByTestId('preview-toggle').click();
	await expect(
		page.locator(`[data-component-id="${boxId}"] > [data-testid="runtime-children"]`)
	).toHaveCount(1);
	await expect(
		page.locator(`[data-component-id="${nestedBoxId}"] [data-component-id="${deepestId}"]`)
	).toHaveCount(1);
});

test('deleting a container removes its whole subtree', async ({ page }) => {
	await page.getByTestId('palette-item').filter({ hasText: 'Container' }).click();
	const boxId = await page.locator('[data-testid="canvas-item"]').last().getAttribute('data-component-id');
	const box = page.locator(`[data-testid="canvas-item"][data-component-id="${boxId}"]`);

	await page.getByTestId('palette-item').filter({ hasText: 'Text' }).click();
	await expect(page.locator('[data-testid="canvas-item"]')).toHaveCount(6);
	await expect(box.locator('[data-testid="canvas-children"]')).toBeVisible();

	await box.click();
	await page.getByTestId('delete-component').click();

	// Back to the demo's four components; no orphaned descendants.
	await expect(page.locator('[data-testid="canvas-item"]')).toHaveCount(4);
	await expect(page.locator('[data-testid="canvas-children"]')).toHaveCount(0);
});