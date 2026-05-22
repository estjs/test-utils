import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, mount, userEvent } from '../src';

afterEach(cleanup);

describe('userEvent', () => {
  it('click fires the full pointer/mouse/click sequence and focuses', async () => {
    const events: string[] = [];
    const wrapper = mount(() => {
      const button = document.createElement('button');
      for (const type of ['pointerdown', 'mousedown', 'focus', 'pointerup', 'mouseup', 'click']) {
        button.addEventListener(type, () => events.push(type));
      }
      return button;
    });

    await userEvent.click(wrapper.element);

    expect(events).toEqual(['pointerdown', 'mousedown', 'focus', 'pointerup', 'mouseup', 'click']);
    expect(document.activeElement).toBe(wrapper.element);
  });

  it('type appends characters and fires input per char', async () => {
    const inputs: string[] = [];
    const wrapper = mount(() => {
      const input = document.createElement('input');
      input.addEventListener('input', () => inputs.push(input.value));
      return input;
    });

    await userEvent.type(wrapper.element, 'abc');

    expect((wrapper.element as HTMLInputElement).value).toBe('abc');
    expect(inputs).toEqual(['a', 'ab', 'abc']);
  });

  it('type handles {Backspace} and {Enter}', async () => {
    const keys: string[] = [];
    const wrapper = mount(() => {
      const input = document.createElement('input');
      input.addEventListener('keydown', (e) => keys.push((e as KeyboardEvent).key));
      return input;
    });

    (wrapper.element as HTMLInputElement).value = 'ab';
    await userEvent.type(wrapper.element, '{Backspace}{Enter}');

    expect((wrapper.element as HTMLInputElement).value).toBe('a');
    expect(keys).toEqual(['Backspace', 'Enter']);
  });

  it('clear empties an editable element and dispatches input', async () => {
    const onInput = vi.fn();
    const wrapper = mount(() => {
      const input = document.createElement('input');
      input.value = 'preset';
      input.addEventListener('input', onInput);
      return input;
    });

    await userEvent.clear(wrapper.element as HTMLInputElement);

    expect((wrapper.element as HTMLInputElement).value).toBe('');
    expect(onInput).toHaveBeenCalled();
    // @testing-library/user-event v14: change is only dispatched on blur, not by clear()
  });

  it('selectOptions updates a <select>', async () => {
    const onChange = vi.fn();
    const wrapper = mount(() => {
      const select = document.createElement('select');
      select.innerHTML = '<option value="a">A</option><option value="b">B</option>';
      select.addEventListener('change', onChange);
      return select;
    });

    await userEvent.selectOptions(wrapper.element, 'b');

    expect((wrapper.element as HTMLSelectElement).value).toBe('b');
    expect(onChange).toHaveBeenCalled();
  });

  it('tab cycles between focusables', async () => {
    mount(() => {
      const div = document.createElement('div');
      div.innerHTML = '<button id="a">A</button><input id="b" /><button id="c">C</button>';
      return div;
    });

    await userEvent.tab();
    expect((document.activeElement as HTMLElement).id).toBe('a');
    await userEvent.tab();
    expect((document.activeElement as HTMLElement).id).toBe('b');
    await userEvent.tab({ shift: true });
    expect((document.activeElement as HTMLElement).id).toBe('a');
  });

  it('wrapper.user binds to the element', async () => {
    const onClick = vi.fn();
    const wrapper = mount(() => {
      const btn = document.createElement('button');
      btn.addEventListener('click', onClick);
      return btn;
    });

    await wrapper.user.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
