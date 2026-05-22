import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, mount, resetUserEvent, userEvent } from '../src';

afterEach(cleanup);

describe('resetUserEvent', () => {
  it('discards the cached session so a fresh one is built on the next access', async () => {
    const wrapper = mount(() => document.createElement('button'));
    // Touch the proxy so a session exists.
    await userEvent.click(wrapper.element);
    // Resetting after use should not throw on the next access.
    expect(() => resetUserEvent()).not.toThrow();
    // Subsequent calls should still work — a brand-new session is set up.
    await userEvent.click(wrapper.element);
  });
});
