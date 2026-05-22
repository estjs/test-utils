import { afterEach, describe, expect, it } from 'vitest';
import { inject } from 'essor';
import { MOCKS_KEY, cleanup, mount } from '../src';

afterEach(cleanup);

describe('children → props.children', () => {
  it('default slot becomes props.children', () => {
    const wrapper = mount(
      (props: { children?: unknown }) => {
        const div = document.createElement('div');
        if (props.children instanceof Node) div.append(props.children);
        return div;
      },
      { children: { default: '<span class="hi">Hello</span>' } },
    );
    expect(wrapper.find('.hi').text()).toBe('Hello');
  });

  it('named slot becomes props.<name>', () => {
    const wrapper = mount(
      (props: { header?: unknown }) => {
        const div = document.createElement('div');
        if (props.header instanceof Node) div.append(props.header);
        return div;
      },
      { children: { header: '<h1 class="title">Welcome</h1>' } },
    );
    expect(wrapper.find('.title').text()).toBe('Welcome');
  });
});

describe('global.mocks', () => {
  it('exposes a mocks object through MOCKS_KEY', () => {
    const wrapper = mount(
      () => {
        const mocks = inject<Record<string, unknown>>(MOCKS_KEY);
        const div = document.createElement('div');
        div.textContent = String(mocks?.$route ?? '');
        return div;
      },
      { global: { mocks: { $route: '/dashboard' } } },
    );
    expect(wrapper.text()).toBe('/dashboard');
  });
});

describe('global.provide', () => {
  it('makes provided values injectable', () => {
    const wrapper = mount(
      () => {
        const theme = inject<string>('theme');
        const div = document.createElement('div');
        div.textContent = theme ?? '';
        return div;
      },
      { global: { provide: { theme: 'dark' } } },
    );
    expect(wrapper.text()).toBe('dark');
  });
});
