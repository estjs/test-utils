import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, dispatch, fireEvent, mount, setValue } from '../src';

afterEach(cleanup);

describe('fireEvent.*', () => {
  it('triggers click and awaits nextTick', async () => {
    const onClick = vi.fn();
    const wrapper = mount(() => {
      const button = document.createElement('button');
      button.addEventListener('click', onClick);
      return button;
    });
    await fireEvent.click(wrapper.element);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('input forwards target.value through applyTarget', async () => {
    const onInput = vi.fn();
    const wrapper = mount(() => {
      const input = document.createElement('input');
      input.addEventListener('input', () => onInput(input.value));
      return input;
    });
    await fireEvent.input(wrapper.element, { target: { value: 'hello' } });
    expect(onInput).toHaveBeenCalledWith('hello');
    expect((wrapper.element as HTMLInputElement).value).toBe('hello');
  });

  it('keydown forwards key/code/detail', async () => {
    let captured: KeyboardEvent | undefined;
    const wrapper = mount(() => {
      const input = document.createElement('input');
      input.addEventListener('keydown', (e) => {
        captured = e as KeyboardEvent;
      });
      return input;
    });
    await fireEvent.keydown(wrapper.element, { key: 'Enter', code: 'Enter', detail: 3 } as any);
    expect(captured?.key).toBe('Enter');
    expect(captured?.detail).toBe(3);
  });

  it('supports raw event objects via the fireEvent callable', async () => {
    const onClick = vi.fn();
    const wrapper = mount(() => {
      const button = document.createElement('button');
      button.addEventListener('click', onClick);
      return button;
    });
    await fireEvent(wrapper.element, new MouseEvent('click', { bubbles: true }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('dispatch()', () => {
  it('dispatches CustomEvent when a detail is provided for non-built-in types', async () => {
    let detail: unknown;
    const wrapper = mount(() => {
      const div = document.createElement('div');
      div.addEventListener('my-event', (e) => {
        detail = (e as CustomEvent).detail;
      });
      return div;
    });
    await dispatch(wrapper.element, 'my-event', { detail: { foo: 1 } });
    expect(detail).toEqual({ foo: 1 });
  });

  it('writes target properties via defineProperty when not assignable', async () => {
    const wrapper = mount(() => document.createElement('div'));
    // Read-only via plain assignment, but configurable=true ensures the
    // fallback defineProperty branch handles it.
    Object.defineProperty(wrapper.element, 'frozen', { value: 'old', configurable: true });
    await dispatch(wrapper.element, 'custom', { target: { frozen: 'new' } });
    expect((wrapper.element as unknown as { frozen: string }).frozen).toBe('new');
  });
});

describe('setValue()', () => {
  it('toggles checkbox.checked + dispatches change', async () => {
    const onChange = vi.fn();
    const wrapper = mount(() => {
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.addEventListener('change', onChange);
      return input;
    });
    await setValue(wrapper.element, true);
    expect((wrapper.element as HTMLInputElement).checked).toBe(true);
    expect(onChange).toHaveBeenCalled();
  });

  it('sets value on textarea + dispatches input', async () => {
    const onInput = vi.fn();
    const wrapper = mount(() => {
      const ta = document.createElement('textarea');
      ta.addEventListener('input', onInput);
      return ta;
    });
    await setValue(wrapper.element, 'multi\nline');
    expect((wrapper.element as HTMLTextAreaElement).value).toBe('multi\nline');
    expect(onInput).toHaveBeenCalled();
  });

  it('throws on non-editable elements', async () => {
    const wrapper = mount(() => document.createElement('div'));
    await expect(setValue(wrapper.element, 'x')).rejects.toThrow(/input, textarea, or select/);
  });
});
