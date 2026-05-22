export function getDocument(): Document {
  if (typeof document === 'undefined') {
    throw new TypeError('@estjs/test-utils requires a DOM-like test environment');
  }
  return document;
}

export function getDocumentBody(): HTMLElement {
  const body = getDocument().body;
  if (!body) {
    throw new Error('@estjs/test-utils could not find document.body');
  }
  return body;
}

export function resolveElement(target: Element | string): Element {
  if (typeof target !== 'string') return target;

  const element = getDocument().querySelector(target);
  if (!element) {
    throw new Error(`Unable to find ${target}`);
  }
  return element;
}

export function normalizeText(text: string): string {
  return text.replaceAll(/\s+/g, ' ').trim();
}

export function describeTarget(target: unknown): string {
  if (typeof target === 'string') return target;
  if (target instanceof Element) {
    const id = target.id ? `#${target.id}` : '';
    const classes = target.className
      ? `.${String(target.className).trim().replaceAll(/\s+/g, '.')}`
      : '';
    return `${target.tagName.toLowerCase()}${id}${classes}`;
  }
  return String(target);
}
