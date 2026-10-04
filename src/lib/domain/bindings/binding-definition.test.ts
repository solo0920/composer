import { describe, expect, it } from 'vitest';
import {
	CONTEXT_PREFIX,
	describeExpression,
	parseContextRef,
	parsePayloadRef,
	readPath
} from './binding-definition';

describe('parseContextRef', () => {
	it('reads the key from a context reference', () => {
		expect(parseContextRef('$context.customerId')).toBe('customerId');
	});

	it('rejects anything that is not a context reference', () => {
		expect(parseContextRef('$.name')).toBeUndefined();
		expect(parseContextRef('customerId')).toBeUndefined();
		expect(parseContextRef(CONTEXT_PREFIX)).toBeUndefined();
	});
});

describe('parsePayloadRef', () => {
	it('reads a single-segment payload reference', () => {
		expect(parsePayloadRef('$.name')).toEqual(['name']);
	});

	it('reads a nested payload reference', () => {
		expect(parsePayloadRef('$.positions.0.symbol')).toEqual(['positions', '0', 'symbol']);
	});

	it('rejects malformed references', () => {
		expect(parsePayloadRef('$')).toBeUndefined();
		expect(parsePayloadRef('$.')).toBeUndefined();
		expect(parsePayloadRef('$.a..b')).toBeUndefined();
		expect(parsePayloadRef('$context.x')).toBeUndefined();
	});
});

describe('readPath', () => {
	const payload = { name: 'Ada', profile: { tier: 'gold' }, positions: [{ symbol: 'ACME' }] };

	it('reads a top-level key', () => {
		expect(readPath(payload, ['name'])).toBe('Ada');
	});

	it('reads a nested key', () => {
		expect(readPath(payload, ['profile', 'tier'])).toBe('gold');
	});

	it('reads through an array index', () => {
		expect(readPath(payload, ['positions', '0', 'symbol'])).toBe('ACME');
	});

	it('returns undefined for a non-integer or negative array index', () => {
		expect(readPath(payload, ['positions', 'first', 'symbol'])).toBeUndefined();
		expect(readPath(payload, ['positions', '-1'])).toBeUndefined();
	});

	it('returns undefined for a missing key', () => {
		expect(readPath(payload, ['nope'])).toBeUndefined();
	});

	it('returns undefined when an intermediate value is not an object', () => {
		expect(readPath(payload, ['name', 'deeper'])).toBeUndefined();
	});
});

describe('describeExpression', () => {
	it('accepts valid expressions', () => {
		expect(describeExpression('$context.customerId')).toBe('$context.customerId');
		expect(describeExpression('  $.name  ')).toBe('$.name');
	});

	it('explains an empty expression', () => {
		expect(describeExpression('  ')).toBe('expression is empty');
	});

	it('explains an unsupported expression', () => {
		expect(describeExpression('name')).toBe(
			'unsupported expression "name" (expected $context.<key> or $.<path>)'
		);
	});
});