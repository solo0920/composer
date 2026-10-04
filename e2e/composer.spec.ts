import { expect, test, type Page } from '@playwright/test';

/**
 * The critical user flow, end to end in a real browser:
 *
 *   palette -> composer -> UI definition -> binding -> real HTTP mock API
 *   -> runtime renderer -> live preview -> save -> reload -> still there
 */

/** Selects a workflow stage through the roadmap, the only navigation control. */
async function goToStage(page: Page, stage: 'binding' | 'layout' | 'preview'): Promise<void> {
	await page.locator(`[data-testid="workflow-stage"][data-stage-id="${stage}"]`).click();
	await expect(page.locator(`[data-testid="workflow-stage"][data-stage-id="${stage}"]`)).toHaveAttribute(
		'aria-current',
		'step'
	);
}

test.beforeEach(async ({ page }) => {
	await page.goto('/');
	// Clear once, after the first load, so that a reload inside a test still
	// exercises persistence rather than a freshly wiped store.
	await page.evaluate(() => window.localStorage.clear());
	await page.reload();

	// Readiness gate: the header and roadmap render as soon as the composer is
	// interactive. Waiting on stage-dependent content made this gate racy under
	// parallel load, so the default stage is asserted by its own test.
	await expect(page.getByTestId('composer-header')).toBeVisible();
	await expect(page.getByTestId('workflow-roadmap')).toBeVisible();
});

test('every stage is reachable and operable by keyboard alone', async ({ page }) => {
	const stage = (id: 'binding' | 'layout' | 'preview') =>
		page.locator(`[data-testid="workflow-stage"][data-stage-id="${id}"]`);
	const focusedStage = async () => {
		const focused = await page.evaluate(() =>
			document.activeElement?.getAttribute('data-stage-id')
		);
		return focused;
	};

	// Start just before the roadmap so the traversal order is observable from a
	// known point rather than from wherever the browser happens to begin.
	await page.getByTestId('file-menu').focus();
	await expect(page.getByTestId('file-menu')).toBeFocused();

	// All three stages are in the normal tab order, in workflow order, with no
	// custom arrow-key handling needed (research R4).
	await page.keyboard.press('Tab');
	expect(await focusedStage()).toBe('binding');
	await page.keyboard.press('Tab');
	expect(await focusedStage()).toBe('layout');
	await page.keyboard.press('Tab');
	expect(await focusedStage()).toBe('preview');
	await page.keyboard.press('Shift+Tab');
	expect(await focusedStage()).toBe('layout');

	// Enter activates the focused stage.
	await page.keyboard.press('Enter');
	await expect(stage('layout')).toHaveAttribute('aria-current', 'step');
	await expect(page.getByTestId('canvas-grid')).toBeVisible();

	// Space activates it too, and reaches the stage after the default one.
	await page.keyboard.press('Shift+Tab');
	expect(await focusedStage()).toBe('binding');
	await page.keyboard.press('Space');
	await expect(stage('binding')).toHaveAttribute('aria-current', 'step');
	await expect(page.getByTestId('binding-panel')).toBeVisible();

	// The active state is marked in a way that does not depend on colour.
	await expect(stage('binding')).toHaveAttribute('aria-current', 'step');
	await expect(stage('layout')).not.toHaveAttribute('aria-current', 'step');
});

test('opens on the UI Layout stage', async ({ page }) => {
	// Data-model constraint: "Default on load and after a reload: `layout`".
	await expect(page.locator('[data-testid="workflow-stage"][data-stage-id="layout"]')).toHaveAttribute(
		'aria-current',
		'step'
	);
	await expect(page.getByTestId('canvas-grid')).toBeVisible();
});

test('the roadmap is the only navigation control, inside one bar', async ({ page }) => {
	// One top-level bar, with the stages inside it and nothing competing with it.
	await expect(page.locator('header')).toHaveCount(1);
	await expect(page.getByTestId('workflow-stage')).toHaveCount(3);

	const header = page.getByTestId('composer-header');
	await expect(header.locator('[data-testid="file-menu"]')).toBeVisible();
	await expect(header.locator('[data-testid="workflow-roadmap"]')).toBeVisible();
	await expect(header.locator('[data-testid="app-name"]')).toBeVisible();
	await expect(header.locator('[data-testid="save"]')).toBeVisible();

	// Selecting a stage moves the mark and the content together.
	await goToStage(page, 'binding');
	await expect(page.getByTestId('binding-panel')).toBeVisible();
	await expect(page.getByTestId('canvas-grid')).toHaveCount(0);
});

