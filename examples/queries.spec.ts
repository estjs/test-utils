import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, mount } from '../src';

afterEach(cleanup);

describe('semantic queries', () => {
  it('finds elements by accessible role + name', () => {
    const wrapper = mount(() => {
      const div = document.createElement('div');
      div.innerHTML = `
        <button>Cancel</button>
        <button>Save</button>
      `;
      return div;
    });
    expect(wrapper.getByRole('button', { name: 'Save' }).text()).toBe('Save');
    expect(wrapper.getByRole('button', { name: /cancel/i }).text()).toBe('Cancel');
  });

  it('finds form inputs by their label', () => {
    const wrapper = mount(() => {
      const form = document.createElement('form');
      form.innerHTML = `
        <label for="email">Email</label>
        <input id="email" type="email" placeholder="you@example.com" />
      `;
      return form;
    });

    expect(wrapper.getByLabelText('Email').element).toBeInstanceOf(HTMLInputElement);
    expect(wrapper.getByPlaceholderText(/you@example/).element).toBeInstanceOf(HTMLInputElement);
  });

  it('returns an empty wrapper when queryBy* misses', () => {
    const wrapper = mount(() => {
      const div = document.createElement('div');
      div.innerHTML = '<p>Hello</p>';
      return div;
    });

    const miss = wrapper.queryByRole('button');
    expect(miss.exists()).toBe(false);
  });

  it('chains through nested wrappers', () => {
    const wrapper = mount(() => {
      const div = document.createElement('div');
      div.innerHTML = `
        <section data-testid="hero"><button>Start</button></section>
      `;
      return div;
    });

    expect(wrapper.getByTestId('hero').getByRole('button').text()).toBe('Start');
  });
});
