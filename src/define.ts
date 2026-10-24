/**
 * Registers a `gb-` custom element once. The site and the host tool can both end up importing a
 * component twice (two bundles, or a page script plus a lazy one), and a second
 * `customElements.define` for the same name throws, so a repeat is skipped instead.
 */
export function defineElement(name: `gb-${string}`, element: CustomElementConstructor): void {
  if (!customElements.get(name)) customElements.define(name, element);
}
