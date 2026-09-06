// Reached via the "./analytics" subpath. T9 adds gtag, track and
// GoogleAnalytics here; consent is the gate they all sit behind.
export { getConsentState, hasConsent, grantConsent, denyConsent, onConsentChange } from './consent'
export type { ConsentState, ConsentListener } from './consent'
