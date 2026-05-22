import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, mount } from '../src';

afterEach(cleanup);

describe('emitted (record mode)', () => {
  it('captures onXxx callback invocations while still calling the user handler', () => {
    const userHandler = vi.fn();
    const wrapper = mount(() => document.createElement('button'), {
      props: { onClick: userHandler },
      record: true,
    });

    wrapper.element.dispatchEvent(new MouseEvent('click'));
    wrapper.element.dispatchEvent(new MouseEvent('click'));

    expect(userHandler).toHaveBeenCalledTimes(2);
    expect(wrapper.emitted('click')).toHaveLength(2);
  });

  it('returns empty record when `record` is not enabled', () => {
    const wrapper = mount(() => document.createElement('button'), {
      props: { onClick: vi.fn() },
    });
    expect(wrapper.emitted()).toEqual({});
    expect(wrapper.emitted('click')).toBeUndefined();
  });
});
