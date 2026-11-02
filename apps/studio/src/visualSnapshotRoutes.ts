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
