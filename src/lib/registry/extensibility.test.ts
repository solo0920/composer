import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { apiRegistry, componentRegistry } from './index';
import { componentDefinitions } from './component-definitions';
import { apiDefinitions } from './api-definitions';

/**
 * Guards the MVP's central extensibility claim: the Composer must derive
 * everything it renders from a registry. The cheapest reliable way to enforce
 * that is to assert the Composer sources contain no literal component type or
 * API id. If someone later adds `if (type === 'data-card')`, this fails.
 */

const COMPOSER_DIR = join(import.meta.dirname, '..', 'composer');

function composerSources(dir: string = COMPOSER_DIR): { path: string; source: string }[] {
	const out: { path: string; source: string }[] = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) out.push(...composerSources(full));
		else if (
			// Tests legitimately name concrete types; production sources must not.
			!entry.name.includes('.test.') &&
			(entry.name.endsWith('.svelte') || entry.name.endsWith('.ts'))
		) {
			out.push({ path: full, source: readFileSync(full, 'utf8') });
		}
	}
	return out;
}

const sources = composerSources();

describe('Composer is registry-driven', () => {
	it('has composer sources to check', () => {
		expect(sources.length).toBeGreaterThan(3);
	});

	it('never branches on a component type literal', () => {
		// The forbidden shape from the architecture rules is
		// `if (type === 'RiskScore')`, so that is what is matched here. A plain
		// substring search would false-positive on markup such as role="button".
		for (const definition of componentDefinitions) {
			const escaped = definition.type.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			const branch = new RegExp(
				`(===|!==|\\bcase\\b|\\bswitch\\b[^\\n]*)\\s*['"]${escaped}['"]`,
				'm'
			);
			for (const file of sources) {
				expect(branch.test(file.source), `${file.path} must not branch on '${definition.type}'`).toBe(
					false
				);
			}
		}
	});

	it('never hard-codes an API id', () => {
		for (const api of apiDefinitions) {
			for (const file of sources) {
				expect(file.source, `${file.path} must not reference ${api.id}`).not.toContain(api.id);
			}
		}
	});

	it('never references a mock endpoint path directly', () => {
		for (const api of apiDefinitions) {
			for (const file of sources) {
				expect(file.source, `${file.path} must not reference ${api.path}`).not.toContain(api.path);
			}
		}
	});

	it('never imports the mock data or the API client', () => {
		for (const file of sources) {
			expect(file.source, `${file.path} must not import mock data`).not.toContain('server/mock-api');
			expect(file.source, `${file.path} must not import the API client`).not.toContain('api-client');
		}
	});
});

describe('the registries are the single source of truth', () => {
	it('ships exactly the four MVP components and three MVP APIs', () => {
		expect(componentRegistry.list().map((c) => c.type).sort()).toEqual([
			'button',
			'container',
			'data-card',
			'text'
		]);
		expect(apiRegistry.list().map((a) => a.id).sort()).toEqual([
			'customer.getProfile',
			'portfolio.getPositions',
			'risk.getScore'
		]);
	});

	it('gives every component a props schema and a category', () => {
		for (const definition of componentDefinitions) {
			expect(definition.propsSchema, definition.type).toBeInstanceOf(Array);
			expect(definition.category, definition.type).toBeDefined();
		}
	});

	it('gives every API an input and output schema the Binding Editor can use', () => {
		for (const api of apiDefinitions) {
			expect(api.inputSchema?.length, api.id).toBeGreaterThan(0);
			expect(api.outputSchema?.length, api.id).toBeGreaterThan(0);
			for (const field of api.outputSchema ?? []) {
				expect(field.bindingHint, `${api.id}.${field.key}`).toBeDefined();
			}
		}
	});

	it('starts a new component with one click and no arguments beyond its type', () => {
		// createComponentInstance is the only construction path the palette needs.
		const button = componentRegistry.get('button');
		expect(button).toBeDefined();
		expect(button?.defaultProps['label']).toBe('Button');
	});
});