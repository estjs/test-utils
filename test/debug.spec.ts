import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, logRoles, mount, prettyDOM } from '../src';

afterEach(cleanup);

// @testing-library/dom's prettyDOM emits ANSI-coloured output via pretty-format.
// Strip the escape codes before comparing so the assertions are color-agnostic.
function plain(str: string | false | null): string {
  if (typeof str !== 'string') return '';
  // eslint-disable-next-line no-control-regex
  return str.replaceAll(/\[\d+m/g, '');
}

describe('prettyDOM', () => {
  it('renders the element tree', () => {
    const wrapper = mount(() => {
      const div = document.createElement('div');
      div.innerHTML = '<section><p>Hi</p></section>';
      return div;
    });
    const out = plain(prettyDOM(wrapper.element));
    expect(out).toContain('<div>');
    expect(out).toContain('<section>');
    expect(out).toContain('<p>');
    expect(out).toContain('Hi');
  });

  it('respects the maxLength cap', () => {
    const wrapper = mount(() => {
      const ul = document.createElement('ul');
      for (let i = 0; i < 50; i++) {
        const li = document.createElement('li');
        li.textContent = `${i}`;
        ul.append(li);
      }
      return ul;
    });
    const out = plain(prettyDOM(wrapper.element, 60));
    expect(out.length).toBeLessThan(120); // truncation note + the cap
  });
});

describe('logRoles', () => {
  it('lists elements grouped by role', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    mount(() => {
      const div = document.createElement('div');
      div.innerHTML = '<button>Save</button><a href="/">Home</a>';
      return div;
    });
    logRoles(document.body);
    expect(spy).toHaveBeenCalled();
    const output = plain(spy.mock.calls.map((c) => String(c[0])).join('\n'));
    expect(output).toMatch(/button/);
    expect(output).toMatch(/link/);
    spy.mockRestore();
  });
});
