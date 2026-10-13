export async function inspectLayout(page) {
  return page.evaluate(() => {
    const paper = '[data-print-document], [data-accounting-print-root], [data-mobile-pdf-root], .a4-page-card, .lasik-sheet, .specialist-sheet, .sheet-followup-body, .prescription-root, .clinical-report-root, .medical-report-page, .patient-summary-print-root, .final-report-sheet, .offdays-paper, .offdays-en-paper, .prepost-paper, .mcr-paper, .refraction-print-card, .printable-report-sheet';
    const excluded = `${paper}, [data-app-bottom-nav], [role="tooltip"], [data-sonner-toaster], [aria-hidden="true"], script, style, svg`;
    const root = document.querySelector('[role="dialog"][data-state="open"]') ?? document.querySelector('.selrs-app-content') ?? document.querySelector('main') ?? document.querySelector('#root') ?? document.body;
    const describe = element => `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}.${[...element.classList].slice(0, 4).join('.')}`;
    const visible = element => {
      if (element.closest(excluded)) return false;
      const closedDetails = element.closest('details:not([open])');
      if (closedDetails && !closedDetails.querySelector(':scope > summary')?.contains(element)) return false;
      for (let parent = element; parent; parent = parent.parentElement) {
        const style = getComputedStyle(parent);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0' || parent.hasAttribute('hidden')) return false;
      }
      return element.getClientRects().length > 0;
    };
    const clip = (box, element) => {
      const result = { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
      for (let parent = element; parent; parent = parent.parentElement) {
        const style = getComputedStyle(parent), bounds = parent.getBoundingClientRect();
        if (['auto', 'scroll', 'hidden', 'clip'].includes(style.overflowX)) { result.left = Math.max(result.left, bounds.left); result.right = Math.min(result.right, bounds.right); }
        if (['auto', 'scroll', 'hidden', 'clip'].includes(style.overflowY)) { result.top = Math.max(result.top, bounds.top); result.bottom = Math.min(result.bottom, bounds.bottom); }
      }
      return result;
    };
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const text = [];
    while (walker.nextNode()) {
      const node = walker.currentNode, element = node.parentElement;
      if (!node.textContent.trim() || !visible(element)) continue;
      const range = document.createRange(); range.selectNodeContents(node);
      for (const box of range.getClientRects()) {
        const bounds = clip(box, element);
        if (bounds.right - bounds.left > 2 && bounds.bottom - bounds.top > 3) text.push({ node, element, text: node.textContent.trim().slice(0, 80), bounds, rawBounds: box });
      }
    }
    const overlap = (a, b) => ({ width: Math.min(a.right, b.right) - Math.max(a.left, b.left), height: Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) });
    const layerCache = new WeakMap();
    const layerFor = element => {
      if (layerCache.has(element)) return layerCache.get(element);
      for (let parent = element; parent; parent = parent.parentElement) {
        const style = getComputedStyle(parent);
        if (['sticky', 'fixed'].includes(style.position) && Number(style.zIndex) >= 10 && style.backgroundColor !== 'rgba(0, 0, 0, 0)') {
          layerCache.set(element, parent); return parent;
        }
      }
      layerCache.set(element, null); return null;
    };
    const separateLayer = (a, b) => {
      const x = layerFor(a), y = layerFor(b);
      return (x && !x.contains(b)) || (y && !y.contains(a));
    };
    const collisions = [];
    for (let a = 0; a < text.length; a++) for (let b = a + 1; b < text.length; b++) {
      const x = text[a], y = text[b];
      if (x.element.contains(y.element) || y.element.contains(x.element)) continue;
      if (separateLayer(x.element, y.element)) continue;
      const sharedControl = x.element.closest('button, a, label, [role="tab"]');
      if (sharedControl?.contains(y.element)) continue;
      const intersection = overlap(x.bounds, y.bounds);
      if (intersection.width > 3 && intersection.height > 5) collisions.push({ a: x.text, b: y.text, elementA: describe(x.element), elementB: describe(y.element), ...intersection });
    }
    const tabEscapes = [];
    for (const tabs of root.querySelectorAll('[role="tablist"], nav[aria-label="أقسام الوحدة"]')) {
      if (!visible(tabs)) continue;
      const bounds = tabs.getBoundingClientRect();
      for (const item of tabs.querySelectorAll(':scope > button, :scope > a, :scope > label')) {
        if (!visible(item)) continue;
        const box = item.getBoundingClientRect();
        if (box.top < bounds.top - 2 || box.bottom > bounds.bottom + 2) tabEscapes.push({ text: item.textContent.trim(), element: describe(tabs), stripHeight: bounds.height, itemHeight: box.height });
      }
    }
    const clippedButtons = [];
    for (const button of root.querySelectorAll('button, [role="tab"]')) {
      if (!visible(button)) continue;
      const bounds = button.getBoundingClientRect();
      for (const item of text.filter(item => button.contains(item.element))) {
        if (getComputedStyle(item.element).textOverflow === 'ellipsis') continue;
        if (item.element.closest('[data-slot="select-value"]')) continue;
        if (item.rawBounds.left < bounds.left - 2 || item.rawBounds.right > bounds.right + 2 || item.rawBounds.top < bounds.top - 2 || item.rawBounds.bottom > bounds.bottom + 2) clippedButtons.push({ text: item.text, element: describe(button) });
      }
    }
    const fieldCollisions = [];
    for (const control of root.querySelectorAll('input:not([type="hidden"]), select, textarea')) {
      if (!visible(control)) continue;
      const bounds = clip(control.getBoundingClientRect(), control);
      for (const item of text) {
        if (control.contains(item.element) || control.closest('button, a')?.contains(item.element)) continue;
        if (separateLayer(item.element, control)) continue;
        if (item.element.parentElement === control.parentElement && getComputedStyle(item.element).position === 'absolute') continue;
        const intersection = overlap(item.bounds, bounds);
        if (intersection.width > 4 && intersection.height > 6) fieldCollisions.push({ text: item.text, element: describe(item.element), field: describe(control), ...intersection });
      }
    }
    return { overflow: document.documentElement.scrollWidth > innerWidth + 1, viewport: innerWidth, pageWidth: document.documentElement.scrollWidth, collisions, fieldCollisions, tabEscapes, clippedButtons, textCount: text.length };
  });
}
