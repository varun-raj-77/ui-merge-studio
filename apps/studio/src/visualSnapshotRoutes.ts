/**
 * Capture locations are explicit local pathname observations, never hosts,
 * URLs, queries, fragments, encoded separators, or traversal instructions.
 */
export function isSafeCaptureRoute(value: unknown): value is string {
  return typeof value === 'string'
    && value.length >= 1 && value.length <= 180
    && (value === '/' || /^\/[A-Za-z0-9._~-]+(?:\/[A-Za-z0-9._~-]+)*\/?$/.test(value))
    && !value.split('/').some(segment => segment === '.' || segment === '..');
}

/** Compare browser landing locations after React-router redirects and History API changes. */
export function matchesCaptureLocation(requestedUrl: string, actualUrl: string) {
  try {
    const requested = new URL(requestedUrl);
    const actual = new URL(actualUrl);
    return actual.origin === requested.origin && actual.pathname === requested.pathname
      && !actual.search && !actual.hash;
  } catch { return false; }
}
