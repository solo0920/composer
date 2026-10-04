import { describe, expect, it } from 'vitest';
import {
	appendComponent,
	collectComponentIds,
	createComponentInstance,
	createUIDefinition,
	findComponentById,
	measureDepth,
	removeComponentById,
	replaceComponentById,
	resolveLayout,
	updateLayout,
	updateProps,
	walkComponents
} from './ui-definition.factory';
import { componentDefinitions } from '../../registry/component-definitions';
import type { ComponentDefinition } from '../components/component-definition';

const text = componentDefinitions.find((c) => c.type === 'text') as ComponentDefinition;
const button = componentDefinitions.find((c) => c.type === 'button') as ComponentDefinition;
const container = componentDefinitions.find((c) => c.type === 'container') as ComponentDefinition;

function tree() {
	const definition = createUIDefinition('D', 'def-1');
	definition.components = [
		{
			...createComponentInstance(container, 'box'),
			children: [createComponentInstance(text, 'inner'), createComponentInstance(button, 'btn')]
		},
		createComponentInstance(text, 'outer')
	];
	return definition;
}

describe('createUIDefinition', () => {
	it('creates an empty definition with the default 12-column grid', () => {
		expect(createUIDefinition('Empty', 'def-1')).toEqual({
			id: 'def-1',
			version: 1,
			name: 'Empty',
			layout: { type: 'grid', columns: 12 },
			components: []
		});
	});
});

describe('createComponentInstance', () => {
	it('seeds props and layout from the registry definition', () => {
		expect(createComponentInstance(text, 'c1')).toEqual({
			id: 'c1',
			type: 'text',
			props: { text: 'Text', variant: 'heading' },
			layout: { column: 1, span: 12 }
		});
	});

	it('does not share the default props object between instances', () => {
		const a = createComponentInstance(text, 'c1');
		const b = createComponentInstance(text, 'c2');
		a.props['text'] = 'changed';
		expect(b.props['text']).toBe('Text');
	});

	it('clamps a default span wider than the grid', () => {
		expect(createComponentInstance(text, 'c1', 4).layout).toEqual({ column: 1, span: 4 });
	});

	it('clamps a default column that would overflow the grid', () => {
		const narrow = { ...text, defaultLayout: { column: 1, span: 4 } };
		expect(createComponentInstance(narrow, 'c1', 4).layout).toEqual({ column: 1, span: 4 });
		const offset = { ...text, defaultLayout: { column: 3, span: 4 } };
		expect(createComponentInstance(offset, 'c1', 4).layout).toEqual({ column: 1, span: 4 });
	});

	it('creates no children key by default', () => {
		expect(createComponentInstance(container, 'c1').children).toBeUndefined();
	});
});

describe('walkComponents', () => {
	it('visits parents before children, left to right, with depth', () => {
		const visited: [string, number][] = [];
		walkComponents(tree(), ({ instance, depth }) => visited.push([instance.id, depth]));
		expect(visited).toEqual([
			['box', 0],
			['inner', 1],
			['btn', 1],
			['outer', 0]
		]);
	});

	it('handles a flat definition', () => {
		const visited: string[] = [];
		walkComponents(
			{ ...createUIDefinition('D', 'd'), components: [createComponentInstance(text, 'a')] },
			({ instance }) => visited.push(instance.id)
		);
		expect(visited).toEqual(['a']);
	});

	it('does not overflow the stack on a pathologically deep tree', () => {
		let node = createComponentInstance(container, 'leaf');
		for (let i = 0; i < 5000; i += 1) {
			node = { ...createComponentInstance(container, `n${i}`), children: [node] };
		}
		const definition = { ...createUIDefinition('Deep', 'd'), components: [node] };

		let count = 0;
		expect(() => walkComponents(definition, () => (count += 1))).not.toThrow();
		expect(count).toBe(5001);
	});
});

describe('findComponentById', () => {
	it('finds a top-level component', () => {
		expect(findComponentById(tree(), 'outer')?.type).toBe('text');
	});

	it('finds a nested component', () => {
		expect(findComponentById(tree(), 'btn')?.type).toBe('button');
	});

	it('returns undefined for null or unknown ids', () => {
		expect(findComponentById(tree(), null)).toBeUndefined();
		expect(findComponentById(tree(), 'nope')).toBeUndefined();
	});
});

describe('collectComponentIds / measureDepth', () => {
	it('collects ids across the whole tree', () => {
		expect(collectComponentIds(tree())).toEqual(['box', 'inner', 'btn', 'outer']);
	});

	it('reports depth 1 for a flat definition', () => {
		const definition = { ...createUIDefinition('D', 'd'), components: [createComponentInstance(text, 'a')] };
		expect(measureDepth(definition)).toBe(1);
		expect(measureDepth(createUIDefinition('D', 'd'))).toBe(0);
	});

	it('reports the deepest nesting level', () => {
		expect(measureDepth(tree())).toBe(2);
	});
});

