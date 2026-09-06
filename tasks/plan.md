# Implementation Plan: `@aldoadi/website-template` v0.1.0

Spec: [SPEC.md](../SPEC.md) (approved, v2)
Date: 2026-09-06
Status: awaiting review

---

## Overview

Build a shared Next.js 16 component + utility library, distributed by pinned git URL, plus a starter repo that clones into each new site. v1 scope is exactly what the starter's sample page renders: Header, Hero, FeatureGrid, CTA, ContactForm, Footer, CookieBanner — with GA4 behind consent, light/dark theming, SEO, and security headers. Everything must build under `output: 'export'` so prototypes can go to GitHub Pages.

16 tasks across 6 phases. Highest-risk work is Phase 1 — the distribution mechanism is unproven and everything else assumes it works.

---

## Architecture Decisions

1. **Walking skeleton before features.** Phase 1 proves `npm i github:...` + `transpilePackages` + Tailwind v4 source scanning + static export, using one trivial component. If any of that fails, it fails on day one when changing course is cheap — not after 12 components are written.
2. **Static export is the floor, not a mode.** Nothing in the library may need a server. This is a constraint on every task, not a Phase 6 concern.
3. **`defineNextConfig` built early (T3).** Both deploy targets are exercised from the start so a target-specific break surfaces immediately, not at ship time.
4. **Theme before components (Phase 2).** Every component reads CSS variables. Building components first would mean retrofitting them.
5. **Behavioral logic is TDD'd, presentational components are not.** Consent gating, the analytics queue, validation, and honeypot get failing-test-first treatment. Layout and content components get render + a11y tests written alongside. The 80% coverage floor is earned by logic modules carrying real tests, not by chasing coverage on markup.
6. **TypeScript pinned to 6.0.3.** `typescript-eslint@8.69` caps at `<6.1.0`. See spec.
7. **Two repos, one plan.** The starter is not an afterthought — it is the integration test for the library. It appears in Phase 1 and grows with each phase.

---

## Dependency Graph

```
T1 Library scaffold
 │
 ├──> T2 Starter scaffold + git-URL install (walking skeleton)
 │     │
 │     └──> T3 defineNextConfig (vercel | github-pages)
 │            │
 │            ├──> T4 Theme tokens + ThemeProvider + ThemeToggle
 │            │     │
 │            │     ├──> T5 Layout: Container, Section, Header, Footer
 │            │     │     │
 │            │     │     ├──> T6 Hero + CTA
 │            │     │     └──> T7 Card + FeatureGrid
 │            │     │
 │            │     └──> T8 Consent module + CookieBanner
 │            │            │
 │            │            └──> T9 Analytics: gtag, track, queue, GA component
 │            │
 │            └──> T14 Security headers (both shapes) ──> folds into T3's config
 │
 ├──> T10 Validation + honeypot            (independent of theme — parallelizable)
 │     │
 │     └──> T11 ContactForm + useFormPost  (needs T5 for Field styling)
 │
 └──> T12 SEO metadata + JSON-LD           (independent — parallelizable)
       │
       └──> T13 sitemap + robots (static-safe)

T15 Docs                       <── everything
T16 Tag, push, deploy both     <── everything
```

**Parallelizable:** T10 and T12 depend only on T1 and can run alongside Phase 2. T6 and T7 are independent of each other.
**Strictly sequential:** T1 → T2 → T3, each proving the next is possible. T8 → T9, since analytics is meaningless without the consent gate.

---

## Phases

### Phase 1: Walking Skeleton — prove the architecture

The riskiest phase. Four unproven assumptions get tested: raw-TS distribution via git URL, `transpilePackages` with React 19 + Next 16, Tailwind v4 scanning a `node_modules` package for class names, and static export with `basePath`.

- **T1** Library scaffold
- **T2** Starter scaffold + install library from git URL, one trivial component renders
- **T3** `defineNextConfig` — both targets build

**Checkpoint A** — architecture proven or dead. Do not proceed without both builds green.

### Phase 2: Theme foundation

- **T4** Theme tokens, `ThemeProvider`, `ThemeToggle`
- **T5** Layout primitives: `Container`, `Section`, `Header`, `Footer`

