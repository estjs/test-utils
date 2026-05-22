import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, configure, getConfig, mount } from '../src';

afterEach(() => {
  cleanup();
  configure({ testIdAttribute: 'data-testid' });
});

describe('configure / getConfig', () => {
  it('reflects overrides', () => {
    configure({ testIdAttribute: 'data-cy' });
    expect(getConfig().testIdAttribute).toBe('data-cy');
  });

  it('queries follow the configured testIdAttribute', () => {
    configure({ testIdAttribute: 'data-cy' });
    const wrapper = mount(() => {
      const div = document.createElement('div');
      div.innerHTML = '<span data-cy="x">A</span>';
      return div;
    });
    expect(wrapper.getByTestId('x').text()).toBe('A');
  });
});
