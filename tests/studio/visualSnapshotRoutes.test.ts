import { expect, test } from 'vitest';
import { isSafeCaptureRoute } from '../../apps/studio/src/visualSnapshotRoutes';

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