**Checkpoint B** — sample page shell renders on both targets; overriding CSS vars restyles it; dark mode toggles with no flash.

### Phase 3: Content components

- **T6** `Hero` + `CTA`
- **T7** `Card` + `FeatureGrid`

**Checkpoint C** — sample page visually complete except form and consent banner.

### Phase 4: Behavior — the parts that can actually be wrong

TDD, failing test first. This is where the coverage floor is earned.

- **T8** Consent module + `CookieBanner`
- **T9** Analytics: `gtag`, `track`, queue/flush, `<GoogleAnalytics>`
- **T10** `validate.ts` (zod) + `honeypot.ts`
- **T11** `ContactForm` + `useFormPost` → Web3Forms

**Checkpoint D** — coverage ≥80%; a test proves no beacon fires before consent; form round-trips.

### Phase 5: SEO and security

- **T12** `metadata.ts` + `jsonld.tsx`
- **T13** `sitemap.ts` + robots, static-export-safe
- **T14** `securityHeaders()` in both shapes, wired into `defineNextConfig`

**Checkpoint E** — Vercel deploy scores A on securityheaders.com; Rich Results test passes; `/sitemap.xml` and `/robots.txt` present in the static export.

### Phase 6: Ship

- **T15** `docs/CONSUMING.md` + `docs/THEMING.md`
- **T16** Tag `v0.1.0`, push both repos, deploy both targets

**Checkpoint F** — every success criterion in the spec is checked off.

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Tailwind v4 does not pick up class names inside `node_modules/@aldoadi/website-template` | **High** — every component renders unstyled | Test in T2, before any component exists. Fix is `@source "../node_modules/@aldoadi/website-template/src"` in the site's CSS; if that fails, the library ships pre-compiled CSS and components stop using utility classes. Decide at Checkpoint A. |
| Shipping raw TS breaks under `next build` (type resolution, `.tsx` inside `node_modules`) | **High** — forces a build pipeline | T2 proves or kills it. Fallback: add `tsup`, commit `dist/`, revise spec assumption 3. |
| `npm i github:...` re-resolves per install, weak integrity guarantees | Medium | Always pin a tag, never a branch. Commit `package-lock.json` in every site. |
| GitHub Pages `basePath` breaks asset URLs, internal links, or the form POST | Medium | T3 serves a real static build (`npx serve out`) and checks asset paths, not just a green `next build`. |
| `next-themes` flashes the wrong theme on static-export first paint | Medium | T4 acceptance includes a throttled hard-reload check, not just "it toggles". |
| TypeScript 7 tempts a mid-build upgrade | Low | Pinned `~6.0.3`. Do not bump until `typescript-eslint` supports it. |
| Web3Forms free tier changes or rate-limits | Low | `ContactForm` takes `endpoint` as a prop — swapping providers is a props change. |
| Sample page grows into a real site and drags scope | Medium | The page's component list is closed in the spec. New components need a spec edit first. |

---

## Definition of Done (every task)

- `npm run verify` passes: typecheck, lint, ≥80% line and branch coverage
- The change builds under **both** `next build` and `DEPLOY_TARGET=github-pages next build`
- No hardcoded colors, fonts, or brand strings in components
- New public exports added to `src/index.ts` and the `exports` map
- Nothing added to runtime `dependencies` without asking first

---

## Resolved

1. **T3 verification** — local only (`npx serve out`). First real GitHub Pages deploy happens at Checkpoint B.
2. **Web3Forms key** — created at T11, not before. Endpoint stubbed until then.
3. **Starter location** — sibling directory `../Website-template-starter`, its own git repo, remote wired later.

## Blocked on authorization

**T2 as written needs a push.** `npm i github:AldoAdi/Website-template-lib#<sha>` only resolves against the remote, and the remote is empty. Two ways through:

- **Local proof first (chosen).** T2 verifies with `npm pack` + installing the resulting tarball. That exercises the real `files`/`exports` resolution, `transpilePackages`, and Tailwind `@source` scanning — everything except git-URL fetching itself.
- **Real git-URL install** is then a one-command confirmation at Checkpoint A, once the first push is authorized.

Nothing gets pushed to GitHub without asking. Local commits only until then.
