/** Small DOM helper: text goes through textContent, so config values never become HTML. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: { className?: string; text?: string; style?: Partial<CSSStyleDeclaration> } = {},
  children: Node[] = []
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (props.className) node.className = props.className
  if (props.text !== undefined) node.textContent = props.text
  if (props.style) Object.assign(node.style, props.style)
  for (const child of children) node.append(child)
  return node
}

/** Scoped stylesheet for one widget; Staffbase widgets render into the page DOM, not a shadow root. */
export function style(css: string): HTMLStyleElement {
  return el('style', { text: css })
}
