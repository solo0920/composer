/**
 * Self-describing scalar field used by both registries to describe which
 * fields a UI form should render for a component's props or an API's
 * input/output. This is the single mechanism that keeps the Composer and the
 * Binding Editor registry-driven instead of hard-coded.
 */
export type FieldType = 'text' | 'textarea' | 'number' | 'boolean';

export type FieldDescriptor = {
	key: string;
	label: string;
	type: FieldType;
	placeholder?: string;
	help?: string;
	/** For data-driven fields, the expression the value is read from. */
	bindingHint?: string;
};

export function textField(
	key: string,
	label: string,
	extra: Omit<FieldDescriptor, 'key' | 'label' | 'type'> = {}
): FieldDescriptor {
	return { key, label, type: 'text', ...extra };
}

export function textareaField(
	key: string,
	label: string,
	extra: Omit<FieldDescriptor, 'key' | 'label' | 'type'> = {}
): FieldDescriptor {
	return { key, label, type: 'textarea', ...extra };
}

export function numberField(
	key: string,
	label: string,
	extra: Omit<FieldDescriptor, 'key' | 'label' | 'type'> = {}
): FieldDescriptor {
	return { key, label, type: 'number', ...extra };
}