test('renders the demo definition with live API data in Preview', async ({ page }) => {
	await expect(page.locator('[data-testid="canvas-item"]')).toHaveCount(4);

	await goToStage(page, 'preview');
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
	await goToStage(page, 'preview');
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

	await goToStage(page, 'preview');

	await expect(page.getByTestId('binding-error')).toContainText(
		'API request failed: GET /api/mock/customer/profile responded 500'
	);
});

test('creates a new app from the File menu', async ({ page }) => {
	await page.getByTestId('file-menu').click();
	await page.getByTestId('file-new').click();

	await page.getByTestId('app-name-input').fill('Operations Console');
	await page.getByTestId('app-name-confirm').click();

	await expect(page.getByTestId('app-name')).toHaveText('Operations Console');
	await expect(page.getByTestId('canvas-grid')).toHaveCount(0);
	await expect(page.getByTestId('toolbar-message')).toContainText('Created "Operations Console".');

	// The new app is persisted immediately, so a reload reopens it.
	await page.reload();
	await expect(page.getByTestId('app-name')).toHaveText('Operations Console');
});

test('refuses to create an app without a name', async ({ page }) => {
	await page.getByTestId('file-menu').click();
	await page.getByTestId('file-new').click();
	await page.getByTestId('app-name-input').fill('   ');
	await page.getByTestId('app-name-confirm').click();

	// The dialog stays open and the open app is untouched.
	await expect(page.getByTestId('new-app-dialog')).toBeVisible();
	await expect(page.getByTestId('toolbar-message')).toHaveCount(0);

	await page.getByTestId('app-name-input').fill('Named App');
	await page.getByTestId('app-name-confirm').click();
	await expect(page.getByTestId('app-name')).toHaveText('Named App');
});

test('opens and switches between saved apps', async ({ page }) => {
	// Build a second app with a distinctive component.
	await page.getByTestId('palette-item').filter({ hasText: 'Button' }).click();
	await page.getByTestId('save').click();

	await page.getByTestId('file-menu').click();
	await page.getByTestId('file-new').click();
	await page.getByTestId('app-name-input').fill('Second App');
	await page.getByTestId('app-name-confirm').click();
	await expect(page.locator('[data-testid="canvas-item"]')).toHaveCount(0);

	// The library lists both apps.
	await page.getByTestId('file-menu').click();
	await page.getByTestId('file-open').click();
	await expect(page.getByTestId('open-app-item')).toHaveCount(2);

	await page
		.getByTestId('open-app-item')
		.filter({ hasText: 'Customer Risk Dashboard' })
		.click();

	await expect(page.getByTestId('app-name')).toHaveText('Customer Risk Dashboard');
	await expect(page.locator('[data-testid="canvas-item"]')).toHaveCount(5);
	await expect(page.getByTestId('toolbar-message')).toContainText('Opened "Customer Risk Dashboard".');
});

test('save as creates an independent copy', async ({ page }) => {
	await page.getByTestId('file-menu').click();
	await page.getByTestId('file-save-as').click();
	await page.getByTestId('app-name-input').fill('Dashboard Copy');
	await page.getByTestId('app-name-confirm').click();

	await expect(page.getByTestId('app-name')).toHaveText('Dashboard Copy');
	await expect(page.getByTestId('toolbar-message')).toContainText('Saved as "Dashboard Copy".');

	// The copy starts from the same definition.
	await page.getByTestId('file-menu').click();
	await page.getByTestId('file-open').click();
	await expect(page.getByTestId('open-app-item')).toHaveCount(2);
	await page.getByTestId('close-open-app').click();

	// Editing the copy leaves the original alone.
	await page.locator('[data-testid="canvas-item"]').first().click();
	await page.getByTestId('delete-component').click();
	await page.getByTestId('save').click();
	await expect(page.locator('[data-testid="canvas-item"]')).toHaveCount(3);

	await page.reload();
	await expect(page.getByTestId('app-name')).toHaveText('Dashboard Copy');
	await expect(page.locator('[data-testid="canvas-item"]')).toHaveCount(3);

	// The original still has all four demo components.
	await page.getByTestId('file-menu').click();
	await page.getByTestId('file-open').click();
	await page
		.getByTestId('open-app-item')
		.filter({ hasText: 'Customer Risk Dashboard' })
		.click();
	await expect(page.locator('[data-testid="canvas-item"]')).toHaveCount(4);
});

