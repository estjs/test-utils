import { prettyDOM, within } from '@testing-library/dom';
import { type Component, nextTick } from 'essor';
import { getDocument } from './dom';
import { type FireEventOptions, dispatch, setValue } from './events';
import { type TextMatcher, getBySelector } from './queries';
import { type BoundUserEvent, boundUser } from './user-event';

export interface WrapperLike {
  element: Element;
  exists: () => boolean;
}

export type EmittedRecord = Record<string, unknown[][]>;

// ── Query-family types ───────────────────────────────────────────────────
//
// Each base (Text, Role, …) gets six variants, matching @testing-library/dom:
//   getByX        sync, throws if missing
//   getAllByX     sync, throws if empty
//   queryByX      sync, returns EmptyWrapper if missing  (was "findBy" in <0.0.2)
//   queryAllByX   sync, returns []          if empty     (was "findAllBy" in <0.0.2)
//   findByX       async, waits, throws on timeout
//   findAllByX    async, waits, throws on timeout
//
// The names now match RTL / Vue Test Utils conventions exactly.

type SingleQuery = (text: TextMatcher, options?: unknown) => DOMWrapper;
type ArrayQuery = (text: TextMatcher, options?: unknown) => DOMWrapper[];
type SingleAsyncQuery = (
  text: TextMatcher,
  options?: unknown,
  waitForOptions?: unknown,
) => Promise<DOMWrapper>;
type ArrayAsyncQuery = (
  text: TextMatcher,
  options?: unknown,
  waitForOptions?: unknown,
) => Promise<DOMWrapper[]>;

const BASES = [
  'Text',
  'Role',
  'LabelText',
  'PlaceholderText',
  'DisplayValue',
  'AltText',
  'Title',
  'TestId',
] as const;
type Base = (typeof BASES)[number];

type SyncSingleQueries = { [K in `queryBy${Base}` | `getBy${Base}`]: SingleQuery };
type SyncArrayQueries = { [K in `queryAllBy${Base}` | `getAllBy${Base}`]: ArrayQuery };
type AsyncSingleQueries = { [K in `findBy${Base}`]: SingleAsyncQuery };
type AsyncArrayQueries = { [K in `findAllBy${Base}`]: ArrayAsyncQuery };

export type QueryFamily = SyncSingleQueries &
  SyncArrayQueries &
  AsyncSingleQueries &
  AsyncArrayQueries;

// ── DOMWrapper ───────────────────────────────────────────────────────────

// Interface merge — the query-family methods are added on the prototype below.
// Declaring them through the interface gives us full IntelliSense without
// 48 manual `declare` lines on the class body. The generic `T` flows through
// to the class declaration so callers still see typed wrappers.
// eslint-disable-next-line unused-imports/no-unused-vars
export interface DOMWrapper<T extends Element = Element> extends QueryFamily {}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class DOMWrapper<T extends Element = Element> implements WrapperLike {
  constructor(public readonly element: T) {}

  exists(): boolean {
    return this.element.isConnected;
  }

  isVisible(): boolean {
    if (!this.element.isConnected) return false;
    if (typeof getComputedStyle !== 'function') return true;
    const style = getComputedStyle(this.element);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    if (style.opacity !== '' && Number(style.opacity) === 0) return false;
    return true;
  }

  /** True iff the element is disabled via native attr or `aria-disabled="true"`. */
  isDisabled(): boolean {
    const native = (this.element as unknown as HTMLInputElement).disabled;
    if (native) return true;
    return this.element.getAttribute('aria-disabled') === 'true';
  }

