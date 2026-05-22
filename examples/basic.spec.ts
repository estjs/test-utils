import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, mount } from '../src';

afterEach(cleanup);

describe('basic mount', () => {
  it('mounts an element and exposes wrapper assertions', () => {
    const wrapper = mount(() => {
      const button = document.createElement('button');
      button.textContent = 'Save';
      button.className = 'primary';
      return button;
    });

    expect(wrapper.exists()).toBe(true);
    expect(wrapper.text()).toBe('Save');
    expect(wrapper.classes()).toContain('primary');
    expect(wrapper.html()).toContain('<button');
  });

  it('passes props through and reads them via wrapper.props()', () => {
    const wrapper = mount(
      (props: { label: string }) => {
        const div = document.createElement('div');
        div.textContent = props.label;
        return div;
      },
      { props: { label: 'Hello' } },
    );
    expect(wrapper.props()).toEqual({ label: 'Hello' });
    expect(wrapper.text()).toBe('Hello');
  });
});

describe('semantic queries on the wrapper', () => {
  it('queries by accessible role + name', () => {
    const wrapper = mount(() => {
      const div = document.createElement('div');
      div.innerHTML = '<h1>Dashboard</h1>';
      return div;
    });

    expect(wrapper.getByRole('heading').text()).toBe('Dashboard');
  });
});
