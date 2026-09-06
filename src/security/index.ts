// Reached via the "./security" subpath.
export {
  sanitizeText,
  validateContactSubmission,
  NAME_MIN_LENGTH,
  NAME_MAX_LENGTH,
  EMAIL_MAX_LENGTH,
  MESSAGE_MIN_LENGTH,
  MESSAGE_MAX_LENGTH,
} from './validate'
export type {
  ContactSubmission,
  RawContactSubmission,
  FieldErrors,
  ValidationResult,
} from './validate'
export { isSpamSubmission, MIN_DWELL_TIME_MS } from './honeypot'
export type { HoneypotCheck } from './honeypot'
export { securityHeaders, getHttpSecurityHeaders, getMetaSecurityTags } from './headers'
export type { SecurityHeaders, HttpSecurityHeader, MetaSecurityTag } from './headers'
