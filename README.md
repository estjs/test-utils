# @estjs/test-utils

> Testing utilities for [Essor](https://github.com/estjs/essor) components.
> A **pure wrapper API** layered on `@testing-library/dom` queries and `@testing-library/user-event` interactions — every assertion goes through a single `wrapper` object, no global `screen` / `within` / `render` indirection.

[简体中文](./README_CN.md) · [Changelog](./CHANGELOG.md)

---

## Install

```bash
pnpm add -D @estjs/test-utils
# or
npm i -D @estjs/test-utils
```

Requires a DOM environment. With **Vitest**:

```ts
// vitest.config.ts
export default defineConfig({
  test: { environment: 'jsdom', globals: true },
});
```

Importing the package registers `afterEach(cleanup)` automatically — every mounted component is torn down between tests, and the shared `userEvent` session is reset.

> To disable auto-cleanup, set
> `globalThis.__ESTJS_TEST_UTILS_DISABLE_AUTO_CLEANUP__ = true` **before**
> importing the package.

---

## Quick start

```ts
import { mount, userEvent } from '@estjs/test-utils';

it('renders a button and reacts to clicks', async () => {
  const onClick = vi.fn();

  const wrapper = mount(
    (props: { label: string; onClick?: () => void }) => {
      const button = document.createElement('button');
      button.textContent = props.label;
      button.addEventListener('click', () => props.onClick?.());
      return button;
    },
    { props: { label: 'Save', onClick } },
  );

  expect(wrapper.text()).toBe('Save');
  await userEvent.click(wrapper.element);
  expect(onClick).toHaveBeenCalledTimes(1);
});
```

Semantic queries are methods on the wrapper:

```ts
it('queries by accessible role', () => {
  const wrapper = mount(() => {
    const div = document.createElement('div');
    div.innerHTML = '<h1>Dashboard</h1><button>Refresh</button>';
    return div;
  });

  expect(wrapper.getByRole('heading', { name: 'Dashboard' }).text()).toBe('Dashboard');
  expect(wrapper.getByRole('button').text()).toBe('Refresh');
});
```

Every query returns a `DOMWrapper`, so chaining is natural:

```ts
wrapper.getByTestId('hero').getByRole('button').text();
```

---

## `mount(component, options?)`

```ts
const wrapper = mount(MyComponent, {
  props: { label: 'Save' },
  attachTo: '#app',
  children: {
    default: '<span>Hi</span>',
    footer: '<small>©</small>',
  },
  global: {
    provide: { theme: 'dark' },
    mocks: { $route: '/home' },
  },
  record: true,
});
```

| Option | Type | Description |
| --- | --- | --- |
| `props` | `P` | Initial props passed to the component function. Reactive getter descriptors are preserved. |
| `attachTo` | `Element \| string` | Where to insert the test container. Defaults to `document.body`. |
| `children.default` | `string \| Node \| () => string \| Node` | Mapped to `props.children`. Strings are parsed via `<template>` and may contain arbitrary markup. |
| `children.<name>` | same | Mapped to `props.<name>`. |
| `global.provide` | `Map<string\|symbol, unknown> \| Record<string, unknown>` | Values exposed to descendants via essor's `inject()`. |
| `global.mocks` | `Record<string, unknown>` | Retrievable via `inject(MOCKS_KEY)`. |
| `record` | `boolean` | Wraps every `onXxx` function prop so calls are captured. Read via `wrapper.emitted('click')`. Default `false` for zero overhead. |

---

## `ComponentWrapper` / `DOMWrapper`

### State
- `.element` — root element
- `.exists()` / `.isVisible()` / `.isDisabled()` / `.isChecked()`
- `.text()` / `.html({ pretty? })`
- `.attributes()` / `.attributes(name)` / `.classes()`

### Selector queries (return wrapper)
- `.find(sel)` / `.findAll(sel)` — soft, missing → `EmptyWrapper` / `[]`
- `.get(sel)` / `.getAll(sel)` — strict, missing → throws

### Semantic queries (return wrapper)

Eight bases × six variants = **48 methods**, all chainable. Semantics line up 1-to-1 with React Testing Library / Vue Test Utils:

| Variant | Sync / Async | When missing | Use for |
| --- | --- | --- | --- |
| `getByX(...)` | sync | throws | element expected to already be there |
| `getAllByX(...)` | sync | throws (empty is also a miss) | one-or-more expected |
| `queryByX(...)` | sync | returns `EmptyWrapper` | asserting absence, or tentative lookups |
| `queryAllByX(...)` | sync | returns `[]` | count assertions including zero |
| `findByX(...)` | **`Promise`** | waits, then throws on timeout | element that appears asynchronously |
| `findAllByX(...)` | **`Promise`** | waits, then throws on timeout | many elements appearing asynchronously |

Bases: `Text` · `Role` · `LabelText` · `PlaceholderText` · `DisplayValue` · `AltText` · `Title` · `TestId`.

```ts
// sync: guaranteed present
wrapper.getByRole('button', { name: 'Save' }).text();
wrapper.getAllByRole('listitem');

// sync: absence assertion
expect(wrapper.queryByText('Error').exists()).toBe(false);
expect(wrapper.queryAllByRole('alert')).toHaveLength(0);

// async: wait for appearance
const ready = await wrapper.findByText('Ready');
const items = await wrapper.findAllByRole('listitem');
```

> The async timeout is governed by `configure({ asyncUtilTimeout })` and forwarded straight to `@testing-library/dom`.
> Calling `findByX` / `findAllByX` on a disconnected wrapper (`isConnected === false`) rejects **immediately** instead of waiting out the full `asyncUtilTimeout`.

### Interactions
- `.trigger(event, options?)` — `fireEvent`-level single event + essor `nextTick`
- `.setValue(value)` — for `<input>` / `<textarea>` / `<select>`
- `.user` — `@testing-library/user-event` pre-bound to this element:
  ```ts
  await wrapper.user.click();
  await wrapper.user.type('hello{Enter}');
  await wrapper.user.clear();
  await wrapper.user.tab();
  ```

### Component-only
- `.component`  — the essor `Component` instance
- `.props()` — snapshot of current props (resolves through getters)
- `.emitted(name?)` — captured `onXxx` invocations (requires `record: true`)
- `.setProps(partial)` — patch props, returns `nextTick`
- `.unmount()` — destroy + remove

---

## User interaction (standalone)

```ts
import { userEvent, createUser, resetUserEvent } from '@estjs/test-utils';

// Shared session (lazy, reset between tests automatically)
await userEvent.click(button);
await userEvent.type(input, 'hello{Enter}');
await userEvent.tab();
await userEvent.selectOptions(select, ['a', 'b']);

// Custom session (e.g. with fake timers)
const user = createUser({ delay: null });
await user.click(button);

// Rarely needed — cleanup() calls this for you.
resetUserEvent();
```

`userEvent` is a **lazy Proxy**: `@testing-library/user-event`'s `setup()` runs on the first property access, so module load doesn't require a DOM. `cleanup()` calls `resetUserEvent()` after every test to prevent keyboard / pointer modifier state from leaking across cases.

Full `@testing-library/user-event` v14 surface: keyboard, pointer, paste, upload all work.

---

## Async helpers

```ts
import { waitFor, waitForElementToBeRemoved, flushPromises, act } from '@estjs/test-utils';

await waitFor(() => expect(wrapper.text()).toBe('Ready'));
await waitForElementToBeRemoved(() => wrapper.queryByText('Loading').element);
await flushPromises();             // essor nextTick + microtask
await act(() => store.update());   // React-style flush
```

> Prefer `findByX` / `findAllByX` for elements that arrive asynchronously — they read better than hand-rolled `waitFor + queryByX`.

---

## Debugging

```ts
import { prettyDOM, logRoles } from '@estjs/test-utils';

console.log(prettyDOM(wrapper.element));
console.log(wrapper.html({ pretty: true })); // equivalent shortcut
logRoles(document.body);
```

---

## Configuration

```ts
import { configure, getConfig } from '@estjs/test-utils';

configure({
  testIdAttribute: 'data-cy',   // forwarded to @testing-library/dom
  asyncUtilTimeout: 2000,       // default waitFor / findByX timeout (ms)
});

getConfig().testIdAttribute; // → 'data-cy'
```

---

## Auto-cleanup

Importing the entry point registers an `afterEach` hook that:

1. Unmounts every wrapper produced by `mount()` during the current test, removing each container from the DOM.
2. Calls `resetUserEvent()` so the shared user-event session starts fresh.

To take cleanup over manually, set the opt-out flag **before** the package is imported:

```ts
(globalThis as any).__ESTJS_TEST_UTILS_DISABLE_AUTO_CLEANUP__ = true;
```

…then wire it up yourself:

```ts
import { cleanup, resetUserEvent } from '@estjs/test-utils';

afterEach(() => {
  cleanup();
  resetUserEvent();
});
```

---

## Comparisons

### From React Testing Library

| RTL | here |
| --- | --- |
| `render(<Comp />).getByRole(...)` | `mount(Comp).getByRole(...)` |
| `screen.getByRole(...)` | not exposed — use `wrapper.getByRole(...)` |
| `within(el).getByX` | not exposed — chain `wrapper.find('...').getByX(...)` |
| `getByX` / `queryByX` / `findByX` | **same name, same semantics** |
| `getAllByX` / `queryAllByX` / `findAllByX` | **same name, same semantics** |
| `userEvent.setup()` | `createUser()` |
| `act(() => ...)` | `act(() => ...)` ✓ |

### From Vue Test Utils

| VTU | here |
| --- | --- |
| `mount(Comp, { props, slots, global })` | `mount(Comp, { props, children, global })` |
| `wrapper.find('.x')` / `wrapper.get('.x')` | same ✓ |
| `wrapper.findAll('.x')` | same ✓ |
| `wrapper.trigger('click')` | same ✓ |
| `wrapper.setProps({...})` | same ✓ |
| `wrapper.emitted('event')` | same ✓ (needs `mount({ record: true })`) |

---

## Architecture

Intentionally thin:

- `mount` / `cleanup` / `act` — essor lifecycle glue.
- `DOMWrapper` / `ComponentWrapper` — wrapper ergonomics. The **48** semantic query methods are injected on `DOMWrapper.prototype` once at module load, so every wrapper instance has them for free.
- Internally delegates to:
  - `@testing-library/dom` — query implementations, `waitFor`, `prettyDOM`, `logRoles`, `configure`.
  - `@testing-library/user-event` — `userEvent` + `createUser`.

The only public surface from `@testing-library/dom` we re-export is `prettyDOM` / `logRoles` (debug helpers). Everything query-shaped goes through `wrapper.*`.

---

## License

[MIT](./LICENSE) © [jiangxd](https://github.com/jiangxd2016)
