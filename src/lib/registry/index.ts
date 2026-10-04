import { createApiRegistry } from './api-registry';
import { apiDefinitions } from './api-definitions';
import { createComponentRegistry } from './component-registry';
import { componentDefinitions } from './component-definitions';
import { createStackRegistry } from './stack-registry';
import { stackDefinitions } from './stack-definitions';
import type { RegistryLookup } from '../domain/definitions/ui-definition.schema';

/**
 * Application-level registry instances. Composer code depends on these objects
 * only — swapping in a different set of definitions requires no Composer change.
 */
export const componentRegistry = createComponentRegistry(componentDefinitions);
export const apiRegistry = createApiRegistry(apiDefinitions);
export const stackRegistry = createStackRegistry(stackDefinitions);

/**
 * The registries viewed through the port that domain validation depends on.
 * One place, so every validation call site passes the same contract.
 */
export const registryLookup: RegistryLookup = {
	hasComponent: (type) => componentRegistry.has(type),
	acceptsChildren: (type) => componentRegistry.acceptsChildren(type),
	hasApi: (id) => apiRegistry.has(id)
};