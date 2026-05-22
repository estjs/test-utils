import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, mount } from '../src';

afterEach(cleanup);

describe('dOMWrapper.findAll / getAll', () => {
  it('findAll returns wrappers for each match', () => {
    const wrapper = mount(() => {
      const div = document.createElement('div');
      div.innerHTML = '<span>1</span><span>2</span><span>3</span>';
      return div;
    });
    const spans = wrapper.findAll('span');
    expect(spans).toHaveLength(3);
    expect(spans.map((w) => w.text())).toEqual(['1', '2', '3']);
  });

  it('getAll throws when nothing matches', () => {
    const wrapper = mount(() => document.createElement('div'));
    expect(() => wrapper.getAll('button')).toThrow('Unable to find button');
  });
});

describe('dOMWrapper.isVisible', () => {
  it('returns false when display:none / visibility:hidden / detached', () => {
    const wrapper = mount(() => {
      const div = document.createElement('div');
      div.innerHTML = `
        <p id="ok">ok</p>
        <p id="none" style="display: none;">none</p>
        <p id="hidden" style="visibility: hidden;">hidden</p>
      `;
      return div;
    });
    expect(wrapper.find('#ok').isVisible()).toBe(true);
    expect(wrapper.find('#none').isVisible()).toBe(false);
    expect(wrapper.find('#hidden').isVisible()).toBe(false);
  });
});

describe('componentWrapper.props / emitted', () => {
  it('props() returns a snapshot of current props', () => {
    const wrapper = mount(
      (props: { label: string }) => {
        const div = document.createElement('div');
        div.textContent = props.label;
        return div;
      },
      { props: { label: 'Hello' } },
    );
    expect(wrapper.props()).toEqual({ label: 'Hello' });
  });

  it('emitted() returns empty record without record:true', () => {
    const wrapper = mount(() => document.createElement('button'), { props: { onClick: vi.fn() } });
    expect(wrapper.emitted()).toEqual({});
    expect(wrapper.emitted('click')).toBeUndefined();
  });

  it('record:true captures onXxx handler calls without breaking user handler', () => {
    const userHandler = vi.fn();
    // essor auto-wires `onClick` on the root element of a component — no
    // manual addEventListener needed inside the component fn.
    const wrapper = mount(() => document.createElement('button'), {
      props: { onClick: userHandler },
      record: true,
    });

    wrapper.element.dispatchEvent(new MouseEvent('click'));
    wrapper.element.dispatchEvent(new MouseEvent('click'));

    expect(userHandler).toHaveBeenCalledTimes(2);
    expect(wrapper.emitted('click')).toHaveLength(2);
  });

  it('record:true wraps onXxx handlers exposed via reactive getter descriptors', () => {
    const handler = vi.fn();
    const props = {} as { onClick: () => void };
    Object.defineProperty(props, 'onClick', {
      enumerable: true,
      configurable: true,
      get: () => handler,
    });

    const wrapper = mount(() => document.createElement('button'), {
      props,
      record: true,
    });

    wrapper.element.dispatchEvent(new MouseEvent('click'));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted('click')).toHaveLength(1);
  });

  it('record:true ignores keys that just happen to start with "on"', () => {
    const wrapper = mount(() => document.createElement('button'), {
      // `on_click` and `online` are not handlers — must not be wrapped.
      props: { on_click: 'noop', online: true } as Record<string, unknown>,
      record: true,
    });
    wrapper.element.dispatchEvent(new MouseEvent('click'));
    expect(wrapper.emitted()).toEqual({});
  });
});

describe('mount global.provide', () => {
  it('makes provided values visible via inject', async () => {
    const { inject } = await import('essor');
    const wrapper = mount(
      () => {
        const value = inject<string>('theme');
        const div = document.createElement('div');
        div.textContent = value ?? '';
        return div;
      },
      {
        global: { provide: { theme: 'dark' } },
      },
    );
    expect(wrapper.text()).toBe('dark');
  });
});
