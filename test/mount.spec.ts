import { afterEach, describe, expect, it, vi } from 'vitest';
import { onDestroy } from 'essor';
import { cleanup, fireEvent, mount, waitFor } from '../src';
import { createEmptyWrapper } from '../src/wrapper';

afterEach(() => {
  cleanup();
});

describe('@estjs/test-utils', () => {
  it('mounts a component and exposes wrapper queries', () => {
    const wrapper = mount(() => {
      const section = document.createElement('section');
      section.innerHTML = '<button class="save">Save</button><p>Hello Essor</p>';
      return section;
    });

    expect(wrapper.exists()).toBe(true);
    expect(wrapper.html()).toBe(
      '<section><button class="save">Save</button><p>Hello Essor</p></section>',
    );
    expect(wrapper.text()).toBe('SaveHello Essor');
    expect(wrapper.find('button').text()).toBe('Save');
    expect(wrapper.get('button').element).toBe(wrapper.find('.save').element);
    expect(wrapper.queryByText('Hello Essor').element.tagName).toBe('P');
  });

  it('throws a useful error when get cannot find a selector', () => {
    const wrapper = mount(() => document.createElement('main'));

    expect(() => wrapper.get('button')).toThrow('Unable to find button');
  });

  it('triggers DOM events and updates form controls', async () => {
    const onClick = vi.fn();
    const onInput = vi.fn();

    const wrapper = mount(() => {
      const form = document.createElement('form');
      const button = document.createElement('button');
      const input = document.createElement('input');

      button.type = 'button';
      button.textContent = 'Submit';
      button.addEventListener('click', onClick);
      input.addEventListener('input', () => onInput(input.value));

      form.append(button, input);
      return form;
    });

    await wrapper.find('button').trigger('click');
    await wrapper.find('input').setValue('typed');

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onInput).toHaveBeenCalledWith('typed');
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('typed');
  });

  it('updates component props without remounting the DOM', () => {
    let renders = 0;
    let capturedProps: any;

    const wrapper = mount(
      (props: { label?: string }) => {
        renders++;
        capturedProps = props;
        const button = document.createElement('button');
        button.textContent = props.label ?? '';
        return button;
      },
      {
        props: { label: 'First' },
      },
    );

    const firstElement = wrapper.element;

    wrapper.setProps({ label: 'Second' });

    expect(renders).toBe(1);
    expect(wrapper.element).toBe(firstElement);
    expect(capturedProps.label).toBe('Second');
  });

  it('unmounts one wrapper and cleanup removes every mounted wrapper', () => {
    const destroyed = vi.fn();

    const first = mount(() => {
      onDestroy(destroyed);
      const div = document.createElement('div');
      div.textContent = 'first';
      return div;
    });
    const second = mount(() => {
      const div = document.createElement('div');
      div.textContent = 'second';
      return div;
    });

    first.unmount();

    expect(first.exists()).toBe(false);
    expect(second.exists()).toBe(true);
    expect(destroyed).toHaveBeenCalledTimes(1);

    cleanup();

    expect(document.body.innerHTML).toBe('');
    expect(second.exists()).toBe(false);
  });

  it('mount provides container-scoped wrapper queries', () => {
    const wrapper = mount(() => {
      const article = document.createElement('article');
      article.innerHTML = '<h1>Dashboard</h1><button>Refresh</button>';
      return article;
    });

    expect(wrapper.getByText('Dashboard').element.tagName).toBe('H1');
    expect(wrapper.queryByText('Missing').exists()).toBe(false);
    expect(wrapper.getByRole('button').text()).toBe('Refresh');
  });

  it('waits for asynchronous assertions', async () => {
    const wrapper = mount(() => {
      const div = document.createElement('div');
      div.textContent = 'Loading';
      setTimeout(() => {
        div.textContent = 'Ready';
      }, 0);
      return div;
    });

    await waitFor(() => {
      expect(wrapper.text()).toBe('Ready');
    });
  });

  it('dispatches events with fireEvent helpers', async () => {
    const onChange = vi.fn();
    const wrapper = mount(() => {
      const input = document.createElement('input');
      input.addEventListener('change', onChange);
      return input;
    });

    await fireEvent.change(wrapper.element, { target: { value: 'changed' } });

    expect((wrapper.element as HTMLInputElement).value).toBe('changed');
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('setProps preserves reactive getter descriptors across partial updates', async () => {
    let store = { count: 1 };

    const initialProps = {} as { count: number; label: string };
    Object.defineProperty(initialProps, 'count', {
      enumerable: true,
      configurable: true,
      get: () => store.count,
    });
    initialProps.label = 'initial';

    const seen: number[] = [];
    const wrapper = mount(
      (props: { count: number; label: string }) => {
        const div = document.createElement('div');
        Object.defineProperty(div, 'getCount', { value: () => props.count });
        div.textContent = `${props.label}:${props.count}`;
        seen.push(props.count);
        return div;
      },
      { props: initialProps },
    );

    // Mutating the source signal-like store should be observable through the
    // wrapper's component.props — proves the getter descriptor survived.
    store = { count: 99 };
    expect((wrapper.element as HTMLDivElement & { getCount: () => number }).getCount()).toBe(99);

    await wrapper.setProps({ label: 'updated' });
    store = { count: 7 };
    expect((wrapper.element as HTMLDivElement & { getCount: () => number }).getCount()).toBe(7);
  });

  it('mounts a component whose initial root is a comment anchor', () => {
    const wrapper = mount(() => {
      const fragment = document.createDocumentFragment();
      fragment.append(document.createComment('anchor'));
      return fragment;
    });
    expect(wrapper.exists()).toBe(true);
    // No element was rendered, so the wrapper falls back to the container.
    expect(wrapper.element).toBe(wrapper.container);
  });

  it('emptyWrapper returns empty defaults for attributes/classes', () => {
    const empty = createEmptyWrapper('.does-not-exist');
    expect(empty.exists()).toBe(false);
    expect(empty.attributes()).toEqual({});
    expect(empty.attributes('id')).toBeUndefined();
    expect(empty.classes()).toEqual([]);
  });

  it('fireEvent.keydown forwards detail and key', async () => {
    let captured: KeyboardEvent | undefined;
    const wrapper = mount(() => {
      const input = document.createElement('input');
      input.addEventListener('keydown', (e) => {
        captured = e as KeyboardEvent;
      });
      return input;
    });

    await fireEvent.keydown(wrapper.element, { key: 'Enter', detail: 2 } as any);

    expect(captured?.key).toBe('Enter');
    expect(captured?.detail).toBe(2);
  });
});
