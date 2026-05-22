# Examples

Runnable test files demonstrating common `@estjs/test-utils` patterns.

Each file is a standard Vitest spec — copy any of them into your own
`test/` directory or run them in place via `pnpm vitest examples`.

| File | What it shows |
| --- | --- |
| [`basic.spec.ts`](./basic.spec.ts) | `mount` / `render` / `cleanup` lifecycle, basic wrapper assertions. |
| [`queries.spec.ts`](./queries.spec.ts) | Semantic queries — `getByRole`, `getByLabelText`, `getByPlaceholderText`, async `findBy*`. |
| [`user-event.spec.ts`](./user-event.spec.ts) | High-fidelity interactions — `type`, `clear`, `selectOptions`, `tab`, keyboard sequences. |
| [`children-and-mocks.spec.ts`](./children-and-mocks.spec.ts) | `children.default` → `props.children`, named slots, `global.mocks` + `MOCKS_KEY`. |
| [`emitted.spec.ts`](./emitted.spec.ts) | `record: true` + `wrapper.emitted('click')` to spy on callback props. |

> All examples assume a Vitest config with `environment: 'jsdom'` and
> `globals: true`. The mounted root in each example is a plain DOM tree
> returned by the component function; replace it with your real essor
> component to test production code.
