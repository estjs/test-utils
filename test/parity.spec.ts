import { afterEach, describe, expect, it, vi } from 'vitest';
import { inject } from 'essor';
import { MOCKS_KEY, act, cleanup, createUser, mount } from '../src';

afterEach(cleanup);

describe('wrapper enhancements (batch 1)', () => {
  it('isDisabled reflects native + aria-disabled', () => {
    const wrapper = mount(() => {
      const div = document.createElement('div');
      div.innerHTML = `
        <button id="a">A</button>
        <button id="b" disabled>B</button>
        <button id="c" aria-disabled="true">C</button>
      `;
      return div;
    });
    expect(wrapper.find('#a').isDisabled()).toBe(false);
    expect(wrapper.find('#b').isDisabled()).toBe(true);
    expect(wrapper.find('#c').isDisabled()).toBe(true);
  });

  it('isChecked covers native checkbox + aria-checked', () => {
    const wrapper = mount(() => {
      const div = document.createElement('div');
      div.innerHTML = `
        <input type="checkbox" id="a" checked />
        <input type="checkbox" id="b" />
        <div id="c" role="checkbox" aria-checked="true"></div>
      `;
      return div;
    });
    expect(wrapper.find('#a').isChecked()).toBe(true);
    expect(wrapper.find('#b').isChecked()).toBe(false);
    expect(wrapper.find('#c').isChecked()).toBe(true);
  });

  it('html({ pretty: true }) returns prettified output', () => {
    const wrapper = mount(() => {
      const div = document.createElement('div');
      div.innerHTML = '<section><p>Hi</p></section>';
      return div;
    });
    const plain = wrapper.html();
    const pretty = wrapper.html({ pretty: true });
    expect(plain).toContain('<section>');
    expect(pretty).toContain('section');
    expect(pretty.length).toBeGreaterThanOrEqual(plain.length);
  });
});

describe('async helpers (batch 2)', () => {
  it('act flushes effects in one await', async () => {
    let value = 0;
    await act(() => {
      Promise.resolve().then(() => {
        value = 1;
      });
    });
    expect(value).toBe(1);
  });
});

describe('mount options (batch 3)', () => {
  it('children.default becomes props.children', () => {
    const wrapper = mount(
      (props: { children?: unknown }) => {
        const div = document.createElement('div');
        const child = props.children;
        if (child instanceof Node) div.append(child);
        return div;
      },
      { children: { default: '<span class="slot-content">hi</span>' } },
    );
    expect(wrapper.find('.slot-content').text()).toBe('hi');
  });

  it('named children become props.<name>', () => {
    const wrapper = mount(
      (props: { header?: unknown }) => {
        const div = document.createElement('div');
        const header = props.header;
        if (header instanceof Node) div.append(header);
        return div;
      },
      { children: { header: '<h1 class="head">Title</h1>' } },
    );
    expect(wrapper.find('.head').text()).toBe('Title');
  });

  it('global.mocks is injectable via MOCKS_KEY', () => {
    const wrapper = mount(
      () => {
        const mocks = inject<Record<string, unknown>>(MOCKS_KEY);
        const div = document.createElement('div');
        div.textContent = String(mocks?.$route ?? '');
        return div;
      },
      { global: { mocks: { $route: '/home' } } },
    );
    expect(wrapper.text()).toBe('/home');
  });
});

describe('createUser (batch 4)', () => {
  it('returns a fresh isolated user-event session', async () => {
    const onClick = vi.fn();
    const wrapper = mount(() => {
      const b = document.createElement('button');
      b.addEventListener('click', onClick);
      return b;
    });
    const user = createUser({ delay: null });
    await user.click(wrapper.element as HTMLElement);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
