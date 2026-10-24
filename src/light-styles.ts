/**
 * Styles for a component without a shadow root, whose content stays in the page (fields, nav, tabs).
 * Returns a function that adopts `css` into the document or shadow root an element sits in, once
 * per root. Call it from `connectedCallback` with `this.getRootNode()`.
 */
export function lightStyles(css: string): (root: Node) => void {
  let sheet: CSSStyleSheet | undefined;
  const styled = new WeakSet<Node>();
  return (root) => {
    // An element not yet in a document or shadow root has nothing to adopt into.
    if (!("adoptedStyleSheets" in root) || styled.has(root)) return;
    if (!sheet) {
      sheet = new CSSStyleSheet();
      sheet.replaceSync(css);
    }
    const target = root as Document | ShadowRoot;
    target.adoptedStyleSheets = [...target.adoptedStyleSheets, sheet];
    styled.add(root);
  };
}
