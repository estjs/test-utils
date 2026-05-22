import { cleanup as _autoCleanup } from './mount';
import { resetUserEvent as _resetUserEvent } from './user-event';

// ── essor lifecycle ──────────────────────────────────────────────────────
export {
  MOCKS_KEY,
  act,
  cleanup,
  mount,
  type GlobalMountOptions,
  type MountOptions,
  type SlotValue,
  type ChildrenOption,
} from './mount';

// ── wrappers ────────────────────────────────────────────────────────────
export {
  ComponentWrapper,
  DOMWrapper,
  createEmptyWrapper,
  type EmittedRecord,
  type QueryFamily,
  type WrapperLike,
} from './wrapper';

// ── primitive event helpers ─────────────────────────────────────────────
export { fireEvent, dispatch, setValue, type FireEvent, type FireEventOptions } from './events';

// ── high-fidelity user interactions (delegates to @testing-library/user-event)
export {
  userEvent,
  createUser,
  boundUser,
  resetUserEvent,
  type UserEvent,
  type BoundUserEvent,
} from './user-event';

// ── selector helpers + TextMatcher type ─────────────────────────────────
export {
  getBySelector,
  queryBySelector,
  getAllBySelector,
  queryAllBySelector,
  type TextMatcher,
} from './queries';

// ── async ───────────────────────────────────────────────────────────────
export { waitFor, waitForElementToBeRemoved, flushPromises, type WaitForOptions } from './wait-for';

// ── debug + config (straight re-exports) ────────────────────────────────
export { prettyDOM, logRoles } from '@testing-library/dom';
export { configure, getConfig, type Config } from './config';

// ── auto-cleanup integration ────────────────────────────────────────────
// Side effect at import time: register `cleanup` + `resetUserEvent` with the
// active test runner if it exposes the standard `afterEach` global (Vitest,
// Jest, Mocha, Bun). Opt out by setting
// `globalThis.__ESTJS_TEST_UTILS_DISABLE_AUTO_CLEANUP__ = true` *before*
// importing this package. See package.json `sideEffects` whitelist.
interface MaybeRunner {
  afterEach?: (cb: () => void | Promise<void>) => unknown;
}
const runner = globalThis as unknown as MaybeRunner;
const optedOut =
  (globalThis as unknown as Record<string, unknown>).__ESTJS_TEST_UTILS_DISABLE_AUTO_CLEANUP__ ===
  true;
if (!optedOut && typeof runner.afterEach === 'function') {
  runner.afterEach(() => {
    _autoCleanup();
    _resetUserEvent();
  });
}