test('exports the app as a JSON download', async ({ page }) => {
	// The download starts inside the click handler, so the listener has to be
	// attached before clicking.
	const downloaded = page.waitForEvent('download');
	await page.getByTestId('file-menu').click();
	await page.getByTestId('file-export').click();

	const download = await downloaded;
	expect(download.suggestedFilename()).toBe('customer-risk-dashboard.uidc.json');

	const stream = await download.createReadStream();
	const chunks: Buffer[] = [];
	for await (const chunk of stream) chunks.push(chunk as Buffer);
	const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));

	expect(payload.format).toBe('uidc.app');
	expect(payload.name).toBe('Customer Risk Dashboard');
	expect(payload.definition.components).toHaveLength(4);
	expect(payload.definition.components[1].binding.api).toBe('customer.getProfile');
	expect(payload.context).toEqual({ customerId: 'CUST-1001' });

	await expect(page.getByTestId('toolbar-message')).toContainText('Exported "Customer Risk Dashboard".');
});

test('deletes an app from the library', async ({ page }) => {
	await page.getByTestId('file-menu').click();
	await page.getByTestId('file-new').click();
	await page.getByTestId('app-name-input').fill('Throwaway');
	await page.getByTestId('app-name-confirm').click();

	await page.getByTestId('file-menu').click();
	await page.getByTestId('file-open').click();
	await expect(page.getByTestId('open-app-item')).toHaveCount(2);

	await page.getByTestId('delete-app').first().click();
	await expect(page.getByTestId('open-app-item')).toHaveCount(1);
});

