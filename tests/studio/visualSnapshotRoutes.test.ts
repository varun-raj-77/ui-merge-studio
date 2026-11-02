import { expect, test } from 'vitest';
import { isSafeCaptureRoute, matchesCaptureLocation } from '../../apps/studio/src/visualSnapshotRoutes';

test.each(['/', '/catalogue', '/products/desk-stand', '/feature/item_v2', '/v1.2/details/'])(
  'accepts a bounded, relative local capture route %s', route => {
    expect(isSafeCaptureRoute(route)).toBe(true);
  }
);

test.each([
  '', 'catalogue', '//host', 'https://example.com', '/a//b', '/a/../b', '/a/./b',
  '/%2e%2e/', '/a%2fb', '/a?query=1', '/a#fragment', '/a\\b',
  '/' + 'x'.repeat(180)
])('rejects an unsafe screenshot route %s', route => {
  expect(isSafeCaptureRoute(route)).toBe(false);
});


test('refuses browser redirects, origin changes, and hidden query state for route evidence', () => {
  const requested = 'http://127.0.0.1:48210/products/desk-stand';
  expect(matchesCaptureLocation(requested, requested)).toBe(true);
  for (const observed of [
    'http://127.0.0.1:48210/catalogue',
    'http://127.0.0.1:48211/products/desk-stand',
    'https://example.com/products/desk-stand',
    requested + '?item=other', requested + '#details', 'not a url'
  ]) expect(matchesCaptureLocation(requested, observed)).toBe(false);
});
