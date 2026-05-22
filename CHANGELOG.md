# Changelog

All notable changes to `@estjs/test-utils` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.1] - 2026-05-22

First public release. The package is a wrapper layer over
`@testing-library/dom` and `@testing-library/user-event` — all queries go
through a single `wrapper` object, no `screen` / `within` / `render`.

### Added

- **Lifecycle** — `mount` / `cleanup` / `act` for essor components.
  - `mount(component, options)` returns a `ComponentWrapper`.
  - `cleanup()` unmounts every wrapper produced in the current test.
  - `act(fn)` flushes essor's `nextTick` + a microtask after `fn` resolves.
- **Wrapper API**:
  - State: `.element` / `.exists()` / `.isVisible()` / `.isDisabled()` /
    `.isChecked()` / `.text()` / `.html({ pretty? })` / `.attributes()` /
    `.classes()`.
  - Selector queries: `.find(sel)` / `.findAll(sel)` / `.get(sel)` /
    `.getAll(sel)` — all returning wrappers (missing → `EmptyWrapper`).
  - **Semantic queries on every wrapper — 48 methods total**, chainable.
    Six variants across eight bases (`Text` · `Role` · `LabelText` ·
    `PlaceholderText` · `DisplayValue` · `AltText` · `Title` · `TestId`):
    - `getByX` — sync, throws on miss.
    - `getAllByX` — sync, throws if no match.
    - `queryByX` — sync, returns `EmptyWrapper` on miss.
    - `queryAllByX` — sync, returns `[]` on miss.
    - `findByX` — async, waits for the element, throws on timeout.
    - `findAllByX` — async, waits, throws on timeout.
    Names and semantics are 1-to-1 with React Testing Library.
    `findByX` / `findAllByX` on a disconnected wrapper reject immediately
    instead of waiting out `asyncUtilTimeout`.
  - Interaction: `.trigger(event, opts)`, `.setValue(value)`, `.user`
    (element-bound `@testing-library/user-event`).
  - Component-only: `.component`, `.props()`, `.emitted([name])`,
    `.setProps(partial)`, `.unmount()`.
- **Mount options**:
  - `props`, `attachTo`.
  - `children: { default, [name] }` — `default` maps to `props.children`,
    named keys to `props.<name>`. Strings parsed as HTML through a
    `<template>` so they may carry arbitrary markup.
  - `global.provide` — values exposed via essor's `inject()`.
  - `global.mocks` — object retrievable via `inject(MOCKS_KEY)`.
  - `record: true` — wraps every `onXxx` prop (including reactive-getter
    descriptors) to capture calls; readable via
    `wrapper.emitted('click')`. Default `false` for zero overhead.
    Uses `/^on[A-Z]/` to detect handlers, so keys like `on_click` or
    `online` are left untouched.
- **Selector helpers** (escape hatches): `getBySelector`, `queryBySelector`,
  `getAllBySelector`, `queryAllBySelector`.
- **User interaction (standalone)**:
  - `userEvent` — lazy-initialised shared `@testing-library/user-event`
    session. First access calls `setup()`; module load itself doesn't
    touch the DOM.
  - `createUser(options?)` — fresh session factory for per-test
    customization (e.g. `delay: null`).
  - `resetUserEvent()` — discard the cached session; `cleanup()` calls
    this automatically so modifier/pointer state doesn't leak across tests.
  - `boundUser(getElement)` — adapter used internally by `wrapper.user`.
- **Async**:
  - `waitFor`, `waitForElementToBeRemoved` (re-exported from testing-library).
  - `flushPromises()` — drains essor's `nextTick` + microtasks.
  - `act(fn)` — `@testing-library/react`-style flushing wrapper.
- **Debug**: `prettyDOM`, `logRoles` re-exported from `@testing-library/dom`.
- **Config**: `configure({ testIdAttribute, asyncUtilTimeout })`,
  `getConfig()` — forwarded to testing-library's configure.
- **Auto-cleanup** — importing the entry point registers `afterEach(() => {
  cleanup(); resetUserEvent(); })` with the active test runner (Vitest /
  Jest / Mocha / Bun) if available. Opt out by setting
  `globalThis.__ESTJS_TEST_UTILS_DISABLE_AUTO_CLEANUP__ = true` before
  importing.
- **Primitive events**: `fireEvent.*`, `dispatch(el, type, options)`,
  `setValue(el, value)` — essor-aware (await `nextTick` after dispatch).

### Architecture

- Internally delegates query implementations to `@testing-library/dom` and
  user-interaction to `@testing-library/user-event`.
- The 48 semantic query methods are injected on `DOMWrapper.prototype` once
  at module load — wrapper allocation stays cheap, and `within(element)`
  runs lazily only when a query is actually invoked.
- The only `@testing-library/dom` exports re-surfaced from this package are
  `prettyDOM` and `logRoles` (debug helpers). Everything query-shaped goes
  through `wrapper.*`; there is no `screen`, no `within`, no `render`.

### Limitations

- `findComponent` / `getComponent` recursive search is **not** supported —
  essor does not track child `Component` instances at runtime.
- Global `stubs` / `components` aren't supported — essor resolves components
  at compile time.
- `shallowMount` is intentionally absent.

[0.0.1]: https://github.com/estjs/essor/releases/tag/test-utils-v0.0.1
