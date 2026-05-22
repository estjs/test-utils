import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, configure, mount } from '../src';

afterEach(() => {
  cleanup();
  configure({ testIdAttribute: 'data-testid' });
});

describe('wrapper.ByRole', () => {
  it('finds elements by implicit role', () => {
    const wrapper = mount(() => {
      const form = document.createElement('form');
      form.innerHTML = `
        <button type="button">Save</button>
        <a href="/home">Home</a>
        <h2>Title</h2>
        <input type="checkbox" />
        <input type="text" />
      `;
      return form;
    });

    expect(wrapper.getByRole('button').text()).toBe('Save');
    expect(wrapper.getByRole('link').text()).toBe('Home');
    expect(wrapper.getByRole('heading').text()).toBe('Title');
    expect(wrapper.getByRole('checkbox').element.tagName).toBe('INPUT');
    expect(wrapper.getByRole('textbox').element.tagName).toBe('INPUT');
  });

  it('matches role by accessible name', () => {
    const wrapper = mount(() => {
      const div = document.createElement('div');
      div.innerHTML = '<button>Cancel</button><button>Submit</button>';
      return div;
    });

    expect(wrapper.getByRole('button', { name: 'Submit' }).text()).toBe('Submit');
    expect(wrapper.getByRole('button', { name: /cancel/i }).text()).toBe('Cancel');
    expect(wrapper.queryByRole('button', { name: 'Missing' }).exists()).toBe(false);
  });

  it('queryAllByRole + getAllByRole returns multiple wrappers', () => {
    const wrapper = mount(() => {
      const div = document.createElement('div');
      div.innerHTML = '<button>A</button><button>B</button>';
      return div;
    });
    expect(wrapper.queryAllByRole('button')).toHaveLength(2);
    expect(wrapper.getAllByRole('button')).toHaveLength(2);
  });

  it('getAllByRole throws when no match', () => {
    const wrapper = mount(() => document.createElement('div'));
    expect(() => wrapper.getAllByRole('button')).toThrow();
  });

  it('hides aria-hidden subtree by default', () => {
    const wrapper = mount(() => {
      const div = document.createElement('div');
      div.innerHTML =
        '<div aria-hidden="true"><button>Hidden</button></div><button>Visible</button>';
      return div;
    });
    const buttons = wrapper.queryAllByRole('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0].text()).toBe('Visible');
  });
});

describe('wrapper.ByLabelText', () => {
  it('finds by <label for> association', () => {
    const wrapper = mount(() => {
      const div = document.createElement('div');
      div.innerHTML = '<label for="name">Name</label><input id="name" />';
      return div;
    });
    expect(wrapper.getByLabelText('Name').element.tagName).toBe('INPUT');
  });

  it('finds by aria-label', () => {
    const wrapper = mount(() => {
      const div = document.createElement('div');
      div.innerHTML = '<input aria-label="Search" />';
      return div;
    });
    expect(wrapper.getByLabelText('Search').element.tagName).toBe('INPUT');
  });
});

describe('wrapper.ByPlaceholderText / ByDisplayValue / ByAltText / ByTitle / ByTestId', () => {
  it('all five base queries', () => {
    const wrapper = mount(() => {
      const div = document.createElement('div');
      div.innerHTML = `
        <input placeholder="Search…" />
        <input id="active" />
        <img alt="Logo" />
        <button title="Save changes">SaveIcon</button>
      `;
      const input = div.querySelector<HTMLInputElement>('#active')!;
      input.value = 'preset';
      return div;
    });

    expect(wrapper.getByPlaceholderText('Search…').element.tagName).toBe('INPUT');
    expect(wrapper.getByDisplayValue('preset').element.tagName).toBe('INPUT');
    expect(wrapper.getByAltText('Logo').element.tagName).toBe('IMG');
    expect(wrapper.getByTitle('Save changes').text()).toBe('SaveIcon');
  });

  it('testId respects configure()', () => {
    const wrapper = mount(() => {
      const div = document.createElement('div');
      div.innerHTML = '<span data-testid="x">A</span><span data-cy="y">B</span>';
      return div;
    });
    expect(wrapper.getByTestId('x').text()).toBe('A');
    configure({ testIdAttribute: 'data-cy' });
    expect(wrapper.getByTestId('y').text()).toBe('B');
  });
});

describe('wrapper.ByText', () => {
  it('matches the element that directly contains the text', () => {
    const wrapper = mount(() => {
      const div = document.createElement('div');
      div.innerHTML = '<section><p>Hello</p></section>';
      return div;
    });
    expect(wrapper.getByText('Hello').element.tagName).toBe('P');
    expect(wrapper.queryByText('Hello').element.tagName).toBe('P');
  });

  it('ignores <script> and <style> content', () => {
    const wrapper = mount(() => {
      const div = document.createElement('div');
      div.innerHTML = '<style>.x{color:red}</style><p>red</p>';
      return div;
    });
    expect(wrapper.getByText(/red/).element.tagName).toBe('P');
  });
});

describe('wrapper chaining', () => {
  it('chains semantic queries through nested wrappers', () => {
    const wrapper = mount(() => {
      const div = document.createElement('div');
      div.innerHTML = `
        <section data-testid="a"><button>A</button></section>
        <section data-testid="b"><button>B</button></section>
      `;
      return div;
    });
    expect(wrapper.getByTestId('a').getByRole('button').text()).toBe('A');
    expect(wrapper.getByTestId('b').getByRole('button').text()).toBe('B');
  });
});

describe('async findByX', () => {
  it('resolves once a matching element appears', async () => {
    const wrapper = mount(() => {
      const div = document.createElement('div');
      setTimeout(() => {
        const btn = document.createElement('button');
        btn.textContent = 'Ready';
        div.append(btn);
      }, 10);
      return div;
    });
    const btn = await wrapper.findByRole('button');
    expect(btn.text()).toBe('Ready');
  });

  it('findAllByRole resolves once any match exists', async () => {
    const wrapper = mount(() => {
      const div = document.createElement('div');
      setTimeout(() => {
        div.innerHTML = '<button>A</button><button>B</button>';
      }, 10);
      return div;
    });
    const buttons = await wrapper.findAllByRole('button');
    expect(buttons).toHaveLength(2);
  });

  it('fast-fails on a disconnected wrapper without paying the timeout', async () => {
    const wrapper = mount(() => document.createElement('div'));
    const miss = wrapper.queryByRole('button');
    expect(miss.exists()).toBe(false);
    const started = Date.now();
    await expect(miss.findByRole('button')).rejects.toThrow();
    // Should reject immediately, well under testing-library's default 1000ms.
    expect(Date.now() - started).toBeLessThan(50);
  });
});
