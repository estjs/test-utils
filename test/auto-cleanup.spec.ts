import { describe, expect, it } from 'vitest';
import { mount } from '../src';

// This file deliberately does NOT call cleanup() in afterEach. The fact that
// importing from '../src' registered an auto-cleanup with vitest is verified
// by the second test seeing an empty document.body.

describe('auto cleanup', () => {
  it('mounts something — leaves nodes in the DOM during the test', () => {
    const wrapper = mount(() => {
      const div = document.createElement('div');
      div.textContent = 'leftover';
      return div;
    });
    expect(wrapper.exists()).toBe(true);
    expect(document.body.children.length).toBeGreaterThan(0);
  });

  it('subsequent test starts with an empty body thanks to auto-cleanup', () => {
    expect(document.body.children.length).toBe(0);
  });
});
