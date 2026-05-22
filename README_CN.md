# @estjs/test-utils

> 用于 [Essor](https://github.com/estjs/essor) 组件的测试工具库。
> 一个**纯 wrapper API**,底层委托给 `@testing-library/dom` 查询与 `@testing-library/user-event` 交互 —— 所有断言都通过单一的 `wrapper` 对象,**不暴露** `screen` / `within` / `render` 这类全局函数。

[English](./README.md) · [更新日志](./CHANGELOG.md)

---

## 安装

```bash
pnpm add -D @estjs/test-utils
# 或
npm i -D @estjs/test-utils
```

需要 DOM 环境。以 **Vitest** 为例:

```ts
// vitest.config.ts
export default defineConfig({
  test: { environment: 'jsdom', globals: true },
});
```

导入本包会自动向测试运行器注册 `afterEach(cleanup)` —— 每个用例结束后已挂载的组件会被自动卸载,共享的 `userEvent` session 也会被重置。

> 如需关闭自动 cleanup,在 import 本包之前设置
> `globalThis.__ESTJS_TEST_UTILS_DISABLE_AUTO_CLEANUP__ = true`。

---

## 快速上手

```ts
import { mount, userEvent } from '@estjs/test-utils';

it('点击按钮触发回调', async () => {
  const onClick = vi.fn();

  const wrapper = mount(
    (props: { label: string; onClick?: () => void }) => {
      const button = document.createElement('button');
      button.textContent = props.label;
      button.addEventListener('click', () => props.onClick?.());
      return button;
    },
    { props: { label: '保存', onClick } },
  );

  expect(wrapper.text()).toBe('保存');
  await userEvent.click(wrapper.element);
  expect(onClick).toHaveBeenCalledTimes(1);
});
```

语义查询都是 wrapper 上的方法:

```ts
it('按可访问性 role 查询', () => {
  const wrapper = mount(() => {
    const div = document.createElement('div');
    div.innerHTML = '<h1>仪表盘</h1><button>刷新</button>';
    return div;
  });

  expect(wrapper.getByRole('heading', { name: '仪表盘' }).text()).toBe('仪表盘');
  expect(wrapper.getByRole('button').text()).toBe('刷新');
});
```

每个查询都返回 `DOMWrapper`,链式调用很自然:

```ts
wrapper.getByTestId('hero').getByRole('button').text();
```

---

## `mount(component, options?)`

```ts
const wrapper = mount(MyComponent, {
  props: { label: '保存' },
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

| 选项 | 类型 | 说明 |
| --- | --- | --- |
| `props` | `P` | 初始 props,保留响应式 getter 描述符 |
| `attachTo` | `Element \| string` | 测试容器要挂在哪,默认 `document.body` |
| `children.default` | `string \| Node \| () => string \| Node` | 映射到 `props.children`。字符串会通过 `<template>` 解析为 HTML,可包含任意标签 |
| `children.<name>` | 同上 | 映射到 `props.<name>` |
| `global.provide` | `Map<string\|symbol, unknown> \| Record<string, unknown>` | 通过 essor 的 `inject()` 暴露给子树 |
| `global.mocks` | `Record<string, unknown>` | 通过 `inject(MOCKS_KEY)` 取回 |
| `record` | `boolean` | 把每个 `onXxx` 函数 prop 包一层用于记录调用。可通过 `wrapper.emitted('click')` 读取。默认 `false`(零开销) |

---

## `ComponentWrapper` / `DOMWrapper`

### 状态
- `.element` — 根元素
- `.exists()` / `.isVisible()` / `.isDisabled()` / `.isChecked()`
- `.text()` / `.html({ pretty? })`
- `.attributes()` / `.attributes(name)` / `.classes()`

### Selector 查询(返回 wrapper)
- `.find(sel)` / `.findAll(sel)` — 软查询,找不到 → `EmptyWrapper` / `[]`
- `.get(sel)` / `.getAll(sel)` — 严格查询,找不到 → 抛错

### 语义查询(返回 wrapper)

8 个 base × 6 个变体 = **48 个方法**,全部可链式。语义和 React Testing Library / Vue Test Utils 完全对齐:

| 变体 | 同步/异步 | 找不到时 | 用途 |
| --- | --- | --- | --- |
| `getByX(...)` | 同步 | 抛错 | 期望立即存在的元素 |
| `getAllByX(...)` | 同步 | 抛错(空数组也抛) | 期望至少有一个匹配 |
| `queryByX(...)` | 同步 | 返回 `EmptyWrapper` | 断言元素**不**存在,或试探性查询 |
| `queryAllByX(...)` | 同步 | 返回 `[]` | 数量断言(包含 0 个的情况) |
| `findByX(...)` | **`Promise`** | 等待至超时后抛错 | 异步出现的元素 |
| `findAllByX(...)` | **`Promise`** | 等待至超时后抛错 | 异步出现的多个元素 |

Bases:`Text` · `Role` · `LabelText` · `PlaceholderText` · `DisplayValue` · `AltText` · `Title` · `TestId`。

```ts
// 同步:确定存在
wrapper.getByRole('button', { name: '保存' }).text();
wrapper.getAllByRole('listitem');

// 同步:不存在断言
expect(wrapper.queryByText('错误信息').exists()).toBe(false);
expect(wrapper.queryAllByRole('alert')).toHaveLength(0);

// 异步:等待出现
const ready = await wrapper.findByText('就绪');
const items = await wrapper.findAllByRole('listitem');
```

> **超时**通过 `configure({ asyncUtilTimeout })` 控制,直接透传到 `@testing-library/dom`。
> 在已断开(`isConnected === false`)的 wrapper 上调用 `findByX` / `findAllByX` 会**立即**拒绝,不会浪费 `asyncUtilTimeout` 等待。

### 交互
- `.trigger(event, options?)` — `fireEvent` 级别,单事件 + essor `nextTick`
- `.setValue(value)` — 用于 `<input>` / `<textarea>` / `<select>`
- `.user` — 预绑定到当前 element 的 `@testing-library/user-event`:
  ```ts
  await wrapper.user.click();
  await wrapper.user.type('hello{Enter}');
  await wrapper.user.clear();
  await wrapper.user.tab();
  ```

### Component 专属
- `.component`  — essor `Component` 实例
- `.props()` — 当前 props 快照(解析 getter)
- `.emitted(name?)` — 捕获到的 `onXxx` 调用记录(需 `record: true`)
- `.setProps(partial)` — 局部 patch props,返回 `nextTick`
- `.unmount()` — 销毁 + 移除

---

## 用户交互(独立 API)

```ts
import { userEvent, createUser, resetUserEvent } from '@estjs/test-utils';

// 共享 session(惰性创建,跨用例自动重置)
await userEvent.click(button);
await userEvent.type(input, 'hello{Enter}');
await userEvent.tab();
await userEvent.selectOptions(select, ['a', 'b']);

// 自定义 session(例如配合 fake timers)
const user = createUser({ delay: null });
await user.click(button);

// 极少需要手动调用 —— cleanup() 会自动调用
resetUserEvent();
```

`userEvent` 是一个**惰性 Proxy**:首次访问时才会调用 `@testing-library/user-event` 的 `setup()`,因此模块加载时没有 DOM 也不会报错。每次 `cleanup()` 会调用 `resetUserEvent()`,确保 keyboard/pointer modifier 状态不会跨用例泄漏。

`@testing-library/user-event` v14 的完整能力 —— keyboard / pointer / paste / upload 都能用。

---

## 异步工具

```ts
import { waitFor, waitForElementToBeRemoved, flushPromises, act } from '@estjs/test-utils';

await waitFor(() => expect(wrapper.text()).toBe('就绪'));
await waitForElementToBeRemoved(() => wrapper.queryByText('加载中').element);
await flushPromises();             // essor nextTick + microtask
await act(() => store.update());   // React 风格的批量刷新
```

> 异步出现的元素优先使用 `findByX` / `findAllByX`;它们内部就是 `waitFor + queryByX`,可读性更好。

---

## 调试

```ts
import { prettyDOM, logRoles } from '@estjs/test-utils';

console.log(prettyDOM(wrapper.element));
console.log(wrapper.html({ pretty: true })); // 等价快捷方式
logRoles(document.body);
```

---

## 配置

```ts
import { configure, getConfig } from '@estjs/test-utils';

configure({
  testIdAttribute: 'data-cy',   // 透传到 @testing-library/dom
  asyncUtilTimeout: 2000,       // waitFor / findByX 默认超时(ms)
});

getConfig().testIdAttribute; // → 'data-cy'
```

---

## 自动 cleanup

import 本包会注册一个 `afterEach` 钩子,内部依次执行:

1. 卸载本次用例中所有 `mount()` 出的 wrapper(并移除其 DOM container)
2. 调用 `resetUserEvent()` 丢弃共享 user-event session

如果你想完全接管 cleanup,在 import 本包之前设置:

```ts
(globalThis as any).__ESTJS_TEST_UTILS_DISABLE_AUTO_CLEANUP__ = true;
```

然后手动调用:

```ts
import { cleanup, resetUserEvent } from '@estjs/test-utils';

afterEach(() => {
  cleanup();
  resetUserEvent();
});
```

---

## 与其他测试库的对照

### React Testing Library

| RTL | 这里 |
| --- | --- |
| `render(<Comp />).getByRole(...)` | `mount(Comp).getByRole(...)` |
| `screen.getByRole(...)` | 不导出 —— 用 `wrapper.getByRole(...)` |
| `within(el).getByX` | 不导出 —— 链式 `wrapper.find('...').getByX(...)` |
| `getByX` / `queryByX` / `findByX` | **同名同语义** |
| `getAllByX` / `queryAllByX` / `findAllByX` | **同名同语义** |
| `userEvent.setup()` | `createUser()` |
| `act(() => ...)` | `act(() => ...)` ✓ |

### Vue Test Utils

| VTU | 这里 |
| --- | --- |
| `mount(Comp, { props, slots, global })` | `mount(Comp, { props, children, global })` |
| `wrapper.find('.x')` / `wrapper.get('.x')` | 同名 ✓ |
| `wrapper.findAll('.x')` | 同名 ✓ |
| `wrapper.trigger('click')` | 同名 ✓ |
| `wrapper.setProps({...})` | 同名 ✓ |
| `wrapper.emitted('event')` | 同名 ✓(需 `mount({ record: true })`) |

---

## 架构

包的设计有意保持薄壳:

- `mount` / `cleanup` / `act` —— essor 生命周期接线
- `DOMWrapper` / `ComponentWrapper` —— wrapper ergonomics,**48 个**语义查询方法在模块加载时一次性注入到 `DOMWrapper.prototype`,每个 wrapper 实例都自动具备
- 内部委托给:
  - `@testing-library/dom` —— 查询实现、`waitFor`、`prettyDOM`、`logRoles`、`configure`
  - `@testing-library/user-event` —— `userEvent` + `createUser`

我们从 `@testing-library/dom` 唯一公开 re-export 的只有 `prettyDOM` / `logRoles`(调试工具)。所有查询形式的能力都走 `wrapper.*`。

---

## 协议

[MIT](./LICENSE) © [jiangxd](https://github.com/jiangxd2016)
