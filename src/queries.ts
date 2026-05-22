// Selector-based query helpers + internal bridges to @testing-library/dom.
//
// This package exposes a wrapper-only style — the standalone testing-library
// queries (`getByX(container, ...)`, `screen`, `within`, etc.) live inside
// `@testing-library/dom` and are wrapped by `DOMWrapper` methods. Callers
// should reach for `wrapper.getByRole(...)` and friends instead of importing
// these from the package root.

import { queries as tlQueries } from '@testing-library/dom';
import { describeTarget } from './dom';

/** Same matcher type @testing-library/dom uses internally. */
export type { Matcher as TextMatcher } from '@testing-library/dom';

/** Re-exported internally so `wrapper.ts` can drive every ByX variant. */
export const queries = tlQueries;

function describeWhere(container: ParentNode): string {
  return container instanceof Element ? ` in ${describeTarget(container)}` : '';
}

export function getBySelector(container: ParentNode, selector: string): Element {
  const element = container.querySelector(selector);
  if (!element) {
    throw new Error(`Unable to find ${describeTarget(selector)}${describeWhere(container)}`);
  }
  return element;
}

export function queryBySelector(container: ParentNode, selector: string): Element | null {
  return container.querySelector(selector);
}

export function getAllBySelector(container: ParentNode, selector: string): Element[] {
  const elements = Array.from(container.querySelectorAll(selector));
  if (elements.length === 0) {
    throw new Error(`Unable to find ${describeTarget(selector)}${describeWhere(container)}`);
  }
  return elements;
}

export function queryAllBySelector(container: ParentNode, selector: string): Element[] {
  return Array.from(container.querySelectorAll(selector));
}
