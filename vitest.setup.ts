import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'

// jsdom does not implement these; several components rely on them.
if (!('matchMedia' in window)) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

if (!('createObjectURL' in URL)) {
  // @ts-expect-error -- test shim
  URL.createObjectURL = () => 'blob:mock'
}
if (!('revokeObjectURL' in URL)) {
  // @ts-expect-error -- test shim
  URL.revokeObjectURL = () => {}
}

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}
