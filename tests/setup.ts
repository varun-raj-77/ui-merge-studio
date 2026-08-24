import '@testing-library/jest-dom/vitest';

class TestResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver ??= TestResizeObserver as typeof ResizeObserver;
if (typeof globalThis.MouseEvent !== 'undefined') {
  globalThis.PointerEvent ??= globalThis.MouseEvent as typeof PointerEvent;
}
