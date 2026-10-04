import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { delimiter } from 'node:path';

// Some sandboxes and CI images lack the shared libraries Playwright's Chromium
// links against (libnspr4, libnss3, libasound). `scripts/setup-e2e.sh` unpacks
// them into .playwright-libs/ without root. Appending it to process.env here
// covers both the browser processes Playwright launches and the web server,
// so no manual LD_LIBRARY_PATH export is needed.
const localLibs = fileURLToPath(new URL('./.playwright-libs/root/usr/lib/x86_64-linux-gnu', import.meta.url));
if (existsSync(localLibs) && !(process.env.LD_LIBRARY_PATH ?? '').includes(localLibs)) {
	process.env.LD_LIBRARY_PATH = `${localLibs}${delimiter}${process.env.LD_LIBRARY_PATH ?? ''}`;
}

export default defineConfig({
	testDir: 'e2e',
	fullyParallel: true,
	reporter: process.env.CI ? 'line' : [['list']],
	use: {
		baseURL: 'http://localhost:4173',
		trace: 'on-first-retry'
	},
	webServer: {
		command: 'npm run build && npm run preview -- --port 4173',
		port: 4173,
		reuseExistingServer: !process.env.CI,
		timeout: 180_000
	},
	projects: [
		{
			name: 'chromium',
			// Use the full Chromium build rather than chrome-headless-shell: the
			// lightweight shell does not implement downloads, and the Export flow
			// is only verifiable end to end with real browser semantics.
			use: { ...devices['Desktop Chrome'], channel: 'chromium' }
		}
	]
});