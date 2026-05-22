import { type ComponentFn, type ComponentProps, createComponent, provide } from 'essor';
import { getDocument, getDocumentBody, resolveElement } from './dom';
import { flushPromises } from './wait-for';
import { ComponentWrapper, type EmittedRecord } from './wrapper';

export type SlotValue = string | Node | (() => string | Node);

/**
 * Per-slot content for `MountOptions.children`. `default` is mapped to
 * essor's `props.children`; every other key becomes `props.<key>`.
 * Values may be a string (parsed as HTML), a Node (used as-is), or a
 * factory function producing either.
 */
export interface ChildrenOption {
  /** Default slot — mapped to essor's `props.children`. */
  default?: SlotValue;
  /** Named slot — mapped to `props.<name>`. */
  [name: string]: SlotValue | undefined;
}

/** Symbol used by `inject(MOCKS_KEY)` to retrieve `global.mocks`. */
export const MOCKS_KEY: unique symbol = Symbol.for('@estjs/test-utils:mocks');

export interface GlobalMountOptions {
  /** Values to expose via essor's provide/inject inside the mounted tree. */
  provide?: Map<string | symbol, unknown> | Record<string, unknown>;
  /**
   * An object accessible via `inject(MOCKS_KEY)` inside the mounted subtree.
   * Use for things like a fake `$route` / `$store` shared across descendants.
   */
  mocks?: Record<string, unknown>;
}

export interface MountOptions<P extends ComponentProps = ComponentProps> {
  props?: P;
  attachTo?: Element | string;
  global?: GlobalMountOptions;
  /**
   * Slot content. `default` becomes `props.children`; any other key becomes
   * `props.<key>`. Each value may be a string, Node, or a factory function.
   * String values are parsed as HTML through a `<template>` and inserted as
   * a DocumentFragment so they may contain arbitrary markup.
   */
  children?: ChildrenOption;
  /**
   * When true, every `onXxx` function prop is wrapped to capture invocation
   * arguments. The user's original handler still runs. Read via
   * `wrapper.emitted('click')`. Default: false (zero overhead).
   */
  record?: boolean;
}

type AnyWrapper = ComponentWrapper<Element, any>;

const wrappers = new Set<AnyWrapper>();

function unregister(wrapper: AnyWrapper): void {
  wrappers.delete(wrapper);
}

function createContainer(attachTo?: Element | string): HTMLElement {
  const container = getDocument().createElement('div');
  const parent = attachTo ? resolveElement(attachTo) : getDocumentBody();
  parent.append(container);
  return container;
}

function entries(map: GlobalMountOptions['provide']): Iterable<[string | symbol, unknown]> {
  if (!map) return [];
  if (map instanceof Map) return map.entries();
  return Object.entries(map);
}

// Matches `on` followed by an uppercase ASCII letter — the essor convention
// for callback props. Avoids matching `on_click`, `on1foo`, or anything
// where char[2] just happens to be its own uppercase form.
const ON_HANDLER_PATTERN = /^on[A-Z]/;

/**
 * Copy descriptors from `source` to a fresh bag, intercepting any `onXxx`
 * function value into a recorder-wrapped version. Reactive getter
 * descriptors are preserved (getters stay getters, so wrap evaluates the
 * underlying handler lazily on every invocation).
 */
function wrapHandlers<P extends object>(source: P, record: EmittedRecord): P {
  const next = {} as P;
  for (const key of Object.getOwnPropertyNames(source)) {
    const desc = Object.getOwnPropertyDescriptor(source, key)!;
    if (!ON_HANDLER_PATTERN.test(key)) {
      Object.defineProperty(next, key, desc);
      continue;
    }

    const eventName = key.slice(2, 3).toLowerCase() + key.slice(3);
    const log = (args: unknown[]): void => {
      (record[eventName] ??= []).push(args);
    };

    if (typeof desc.value === 'function') {
      const original = desc.value as (...a: unknown[]) => unknown;
      Object.defineProperty(next, key, {
        value: (...args: unknown[]) => {
          log(args);
          return original(...args);
        },
        enumerable: desc.enumerable,
        configurable: true,
        writable: true,
      });
    } else if (desc.get) {
      const originalGetter = desc.get;
      Object.defineProperty(next, key, {
        get() {
          const fn = originalGetter.call(source);
          return typeof fn === 'function'
            ? (...args: unknown[]) => {
                log(args);
                return (fn as (...a: unknown[]) => unknown)(...args);
              }
            : fn;
        },
        enumerable: desc.enumerable,
        configurable: true,
      });
    } else {
      Object.defineProperty(next, key, desc);
    }
  }
  return next;
}

