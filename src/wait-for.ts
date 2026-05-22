import { nextTick } from 'essor';

export {
  waitFor,
  waitForElementToBeRemoved,
  type waitForOptions as WaitForOptions,
} from '@testing-library/dom';

/**
 * Wait for essor's reactive tick + a microtask. Useful when assertions need
 * to run after both queued reactive updates and any queued promise jobs.
 * Not provided by testing-library because it's framework-specific.
 */
export async function flushPromises(): Promise<void> {
  await nextTick();
  await Promise.resolve();
}
