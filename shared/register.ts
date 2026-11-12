import type { ExternalBlockDefinition } from '@staffbase/widget-sdk'

/**
 * Registers a widget with the Staffbase page. Outside Staffbase (local demo,
 * tests) `window.defineBlock` is missing, so registration is skipped quietly.
 */
export function register(definition: ExternalBlockDefinition): void {
  if (typeof window.defineBlock === 'function') window.defineBlock(definition)
}
