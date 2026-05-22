import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, flushPromises, mount, waitForElementToBeRemoved } from '../src';

afterEach(cleanup);

describe('waitForElementToBeRemoved', () => {
  it('resolves once the element is removed', async () => {
    const wrapper = mount(() => {
      const div = document.createElement('div');
      const child = document.createElement('span');
      child.id = 'ephemeral';
      div.append(child);
      setTimeout(() => child.remove(), 10);
      return div;
    });

    const target = wrapper.find('#ephemeral').element;
    await waitForElementToBeRemoved(target);
    expect(target.isConnected).toBe(false);
  });

  it('rejects when the element is already absent', async () => {
    await expect(waitForElementToBeRemoved(document.createElement('div'))).rejects.toThrow(
      /already removed/,
    );
  });

  it('accepts a callback that returns the current node', async () => {
    const wrapper = mount(() => {
      const div = document.createElement('div');
      const child = document.createElement('span');
      child.id = 'late';
      div.append(child);
      setTimeout(() => child.remove(), 10);
      return div;
    });

    await waitForElementToBeRemoved(() =>
      wrapper.find('#late').exists() ? wrapper.find('#late').element : null,
    );
    expect(wrapper.find('#late').exists()).toBe(false);
  });
});

describe('flushPromises', () => {
  it('drains queued microtasks and nextTick', async () => {
    let resolved = false;
    Promise.resolve().then(() => {
      resolved = true;
    });
    await flushPromises();
    expect(resolved).toBe(true);
  });
});