test('settings changes the grid width and the $context values', async ({ page }) => {
	await page.getByTestId('file-menu').click();
	await page.getByTestId('file-settings').click();
	await expect(page.getByTestId('settings-dialog')).toBeVisible();

	await page.getByTestId('settings-name').fill('Risk Console');
	await page.getByTestId('settings-columns').fill('6');
	await page.getByTestId('settings-apply').click();
	await expect(page.getByTestId('settings-dialog')).toBeHidden();

	await expect(page.getByTestId('app-name')).toHaveText('Risk Console');
	await expect(page.getByTestId('toolbar-message')).toContainText('Settings applied.');

	// The narrower grid is visible in the canvas.
	await page.getByTestId('palette-item').filter({ hasText: 'Text' }).click();
	const grid = page.getByTestId('canvas-grid');
	await expect(grid).toHaveAttribute('style', /repeat\(6,/);

	// Changing $context.customerId changes the data the mock API returns.
	await page.getByTestId('file-menu').click();
	await page.getByTestId('file-settings').click();
	// Settle on the dialog before touching its fields: reopening it immediately
	// after a previous dialog closed is a race under parallel load.
	await expect(page.getByTestId('settings-dialog')).toBeVisible();
	await page.getByTestId('settings-context-key').first().fill('customerId');
	await page.getByTestId('settings-context-value').first().fill('CUST-1002');
	await page.getByTestId('settings-apply').click();
	await expect(page.getByTestId('settings-dialog')).toBeHidden();

	await page.getByTestId('save').click();
	await goToStage(page, 'preview');
	await expect(page.getByTestId('runtime-root')).toContainText('Grace Hopper');
});

test('renders an empty app without crashing', async ({ page }) => {
	await page.getByTestId('file-menu').click();
	await page.getByTestId('file-new').click();
	await page.getByTestId('app-name-input').fill('Blank');
	await page.getByTestId('app-name-confirm').click();

	await expect(page.getByTestId('canvas-grid')).toHaveCount(0);
	await expect(page.getByText('Add one from the palette')).toBeVisible();

	await goToStage(page, 'preview');
	await expect(page.getByTestId('preview-title')).toHaveText('Blank');
	await expect(page.getByTestId('runtime-root')).toHaveCount(1);
});

test('lists e2e flows and their technology stacks', async ({ page }) => {
	await goToStage(page, 'binding');

	await expect(page.getByTestId('binding-panel')).toBeVisible();
	// Both demo flows, with every node listed.
	await expect(page.getByTestId('flow')).toHaveCount(2);
	await expect(page.getByTestId('flow-node')).toHaveCount(7);

	// Roles come from the node definition, and each node has a stack dropdown.
	await expect(page.locator('[data-testid="flow-node"][data-role="render"]').first()).toBeVisible();
	await expect(page.getByTestId('node-stack-select')).toHaveCount(7);

	// The shipped flow uses stacks that actually execute, so nothing blocks.
	await expect(page.getByTestId('flow-blocking')).toHaveCount(0);
	const nodeRow = (id: string) =>
		page.locator(`[data-testid="flow-node"][data-node-id="${id}"]`);
	await expect(nodeRow('render-preview')).toContainText('Svelte runtime');
	await expect(nodeRow('fetch-risk')).toContainText('REST over HTTP');
});

test('changing a node stack warns when the stack is not implemented', async ({ page }) => {
	await goToStage(page, 'binding');

	// The render node offers only renderer stacks, from the Stack Registry.
	const nodeRow = (id: string) =>
		page.locator(`[data-testid="flow-node"][data-node-id="${id}"]`);

	await nodeRow('render-preview').getByTestId('node-stack-select').click();
	await expect(page.getByTestId('node-stack-option')).toHaveCount(3);

	await page.locator('[data-testid="node-stack-option"][data-stack-id="json-render"]').click();
	await expect(nodeRow('render-preview')).toContainText(
		'json-render is declared but not implemented in this MVP'
	);
	await expect(page.getByTestId('flow-blocking')).toContainText('not implemented in this MVP');
	await expect(page.getByTestId('toolbar-message')).toContainText(
		'Render the definition now uses json-render.'
	);

	// The choice is stored on the app and survives a reload.
	await page.getByTestId('save').click();
	await page.reload();
	await goToStage(page, 'binding');
	await expect(nodeRow('render-preview')).toContainText('json-render');

	// A data node cannot be given a renderer stack.
	await nodeRow('fetch-risk').getByTestId('node-stack-select').click();
	await expect(page.getByTestId('node-stack-option')).toHaveCount(2);
	await expect(page.locator('[data-testid="node-stack-option"][data-stack-id="rest-http"]')).toBeVisible();
});

test('a node stack choice does not affect the rendered preview', async ({ page }) => {
	await goToStage(page, 'binding');
	await page.locator('[data-testid="flow-node"][data-node-id="render-preview"]').getByTestId('node-stack-select').click();
	await page.locator('[data-testid="node-stack-option"][data-stack-id="json-render"]').click();
	await expect(page.getByTestId('flow-blocking')).toBeVisible();

	// The MVP still renders with Svelte, so live data is still correct.
	await goToStage(page, 'preview');
	await expect(page.getByTestId('runtime-root')).toContainText('Ada Lovelace');
});

test('collapses and expands palette categories', async ({ page }) => {
	const layout = page.locator('[data-testid="palette-category"][data-category="Layout"]');
	const basic = page.locator('[data-testid="palette-category"][data-category="Basic"]');

	// Categories come from the Component Registry and start expanded.
	await expect(layout).toHaveAttribute('aria-expanded', 'true');
	await expect(basic).toHaveAttribute('aria-expanded', 'true');
	await expect(page.getByTestId('palette-item')).toHaveCount(4);

	await layout.click();
	await expect(layout).toHaveAttribute('aria-expanded', 'false');
	await expect(page.getByTestId('palette-item')).toHaveCount(3);
	await expect(page.locator('section[data-category="Layout"] [data-testid="palette-item"]')).toHaveCount(0);

	// Collapsing one category leaves the others alone.
	await expect(basic).toHaveAttribute('aria-expanded', 'true');
	await expect(page.locator('section[data-category="Basic"] [data-testid="palette-item"]')).toHaveCount(2);

	await layout.click();
	await expect(page.getByTestId('palette-item')).toHaveCount(4);
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
	await goToStage(page, 'preview');
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