function materializeSlot(value: SlotValue): Node {
  const raw = typeof value === 'function' ? value() : value;
  if (raw instanceof Node) return raw;
  // String → fragment that can hold arbitrary markup.
  const tpl = getDocument().createElement('template');
  tpl.innerHTML = String(raw);
  return tpl.content;
}

function injectChildren<P extends ComponentProps>(
  props: P,
  children: ChildrenOption | undefined,
): P {
  if (!children) return props;
  // Copy descriptors to avoid mutating user-supplied props object.
  const next = {} as P;
  for (const key of Object.getOwnPropertyNames(props)) {
    Object.defineProperty(next, key, Object.getOwnPropertyDescriptor(props, key)!);
  }
  for (const [name, value] of Object.entries(children)) {
    if (value === undefined) continue;
    const propKey = name === 'default' ? 'children' : name;
    Object.defineProperty(next, propKey, {
      configurable: true,
      enumerable: true,
      writable: true,
      value: materializeSlot(value),
    });
  }
  return next;
}

export function mount<P extends ComponentProps = ComponentProps>(
  component: ComponentFn<P>,
  options: MountOptions<P> = {},
): ComponentWrapper<Element, P> {
  const container = createContainer(options.attachTo);

  const emittedRecord: EmittedRecord | null = options.record ? {} : null;
  let propsForMount = (options.props ?? {}) as P;
  propsForMount = injectChildren(propsForMount, options.children);
  if (emittedRecord) {
    propsForMount = wrapHandlers(propsForMount as object, emittedRecord) as P;
  }

  // If global.provide / global.mocks is set, wrap the user component so we
  // can call essor's provide() inside the active scope before rendering.
  // Same scope = same provides map, so descendants inject normally.
  const provides = options.global?.provide;
  const provideEntries = provides ? Array.from(entries(provides)) : [];
  const mocks = options.global?.mocks;
  if (mocks) provideEntries.push([MOCKS_KEY, mocks]);

  const componentFn: ComponentFn<P> =
    provideEntries.length === 0
      ? component
      : (((props: P) => {
          for (const [key, value] of provideEntries) provide(key, value);
          return component(props);
        }) as ComponentFn<P>);

  const instance = createComponent(componentFn, propsForMount);

  try {
    instance.mount(container);
  } catch (error) {
    container.remove();
    throw error;
  }

  if (instance.firstChild == null) {
    instance.destroy();
    container.remove();
    throw new Error('Mounted component did not render any nodes');
  }

  const element =
    (instance.firstChild instanceof Element ? instance.firstChild : container.firstElementChild) ??
    container;

  const wrapper = new ComponentWrapper<Element, P>(
    element,
    instance,
    container,
    unregister,
    emittedRecord,
  );
  wrappers.add(wrapper);
  return wrapper;
}

/**
 * Mirror of @testing-library/react's `act`: run an update block and flush
 * essor's reactive tick + a microtask before returning. Because essor is
 * synchronous with an explicit `nextTick`, `act` is simply sugar for
 * `await fn(); await flushPromises()`.
 */
export async function act(fn: () => void | Promise<void>): Promise<void> {
  await fn();
  await flushPromises();
}

export function cleanup(): void {
  for (const wrapper of Array.from(wrappers)) {
    wrapper.unmount();
  }
}
