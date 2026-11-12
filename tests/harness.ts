import type { BaseBlock, ExternalBlockDefinition, WidgetApi } from '@staffbase/widget-sdk'

let counter = 0

/** Minimal stand-in for Staffbase's base class; the real one adds editor chrome we don't need here. */
class FakeBase extends HTMLElement {
  renderBlock(): void {}
  renderBlockInEditor(): void {}
  unmountBlock(): void {}
}

/** Builds the widget element the way Staffbase would, then renders it into a container. */
export function mount(
  definition: ExternalBlockDefinition,
  attributes: Record<string, string>
): { element: BaseBlock; container: HTMLElement } {
  const Element = definition.blockDefinition.factory(
    FakeBase as unknown as new () => BaseBlock,
    {} as WidgetApi
  )
  // Each test defines a fresh tag: customElements cannot redefine a name.
  const tag = `${definition.blockDefinition.name}-t${++counter}`
  customElements.define(tag, Element)
  const element = document.createElement(tag) as BaseBlock
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value)
  const container = document.createElement('div')
  document.body.append(element)
  element.renderBlock(container)
  return { element, container }
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}
