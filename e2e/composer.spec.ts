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