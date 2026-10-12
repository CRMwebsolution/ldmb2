# Agent Updates

## 2026-10-12 9:00 AM EDT — Codex

### What it did

- Added the approved single-track race-management improvements on
  `feature/race-ops-first-party-heatmaps`: transactional race creation/class selection/results
  saving/publication, optimistic revision conflict protection, immutable official-result
  snapshots, guarded deletion, class configuration snapshots, safe CSV export, explicit racer
  identities, Supabase Realtime result refresh, and a public pit display.
- Preserved Little Doo's existing `fastest`, `consistency`, and `both` scoring modes.
  No offline scoring, staff-role system, series/championship logic, SaaS tenancy, onboarding,
  subscriptions, or billing features were added.
- Added a first-party, batched behavioral analytics collector with strict route allowlisting,
  sampled movement, clicks/dead clicks, scroll/attention/section measurements, responsive
  coordinate metadata, site/layout versions, and failure isolation.
- Added the private admin Heatmaps workspace with click, movement, scroll, and attention modes;
  Gaussian-smoothed intensity rendering; device/page/date/version filters; synchronized
  same-origin iframe preview; element/section overlays; dead-click and section summaries; and
  PNG export.
- Added a privacy policy and footer link. No analytics consent popup was added.

### Database changes

- Added `supabase/migrations/202610120001_race_operations.sql`.
  - Adds revision columns to `races`.
  - Adds per-race catalog/rules/fee/scoring snapshots to `classes`.
  - Adds optional stable `racer_id` and `updated_at` fields to `results`.
  - Adds `racers` and immutable `race_result_versions` tables, indexes, foreign keys, RLS,
    and admin policies.
  - Adds admin-checked transactional RPCs for race creation, class assignment, catalog-class
    creation, atomic result saving, publication snapshots, and guarded deletion.
  - Adds existing race tables to the Supabase Realtime publication only when missing.
- Added `supabase/migrations/202610120002_first_party_heatmaps.sql`.
  - Adds isolated site-version, session, pageview, interaction, section-view, and attention-cell
    tables with constraints and purpose-built indexes.
  - Enables RLS, revokes anonymous table access, grants admin-only reads, and reserves writes
    for the server-side service role.
  - Adds an admin-only 120-day retention purge function.
- These migrations were committed for review but were not applied to the live database.

### Other relevant changes

- New server-only requirement: `SUPABASE_SERVICE_ROLE_KEY`.
- New version/origin configuration is documented in `.env.example` and
  `docs/FIRST_PARTY_ANALYTICS.md`.
- Heatmap tracking fails closed on admin, API, contact, gallery/upload, privacy, booking,
  checkout, payment, login, account, contract, customer, order, rental, registration, profile,
  and unknown routes. Signed-in users and iframe previews are also excluded.
- The heatmap collector never registers keyboard/input/change listeners and never sends form
  values or arbitrary page text.
- Added focused tests for route exclusions, device classes, CSV formula neutralization, and
  invalid zero/negative passes.
- Verification status at this push: source was statically reviewed, but local lint, test, and
  production build could not be executed because the workspace command runner failed before
  starting PowerShell. No check is claimed as passed.
- No merge or production deployment was performed.


## 2026-10-12 9:06 AM EDT — Codex

### What it did

- Corrected the Heatmaps admin shell so the standard management sidebar cannot reappear at
  desktop breakpoints and squeeze the three-column analytics workspace.
- Changed the CSV utility's runtime scoring import to a relative TypeScript import so the
  repository's Node test runner can resolve it.

### Database changes

- None.

### Other relevant changes

- The initial Vercel preview checks failed. The connected build-log page requires a separate
  GitHub/Vercel login, and the local command runner still cannot start PowerShell, so no successful
  build is claimed in this entry.
- No migrations were applied.
- No merge or production deployment was performed.