  /** True iff the element is a checkbox/radio in checked state, or has `aria-checked="true"`. */
  isChecked(): boolean {
    const el = this.element as unknown as HTMLInputElement;
    if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')) {
      return el.checked;
    }
    return this.element.getAttribute('aria-checked') === 'true';
  }

  /** Return the element's `outerHTML`, optionally pretty-printed via testing-library. */
  html(options: { pretty?: boolean } = {}): string {
    if (options.pretty) {
      return prettyDOM(this.element) || this.element.outerHTML;
    }
    return this.element.outerHTML;
  }

  text(): string {
    return this.element.textContent ?? '';
  }

  attributes(): Record<string, string>;
  attributes(name: string): string | undefined;
  attributes(name?: string): Record<string, string> | string | undefined {
    if (name) return this.element.getAttribute(name) ?? undefined;
    const result: Record<string, string> = {};
    for (const attr of this.element.attributes) result[attr.name] = attr.value;
    return result;
  }

  classes(): string[] {
    return Array.from(this.element.classList);
  }

  get user(): BoundUserEvent {
    return boundUser(() => this.element);
  }

  // ── selector-based queries ─────────────────────────────────────────────

  find<E extends Element = Element>(selector: string): DOMWrapper<E> {
    const found = this.element.querySelector(selector) as E | null;
    return found ? new DOMWrapper(found) : createEmptyWrapper(selector);
  }

  findAll<E extends Element = Element>(selector: string): DOMWrapper<E>[] {
    return Array.from(this.element.querySelectorAll(selector)).map((el) => new DOMWrapper(el as E));
  }

  get<E extends Element = Element>(selector: string): DOMWrapper<E> {
    return new DOMWrapper(getBySelector(this.element, selector) as E);
  }

  getAll<E extends Element = Element>(selector: string): DOMWrapper<E>[] {
    const elements = Array.from(this.element.querySelectorAll(selector));
    if (elements.length === 0) throw new Error(`Unable to find ${selector}`);
    return elements.map((el) => new DOMWrapper(el as E));
  }

  // ── events ─────────────────────────────────────────────────────────────

  async trigger(event: string, options?: FireEventOptions): Promise<void> {
    await dispatch(this.element, event, options);
  }

  async setValue(value: unknown): Promise<void> {
    await setValue(this.element, value);
  }
}

// ── ComponentWrapper ─────────────────────────────────────────────────────

export interface WrapperOptions<P extends Record<string, unknown> = Record<string, unknown>> {
  props?: P;
}

export class ComponentWrapper<
  T extends Element = Element,
  P extends Record<string, unknown> = Record<string, unknown>,
> extends DOMWrapper<T> {
  constructor(
    element: T,
    public readonly component: Component<P>,
    public readonly container: HTMLElement,
    private readonly unregister: (wrapper: ComponentWrapper<T, P>) => void,
    private readonly emittedRecord: EmittedRecord | null = null,
  ) {
    super(element);
  }

  setProps(props: Partial<P>): Promise<void> {
    // Preserve reactive getters from the existing prop bag, then overlay
    // partial keys. See Component.update() in essor for why descriptors
    // (not spreads) are required.
    const descriptors: PropertyDescriptorMap = {};
    for (const key of Object.getOwnPropertyNames(this.component.props)) {
      descriptors[key] = Object.getOwnPropertyDescriptor(this.component.props, key)!;
    }
    for (const key of Object.getOwnPropertyNames(props)) {
      descriptors[key] = Object.getOwnPropertyDescriptor(props, key)!;
    }
    this.component.update(Object.defineProperties({} as P, descriptors));
    return nextTick();
  }

  props(): Readonly<P> {
    // Snapshot: resolve any reactive getters into plain values.
    const result: Record<string, unknown> = {};
    for (const key of Object.getOwnPropertyNames(this.component.props)) {
      const descriptor = Object.getOwnPropertyDescriptor(this.component.props, key)!;
      result[key] = descriptor.get ? descriptor.get.call(this.component.props) : descriptor.value;
    }
    return result as Readonly<P>;
  }

  emitted(): EmittedRecord;
  emitted(name: string): unknown[][] | undefined;
  emitted(name?: string): EmittedRecord | unknown[][] | undefined {
    if (!this.emittedRecord) {
      if (name !== undefined) return undefined;
      return {};
    }
    if (name === undefined) return this.emittedRecord;
    return this.emittedRecord[name];
  }

  unmount(): void {
    this.component.destroy();
    this.unregister(this);
    this.container.remove();
  }
}

// ── EmptyWrapper ─────────────────────────────────────────────────────────

// Shared dummy element: every EmptyWrapper points at the same detached node so
// repeated misses don't allocate new DOM. `isConnected` is false, so inherited
// `exists()` correctly returns false, and prototype-injected query handlers
// can use that as a fast-fail signal (no 1s wait for findByX on an empty wrapper).
let sharedEmptyElement: Element | undefined;
function getSharedEmptyElement(): Element {
  if (!sharedEmptyElement) sharedEmptyElement = getDocument().createElement('div');
  return sharedEmptyElement;
}

class EmptyWrapper<T extends Element = Element> extends DOMWrapper<T> {
  constructor(private readonly selector: string) {
    super(getSharedEmptyElement() as T);
  }

  override exists(): boolean {
    return false;
  }
  override isVisible(): boolean {
    return false;
  }
  override isDisabled(): boolean {
    return false;
  }
  override isChecked(): boolean {
    return false;
  }
  override html(): string {
    return '';
  }
  override text(): string {
    return '';
  }

