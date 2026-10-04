import { createApiRegistry } from './api-registry';
import { apiDefinitions } from './api-definitions';
import { createComponentRegistry } from './component-registry';
import { componentDefinitions } from './component-definitions';

/**
 * Application-level registry instances. Composer code depends on these objects
 * only — swapping in a different set of definitions requires no Composer change.
 */
export const componentRegistry = createComponentRegistry(componentDefinitions);
export const apiRegistry = createApiRegistry(apiDefinitions);