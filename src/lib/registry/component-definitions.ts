import type { ComponentDefinition } from '../domain/components/component-definition';
import { textField } from '../domain/fields';

/**
 * MVP component catalogue. Four components, no more: enough to prove the
 * registry-driven Composer without turning into a component library.
 */
export const componentDefinitions: ComponentDefinition[] = [
	{
		type: 'container',
		label: 'Container',
		description: 'A boxed region that groups other components.',
		category: 'Layout',
		propsSchema: [
			textField('title', 'Title', { placeholder: 'Optional heading' }),
			textField('subtitle', 'Subtitle', { placeholder: 'Optional subheading' })
		],
		defaultProps: { title: '', subtitle: '' },
		defaultLayout: { column: 1, span: 12 }
	},
	{
		type: 'text',
		label: 'Text',
		description: 'A heading or paragraph of static copy.',
		category: 'Basic',
		propsSchema: [
			textField('text', 'Text', { placeholder: 'Display text' }),
			textField('variant', 'Variant', { placeholder: 'heading | subtitle | body | caption' })
		],
		defaultProps: { text: 'Text', variant: 'heading' },
		defaultLayout: { column: 1, span: 12 }
	},
	{
		type: 'button',
		label: 'Button',
		description: 'An action trigger. No handler in this MVP.',
		category: 'Basic',
		propsSchema: [
			textField('label', 'Label', { placeholder: 'Button label' }),
			textField('variant', 'Variant', { placeholder: 'default | secondary | outline | ghost | destructive' })
		],
		defaultProps: { label: 'Button', variant: 'default' },
		defaultLayout: { column: 1, span: 3 }
	},
	{
		type: 'data-card',
		label: 'DataCard',
		description: 'Renders the key/value pairs resolved from its binding output.',
		category: 'Data',
		propsSchema: [
			textField('title', 'Title', { placeholder: 'Card heading' }),
			textField('emptyText', 'Empty text', { placeholder: 'Shown while loading or unbound' })
		],
		defaultProps: { title: 'Data', emptyText: 'No data' },
		defaultLayout: { column: 1, span: 6 },
		displaysBindingData: true
	}
];