  override attributes(): Record<string, string>;
  override attributes(name: string): string | undefined;
  override attributes(name?: string): Record<string, string> | string | undefined {
    return name ? undefined : {};
  }

  override classes(): string[] {
    return [];
  }

  override find<E extends Element = Element>(selector: string): DOMWrapper<E> {
    return createEmptyWrapper(selector);
  }
  override findAll<E extends Element = Element>(): DOMWrapper<E>[] {
    return [];
  }
  override get<E extends Element = Element>(selector: string): DOMWrapper<E> {
    throw new Error(`Unable to find ${selector}`);
  }
  override getAll<E extends Element = Element>(selector: string): DOMWrapper<E>[] {
    throw new Error(`Unable to find ${selector}`);
  }

  override trigger(): Promise<void> {
    return Promise.reject(new Error(`Cannot trigger events on empty wrapper: ${this.selector}`));
  }
  override setValue(): Promise<void> {
    return Promise.reject(new Error(`Cannot set value on empty wrapper: ${this.selector}`));
  }
}

export function createEmptyWrapper<T extends Element = Element>(selector: string): DOMWrapper<T> {
  return new EmptyWrapper<T>(selector);
}

// ── Wrapper-style semantic query injection ───────────────────────────────
//
// For each of the eight BASES we install six prototype methods. The runtime
// just delegates to `within(this.element).<underlying>(…)` and re-wraps the
// returned Element(s) into DOMWrapper. Disconnected wrappers (EmptyWrapper or
// anything unmounted) short-circuit async findBy so they don't pay the
// asyncUtilTimeout penalty before failing.

type AnyArgs = unknown[];

function scoped(el: Element): Record<string, (...a: AnyArgs) => unknown> {
  return within(el as HTMLElement) as unknown as Record<string, (...a: AnyArgs) => unknown>;
}

for (const base of BASES) {
  const queryBy = `queryBy${base}` as const;
  const queryAllBy = `queryAllBy${base}` as const;
  const getBy = `getBy${base}` as const;
  const getAllBy = `getAllBy${base}` as const;
  const findBy = `findBy${base}` as const;
  const findAllBy = `findAllBy${base}` as const;

  Object.defineProperty(DOMWrapper.prototype, queryBy, {
    configurable: true,
    writable: true,
    value(this: DOMWrapper, ...args: AnyArgs): DOMWrapper {
      const el = scoped(this.element)[queryBy](...args) as Element | null;
      return el ? new DOMWrapper(el) : createEmptyWrapper(`${base}:${String(args[0])}`);
    },
  });

  Object.defineProperty(DOMWrapper.prototype, queryAllBy, {
    configurable: true,
    writable: true,
    value(this: DOMWrapper, ...args: AnyArgs): DOMWrapper[] {
      const list = scoped(this.element)[queryAllBy](...args) as Element[];
      return list.map((el) => new DOMWrapper(el));
    },
  });

  Object.defineProperty(DOMWrapper.prototype, getBy, {
    configurable: true,
    writable: true,
    value(this: DOMWrapper, ...args: AnyArgs): DOMWrapper {
      const el = scoped(this.element)[getBy](...args) as Element;
      return new DOMWrapper(el);
    },
  });

  Object.defineProperty(DOMWrapper.prototype, getAllBy, {
    configurable: true,
    writable: true,
    value(this: DOMWrapper, ...args: AnyArgs): DOMWrapper[] {
      const list = scoped(this.element)[getAllBy](...args) as Element[];
      return list.map((el) => new DOMWrapper(el));
    },
  });

  Object.defineProperty(DOMWrapper.prototype, findBy, {
    configurable: true,
    writable: true,
    async value(this: DOMWrapper, ...args: AnyArgs): Promise<DOMWrapper> {
      if (!this.element.isConnected) {
        throw new Error(`Unable to find element by ${base}: ${String(args[0])}`);
      }
      const el = (await (scoped(this.element)[findBy](...args) as Promise<Element>)) as Element;
      return new DOMWrapper(el);
    },
  });

  Object.defineProperty(DOMWrapper.prototype, findAllBy, {
    configurable: true,
    writable: true,
    async value(this: DOMWrapper, ...args: AnyArgs): Promise<DOMWrapper[]> {
      if (!this.element.isConnected) {
        throw new Error(`Unable to find elements by ${base}: ${String(args[0])}`);
      }
      const list = (await (scoped(this.element)[findAllBy](...args) as Promise<
        Element[]
      >)) as Element[];
      return list.map((el) => new DOMWrapper(el));
    },
  });
}
