// Public barrel export for @aldoadi/website-template.
// Config, analytics, security and seo are reached via their own subpaths —
// next.config.ts must be able to import config without pulling React into
// the config graph, and a site should not pay for analytics just by
// importing a button.
export * from './theme'
export * from './components'
