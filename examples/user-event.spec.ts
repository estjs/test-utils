import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, createUser, mount, userEvent } from '../src';

afterEach(cleanup);

describe('user-event', () => {
  it('clicks a button and focuses it', async () => {
    const onClick = vi.fn();
    const wrapper = mount(() => {
      const b = document.createElement('button');
      b.textContent = 'Go';
      b.addEventListener('click', onClick);
      return b;
    });

    await userEvent.click(wrapper.element);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(wrapper.element);
  });

  it('types into an input character by character', async () => {
    const seen: string[] = [];
    const wrapper = mount(() => {
      const input = document.createElement('input');
      input.addEventListener('input', () => seen.push(input.value));
      return input;
    });

    await userEvent.type(wrapper.element, 'abc{Enter}');
    expect((wrapper.element as HTMLInputElement).value).toBe('abc');
    expect(seen).toEqual(['a', 'ab', 'abc']);
  });

  it('selects an option in a <select>', async () => {
    const wrapper = mount(() => {
      const s = document.createElement('select');
      s.innerHTML = '<option value="a">A</option><option value="b">B</option>';
      return s;
    });

    await userEvent.selectOptions(wrapper.element as HTMLSelectElement, 'b');
    expect((wrapper.element as HTMLSelectElement).value).toBe('b');
  });

  it('createUser() gives an isolated session with custom options', async () => {
    const onClick = vi.fn();
    const wrapper = mount(() => {
      const b = document.createElement('button');
      b.addEventListener('click', onClick);
      return b;
    });

    const user = createUser({ delay: null });
    await user.click(wrapper.element as HTMLElement);
    await user.click(wrapper.element as HTMLElement);
    expect(onClick).toHaveBeenCalledTimes(2);
  });
});
