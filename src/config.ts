import { configure as tlConfigure, getConfig as tlGetConfig } from '@testing-library/dom';

export interface Config {
  /** Attribute that `getByTestId` / `queryByTestId` / `findByTestId` will look up. */
  testIdAttribute: string;
  /**
   * Default timeout (ms) used by `waitFor`, `findBy*`, and
   * `waitForElementToBeRemoved`. Forwarded directly to @testing-library/dom.
   */
  asyncUtilTimeout: number;
}

/**
 * Centralised configuration for the package. Backed entirely by
 * @testing-library/dom's config — `configure({ testIdAttribute: 'data-cy' })`
 * will make `getByTestId` look at `data-cy`, exactly like raw testing-library.
 */
export function configure(overrides: Partial<Config>): void {
  const next: Record<string, unknown> = {};
  if (overrides.testIdAttribute !== undefined) next.testIdAttribute = overrides.testIdAttribute;
  if (overrides.asyncUtilTimeout !== undefined) next.asyncUtilTimeout = overrides.asyncUtilTimeout;
  tlConfigure(next as Parameters<typeof tlConfigure>[0]);
}

export function getConfig(): Readonly<Config> {
  const c = tlGetConfig();
  return {
    testIdAttribute: c.testIdAttribute,
    asyncUtilTimeout: c.asyncUtilTimeout,
  };
}
