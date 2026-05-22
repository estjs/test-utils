import baseUserEvent from '@testing-library/user-event';
import type { UserEvent as BaseUserEvent } from '@testing-library/user-event';

/**
 * Lazily-initialised @testing-library/user-event session. Created on the
 * first property access of `userEvent` (or the first `boundUser(...)` call)
 * and re-created from scratch by `resetUserEvent()`.
 *
 * Lazy because module load may occur before a DOM exists (rare, but `setup()`
 * touches `document` synchronously). Resettable because user-event's session
 * tracks modifier state (Shift, Caps, …) and pointer state across calls —
 * leaking that between tests can cause spooky cross-test failures.
 */
let activeSession: BaseUserEvent | undefined;

function ensureSession(): BaseUserEvent {
  if (!activeSession) activeSession = baseUserEvent.setup();
  return activeSession;
}

/**
 * Discard the cached session so the next access starts from a clean slate.
 * `cleanup()` calls this automatically; tests rarely need to invoke it.
 */
export function resetUserEvent(): void {
  activeSession = undefined;
}

/**
 * Shared @testing-library/user-event session. Methods proxy to the active
 * underlying session, lazily set up on first access. Use `createUser()` for
 * a fully isolated session with custom options.
 */
export const userEvent: BaseUserEvent = new Proxy({} as BaseUserEvent, {
  get(_target, prop) {
    const session = ensureSession();
    const value = (session as unknown as Record<PropertyKey, unknown>)[prop];
    return typeof value === 'function'
      ? (value as (...a: unknown[]) => unknown).bind(session)
      : value;
  },
});

/**
 * Build a fresh user-event session with custom options. Pass this when you
 * need a specific delay, pointer config, or a fake timer integration:
 *
 *     const user = createUser({ delay: null });
 *     await user.click(button);
 *
 * Equivalent to `@testing-library/user-event`'s `userEvent.setup(options)`.
 */
export function createUser(options?: Parameters<typeof baseUserEvent.setup>[0]): BaseUserEvent {
  return baseUserEvent.setup(options);
}

export type UserEvent = BaseUserEvent;

// Helpers: derive the element-bound shape from the base UserEvent API.

type AnyFn = (...args: any[]) => any;
type WithoutElement<F> = F extends (element: Element, ...rest: infer R) => infer Ret
  ? (...args: R) => Ret
  : F;

// Methods on UserEvent that DON'T take an element as the first argument.
// They forward as-is from the global userEvent session.
type ElementlessKeys = 'tab' | 'keyboard' | 'pointer' | 'copy' | 'cut' | 'paste';

// Element-bound shape: every method that takes an Element first now has it
// pre-bound to the wrapper's element. Methods in ElementlessKeys keep their
// original signature.
export type BoundUserEvent = {
  [K in Exclude<keyof BaseUserEvent, 'setup' | ElementlessKeys>]: BaseUserEvent[K] extends AnyFn
    ? WithoutElement<BaseUserEvent[K]>
    : BaseUserEvent[K];
} & Pick<BaseUserEvent, ElementlessKeys>;

/**
 * Adapter exposed via `DOMWrapper.user`. Each call resolves the active
 * session afresh so `resetUserEvent()` between tests doesn't leave stale
 * references behind on cached wrappers.
 */
export function boundUser(getElement: () => Element): BoundUserEvent {
  const target = (): Element => getElement();
  const call = (method: string, args: unknown[], elFirst = true): unknown => {
    const session = ensureSession() as unknown as Record<string, AnyFn>;
    return elFirst ? session[method](target(), ...args) : session[method](...args);
  };
  return {
    click: (...args: unknown[]) => call('click', args),
    dblClick: (...args: unknown[]) => call('dblClick', args),
    tripleClick: (...args: unknown[]) => call('tripleClick', args),
    hover: (...args: unknown[]) => call('hover', args),
    unhover: (...args: unknown[]) => call('unhover', args),
    clear: () => call('clear', []),
    type: (...args: unknown[]) => call('type', args),
    selectOptions: (...args: unknown[]) => call('selectOptions', args),
    deselectOptions: (...args: unknown[]) => call('deselectOptions', args),
    upload: (...args: unknown[]) => call('upload', args),
    // element-less passthroughs
    tab: (...args: unknown[]) => call('tab', args, false),
    keyboard: (...args: unknown[]) => call('keyboard', args, false),
    pointer: (...args: unknown[]) => call('pointer', args, false),
    copy: (...args: unknown[]) => call('copy', args, false),
    cut: (...args: unknown[]) => call('cut', args, false),
    paste: (...args: unknown[]) => call('paste', args, false),
  } as BoundUserEvent;
}