describe('replaceComponentById', () => {
	it('replaces a top-level instance without mutating the original', () => {
		const definition = tree();
		const next = replaceComponentById(definition, 'outer', (i) => updateProps(i, { text: 'New' }));

		expect(findComponentById(next, 'outer')?.props['text']).toBe('New');
		expect(findComponentById(definition, 'outer')?.props['text']).toBe('Text');
	});

	it('replaces a nested instance and rebuilds only its ancestors', () => {
		const definition = tree();
		const next = replaceComponentById(definition, 'btn', (i) => updateProps(i, { label: 'Go' }));

		expect(findComponentById(next, 'btn')?.props['label']).toBe('Go');
		expect(findComponentById(next, 'box')?.children?.[0].id).toBe('inner');
		expect(definition.components[0].children?.[1].props['label']).toBe('Button');
	});

	it('returns the same object when the id is not found', () => {
		const definition = tree();
		expect(replaceComponentById(definition, 'nope', (i) => i)).toBe(definition);
	});
});

describe('removeComponentById', () => {
	it('removes a top-level component', () => {
		const definition = removeComponentById(tree(), 'outer');
		expect(collectComponentIds(definition)).toEqual(['box', 'inner', 'btn']);
	});

	it('removes a nested component and keeps its siblings', () => {
		const definition = removeComponentById(tree(), 'inner');
		expect(collectComponentIds(definition)).toEqual(['box', 'btn', 'outer']);
	});

	it('leaves the tree untouched for an unknown id', () => {
		const definition = tree();
		expect(removeComponentById(definition, 'nope').components).toHaveLength(2);
	});

it('keeps a surviving sibling binding intact when a child is removed', () => {
		const definition = {
			...createUIDefinition('D', 'd'),
			components: [
				{
					...createComponentInstance(container, 'box'),
					binding: { api: 'risk.getScore', output: { score: '$.score' } },
					children: [
						createComponentInstance(text, 'a'),
						createComponentInstance(text, 'b')
					]
				}
			]
		};

		const next = removeComponentById(definition, 'a');
		expect(next.components[0].binding).toEqual({ api: 'risk.getScore', output: { score: '$.score' } });
		expect(next.components[0].props).toEqual(definition.components[0].props);
	});

	it('drops the children key when the last child is removed', () => {
		const definition = {
			...createUIDefinition('D', 'd'),
			components: [
				{ ...createComponentInstance(container, 'box'), children: [createComponentInstance(text, 'only')] }
			]
		};

		const next = removeComponentById(definition, 'only');
		expect(next.components[0].children).toBeUndefined();
		expect(JSON.stringify(next)).not.toContain('"children"');
	});
});

describe('appendComponent', () => {
	it('appends at the root when parentId is null', () => {
		const definition = appendComponent(tree(), createComponentInstance(text, 'new'), null);
		expect(findComponentById(definition, 'new')).toBeDefined();
		expect(definition.components).toHaveLength(3);
	});

	it('appends into a container', () => {
		const definition = appendComponent(tree(), createComponentInstance(text, 'nested'), 'box');
		expect(definition.components[0].children?.map((c) => c.id)).toEqual(['inner', 'btn', 'nested']);
	});

	it('returns the tree unchanged when the parent does not exist', () => {
		const definition = tree();
		expect(appendComponent(definition, createComponentInstance(text, 'x'), 'nope')).toBe(definition);
	});
});

describe('updateProps', () => {
	it('merges a patch and returns a new instance', () => {
		const instance = createComponentInstance(text, 'c1');
		expect(updateProps(instance, { text: 'Hello' }).props).toEqual({
			text: 'Hello',
			variant: 'heading'
		});
		expect(instance.props['text']).toBe('Text');
	});

	it('can write a number and a boolean, not just strings', () => {
		expect(updateProps(createComponentInstance(text, 'c1'), { size: 12, visible: true }).props).toEqual({
			text: 'Text',
			variant: 'heading',
			size: 12,
			visible: true
		});
	});
});

describe('updateLayout', () => {
	it('updates column and span', () => {
		expect(updateLayout(createComponentInstance(text, 'c1'), { column: 3, span: 4 }, 12).layout).toEqual({
			column: 3,
			span: 4
		});
	});

	it('clamps span and column into the grid', () => {
		const instance = createComponentInstance(text, 'c1');
		expect(updateLayout(instance, { column: 11, span: 6 }, 12).layout).toEqual({ column: 7, span: 6 });
		expect(updateLayout(instance, { column: 0, span: 0 }, 12).layout).toEqual({ column: 1, span: 1 });
	});

	it('preserves an explicit row and the children subtree', () => {
		const node = { ...createComponentInstance(container, 'c1'), children: [createComponentInstance(text, 'kid')] };
		expect(updateLayout(node, { column: 1, span: 4, row: 3 }, 12).layout).toEqual({
			column: 1,
			span: 4,
			row: 3
		});
		expect(updateLayout(node, { column: 1, span: 4 }, 12).children).toHaveLength(1);
	});
});

describe('resolveLayout', () => {
	it('defaults to a full-width first-column placement', () => {
		expect(resolveLayout(undefined, 12)).toEqual({ column: 1, span: 12 });
	});
});