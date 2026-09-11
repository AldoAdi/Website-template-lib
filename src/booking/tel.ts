/**
 * Turns a phone number written for humans into one a dialler will accept.
 *
 * `(562) 438-8802` is what belongs on the page; `tel:5624388802` is what
 * belongs in the href. Keeping the two apart means the visible number can be
 * formatted however the practice formats it -- including in a non-US style --
 * without anyone hand-maintaining a parallel `tel:` string that silently
 * drifts out of sync with it.
 *
 * A leading `+` is preserved because it is the only part of the punctuation
 * that carries meaning: it marks the number as international (E.164), and a
 * dialler that loses it will fail on a call placed from abroad.
 */
export function toTelHref(phone: string): string {
  const trimmed = phone.trim()
  const digits = trimmed.replace(/\D/g, '')
  const prefix = trimmed.startsWith('+') ? '+' : ''

  return `tel:${prefix}${digits}`
}
