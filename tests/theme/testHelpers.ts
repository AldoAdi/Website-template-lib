// Shared test-only helpers for theme specs. jsdom does not implement
// matchMedia, but next-themes calls it unconditionally (system-theme
// resolution) even when a component never touches "system" itself.
export function mockMatchMedia(matches: boolean): void {
  window.matchMedia = ((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}
