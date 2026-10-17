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


## 2026-10-12 9:12 AM EDT — Codex

### What it did

- Inspected the authenticated Vercel preview build log.
- Removed the stale `scrollRatios` destructuring from `HeatmapCanvas` after the scroll heatmap
  was changed to consume projected visible points.

### Database changes

- None.

### Other relevant changes

- Vercel confirmed that the optimized production bundle compiled successfully; the prior preview
  stopped only at this TypeScript error. A new preview check was triggered by this push.
- No migrations were applied.
- No merge or production deployment was performed.


## 2026-10-12 9:31 AM EDT — Codex

### What it did

- Corrected two PostgreSQL function delimiters caught during the final migration audit.
- Made class and result reordering safe under the existing unique position indexes, deletes stale blank result rows before upserts, rejects incomplete/stale payloads, and allows a racer identity to be explicitly unlinked.
- Backfills additive class catalog/rule/fee snapshot columns for existing race classes without changing legacy business columns.
- Advances race revisions and immutable published snapshots when class membership or scoring display changes; class display changes now use an optimistic, admin-checked RPC.
- Captures clicks immediately so navigation clicks are not lost while retaining delayed probable-dead-click classification.
- Uses the exact newest recorded viewport width for spatial replay and avoids mixing device layouts in the optional All Traffic overlay.

### Database changes

- Updated the unexecuted migration `supabase/migrations/202610120001_race_operations.sql` only.
- No migration was applied and no production data or schema was changed.

### Other relevant changes

- A read-only production schema metadata check confirmed the existing race/class/result/catalog columns, UUID keys, unique order indexes, and `is_current_race_admin()` helper expected by the migration.
- The preceding branch preview completed a successful Vercel production build and targeted public/privacy/admin-gate smoke checks. This push triggers a fresh preview build for the fixes above.
- Local lint and Node tests still could not start because the workspace command runner fails before PowerShell launches; they are not claimed as passed.
- No merge or production deployment was performed.


## 2026-10-12 9:36 AM EDT — Codex

### What it did

- Recorded final verification for the combined race-operations and first-party heatmap branch.

### Database changes

- None. Both additive migration files remain unapplied.

### Other relevant changes

- Commit `cdab3d5a7b7b7f029243b4a1458b8741511e4e88` passed both connected Vercel preview production builds.
- Smoke-tested the updated branch homepage, event/class/results/privacy pages, a published race results page, the new live pit display, and admin authentication gate.
- Confirmed no first-party analytics ingestion request appeared on admin, contact, gallery, privacy, account, or checkout routes in the browser smoke pass.
- Checked mobile, tablet, and laptop layouts for the privacy/admin-gate views; the pre-existing homepage animation/container produces a minor roughly 8px mobile horizontal overflow that is outside these features and was not changed.
- Local ESLint and Node tests could not be executed because the workspace command runner still fails before starting PowerShell. The passing Next.js production build includes TypeScript validation, but no lint or unit-test pass is claimed.
- No merge, production deployment, or live database migration was performed.

## 2026-10-12 6:42 PM EDT — Codex

### What it did

- Applied the isolated first-party heatmap analytics schema to the production LDMB Supabase project `shxpqufymaxwvwamlmmz`.
- Verified the created tables, row-level security, admin read policies, service-role write access, indexes, foreign keys, constraints, and retention function.
- Added a follow-up migration that removes Supabase's automatic anonymous EXECUTE grant from the analytics-retention RPC.

### Database changes

- Applied Supabase migration `20261012224007_first_party_heatmaps`, corresponding to `supabase/migrations/202610120002_first_party_heatmaps.sql`.
- Created `web_analytics_site_versions`, `web_analytics_sessions`, `web_analytics_pageviews`, `web_analytics_interactions`, `web_analytics_section_views`, and `web_analytics_attention_cells`.
- Enabled RLS on all six tables; anonymous table access is denied, authenticated reads are limited by the existing `is_current_race_admin()` policy, and server-side writes use `service_role`.
- Created the analytics filter/lookup indexes and `purge_expired_web_analytics(integer)` retention function.
- Applied Supabase migration `20261012224209_lock_down_heatmap_retention_rpc`.
- Added `supabase/migrations/202610120003_lock_down_heatmap_retention_rpc.sql` to source control. The RPC is executable by authenticated users only and still enforces `is_current_race_admin()` internally; anonymous execution is denied.
- The separate race-operations migration `202610120001_race_operations.sql` was not applied.

### Other relevant changes

- The user added `SUPABASE_SERVICE_ROLE_KEY` to local `.env.local`; its value was not read, printed, or committed.
- Post-migration catalog checks confirmed all six analytics tables exist with RLS enabled and zero initial rows.
- Supabase security-advisor verification confirmed the anonymous SECURITY DEFINER warning introduced by the initial grant is resolved. The remaining signed-in warning is expected because the RPC is deliberately exposed to authenticated race admins and performs its own admin check.
- No application deployment, branch merge, or production-code release was performed.

## 2026-10-12 6:43 PM EDT — Codex

### What it did

- Aligned the heatmap migration filenames in source control with the exact migration versions recorded by the LDMB Supabase project.

### Database changes

- None additional in this commit.
- Renamed the source migration files to `20261012224007_first_party_heatmaps.sql` and `20261012224209_lock_down_heatmap_retention_rpc.sql` so future migration tooling recognizes the already-applied production versions instead of replaying them.

### Other relevant changes

- No application code changed.
- No merge or production application deployment was performed.

## 2026-10-12 7:34 PM EDT — Codex

### What it did

- Adapted race-results' individual race contestant registration workflow for LDMB's single permanent track.
- Added a private Contestant Registration admin page with race/class selection, optional verified-racer linking, automatic next running order, roster editing, scored-entry protection, and direct handoff to pass entry.
- Added results QR controls to Race Nights and the public spectator results page.
- The QR image uses `utm_source=local&utm_medium=screen&utm_campaign=results`; the visible and printable text link deliberately contains no campaign parameters.
- Added an in-dashboard explanation of racer identity linking.

### Database changes

- Re-applied the idempotent race-operations migration through the migration API so the manually-created schema is now recorded as `20261012232859_race_operations`.
- Renamed its source file to `supabase/migrations/20261012232859_race_operations.sql` to match production history.
- Applied `20261012233100_contestant_registration` and added `supabase/migrations/20261012233100_contestant_registration.sql`.
- Added the partial unique index `results_class_racer_unique` to prevent one verified racer identity from being registered twice in the same class.
- Added admin-checked RPCs `register_race_contestant`, `update_race_contestant`, and `remove_race_contestant`.
- Registration reuses LDMB's existing `results` roster: new contestants are saved as name/class/order rows with blank passes, so no series, championship, tenant, or SaaS tables were introduced.
- Removed anonymous EXECUTE grants from the prior race-operation RPCs and the new registration RPCs. Authenticated calls remain guarded by `is_current_race_admin()`.
- Existing race, class, result, and racer data was preserved.

### Other relevant changes

- Added `qrcode@1.5.4` and `@types/qrcode@1.5.5` for in-browser, first-party QR image generation.
- Added a focused test for tracked-versus-clean results URLs.
- Local lint and tests were not run because the workspace command runner still fails before PowerShell starts. Connected preview build verification is pending for this push.
- No merge or production application deployment was performed. The database migrations were applied to the LDMB Supabase project `shxpqufymaxwvwamlmmz`.

## 2026-10-12 7:36 PM EDT — Codex

### What it did

- Recorded verification for contestant registration, racer-link guidance, and results QR controls.

### Database changes

- None additional in this verification commit.

### Other relevant changes

- Vercel project `ldmb` completed a successful Preview production build for commit `04982a25adb3ad7a0bd1e7f83dacec37de2b80b2`; the build includes Next.js compilation and TypeScript validation.
- The duplicate `ldmb2` Vercel project reported `Deployment was blocked`; the active `ldmb` preview built successfully and is Ready.
- Smoke-tested the preview's public September results page. The Results QR button opened a generated QR image and displayed the clean, campaign-free typed URL beneath it.
- Confirmed the preview admin navigation contains Contestant Registration and that the route remains protected by the existing admin authentication gate.
- A live add/edit/remove contestant mutation was not performed because the preview domain did not have an authenticated admin session; no production result rows were created or modified during testing.
- Local lint and Node tests remain unrun because the workspace command runner still fails before PowerShell starts.
- No merge or production application deployment was performed.

## 2026-10-12 8:14 PM EDT — Codex (GPT-5)

### What it did

- Reworked the Racer History admin page into separate **Historic Estimated Matches** and **Linked Racers** tabs.
- Added a review-before-link workflow that exposes the exact historic result entries behind each fuzzy estimate. Admins can uncheck races that belong to another person before creating or selecting a racer identity.
- Changed the estimated list to contain only unlinked results. After entries for a short name such as “Rhett” are linked, unchecked entries such as “Rhett Hinkle” remain unlinked and reappear as a separate estimated identity.
- Added linked-racer management for viewing exact race/class/name associations, renaming identities, adding identities, unlinking incorrectly matched races, and deleting identities.
- Added focused history tests covering exact result IDs, namesake separation, and linked classes that are intentionally excluded from driver estimates.

### Database changes

- Added migration `supabase/migrations/20261013001224_racer_identity_link_management.sql`.
- Added admin-only functions `create_racer_identity`, `link_race_results_to_racer`, `save_racer_identity`, and `delete_racer_identity`.
- All four functions require the existing race-admin check, use fixed search paths, deny anonymous execution, and grant execution only to authenticated users.
- Link/unlink operations advance affected race revisions and snapshots through the existing `_advance_race_revision` helper.
- Identity deletion explicitly clears `results.racer_id` and then deletes only the `racers` row. None of these functions contain or perform a result-row deletion.
- Applied the migration to Supabase project `shxpqufymaxwvwamlmmz`.
- Verified after migration: all 596 existing result rows remain present, all remain unlinked, no racer identity rows were added, and the new function ACLs exclude anonymous users.

### Other relevant changes

- Updated generated application database types for the four racer identity RPCs.
- No package or environment-variable changes.
- The local command runner remained unavailable with `helper_unknown_error: setup refresh had errors`; local lint, tests, and production build could not be run before this push. The pushed preview build will be checked separately.
- Branch remains `feature/race-ops-first-party-heatmaps`; not merged and not manually deployed to production.

## 2026-10-12 8:17 PM EDT — Codex (GPT-5)

### What it did

- Recorded post-push verification for the historic racer linking work.

### Database changes

- None in this verification push.
- Transactionally exercised the complete identity lifecycle against an existing result row: create-and-link, rename-and-unlink, relink, and delete identity. The transaction was rolled back after every preservation assertion passed.
- Rechecked persistent state after rollback: 596 result rows, 0 racer identities, and 0 linked results.
- Supabase advisors reported no missing-search-path issue on the new functions. The advisor flags authenticated SECURITY DEFINER functions by design; these RPCs are intentionally reachable by signed-in users but independently reject anyone who is not in the existing race-admin allowlist.

### Other relevant changes

- Vercel project `ldmb` completed the feature-branch production build successfully for commit `0e6ac720f03ca850dbf037b8223ba9410b0a9646`.
- The duplicate Vercel project `ldmb2` again reported “Deployment was blocked”; no build error was reported by the active `ldmb` project.
- Local automated tests remain unrun because the local command runner is unavailable; focused tests are committed for the next working local/CI runner.
- Branch remains unmerged and no manual production deployment was performed.

## 2026-10-12 8:35 PM EDT — Codex (GPT-5)

### What it did

- Closed the current LDMB work session and recorded the branch handoff.
- All combined work remains on `feature/race-ops-first-party-heatmaps`. The branch contains:
  - additive single-track race-management improvements while preserving LDMB's existing scoring methods;
  - first-party heatmap analytics and the private Heatmaps dashboard;
  - contestant registration using the existing results roster;
  - spectator/admin results QR controls with campaign-tagged QR destinations and clean typed links;
  - verified racer identities, reviewable historic matching, namesake separation, and linked-racer management.
- The intentionally excluded work remains excluded: offline scoring, multi-employee/staff roles, alternate scoring methods, series/championship logic, and SaaS/customer/billing infrastructure.

### Database changes

- None in this documentation-only push.
- Applied migration history for this branch in Supabase project `shxpqufymaxwvwamlmmz`:
  - `20261012224007_first_party_heatmaps`
  - `20261012224209_lock_down_heatmap_retention_rpc`
  - `20261012232859_race_operations`
  - `20261012233100_contestant_registration`
  - `20261013001224_racer_identity_link_management`
- Matching migration files are committed in `supabase/migrations/`; future agents should not manually replay or rename these already-recorded migrations.
- Existing race/result data was preserved. Racer identity deletion and unlinking preserve every result row and all pass/scoring fields.

### Other relevant changes

- Current pre-handoff branch head: `d3e64fcc8d30cb808af4b167838e152503e1d5a6`.
- The active Vercel `ldmb` feature-branch build passed; the duplicate `ldmb2` Vercel project reports blocked deployments and is not the active verification target.
- The required server-only `SUPABASE_SERVICE_ROLE_KEY` was added by the user to local `.env.local`; no secret value was read, logged, or committed.
- Local lint and Node tests remain unrun because the workspace command runner fails before PowerShell starts. Connected Next.js/Vercel production compilation and TypeScript validation passed, and database lifecycle verification passed in a rolled-back transaction.
- Work is paused at the user's request. The branch is pushed and intentionally remains unmerged; no manual production website deployment was performed.

## 2026-10-16 9:51 PM EDT — Antigravity (Gemini 4 Argon)

### What it did

- Verified that the first-party heatmap collector (`src/components/FirstPartyAnalytics.tsx`) and privacy policy (`src/app/privacy/page.tsx`) operate automatically without any consent/permission popup.
- Installed dependencies (`npm ci`), ran all unit tests (`npm test`, 19/19 passed), and verified a clean local production build (`npm run build`) including Next.js compilation and TypeScript type checking.
- Fast-forward merged `feature/race-ops-first-party-heatmaps` into `main` and pushed `main` to `origin/main`.

### Database changes

- None. (The five migrations on `feature/race-ops-first-party-heatmaps` were already applied to Supabase project `shxpqufymaxwvwamlmmz` on 2026-10-12.)

### Other relevant changes

- `npm test`: 19/19 tests passed.
- `npm run build`: Next.js 16.3.6 production build and TypeScript check passed cleanly across all 27 static/dynamic routes.
- `npm run lint`: Ran ESLint; pre-existing React 19 hook/any lint rules across admin/component files were noted and left untouched to avoid unrelated scope expansion.
- Confirmed `.env.local` remains gitignored and uncommitted.
- Pushing `main` triggers the connected Vercel production deployment for `ldmb`.


## 2026-10-17 12:05 PM EDT — Antigravity (Gemini 3.8 Flash)

### What it did

- Added instant auto-save on blur (`onBlur`) to the live results pass editor in `src/app/admin/results/page.tsx`.
- Editing a racer name, pass 1 (`first_half`), pass 2 (`second_half`), or selecting a linked identity now immediately validates, recalculates `fastest` and `consistency`, and upserts directly to `public.results` in Supabase when navigating away or pressing Tab.
- Because `public.results` is listened to by Supabase Realtime, pass entries immediately propagate to spectator live views (`/race-results/[raceId]` and `/race-results/[raceId]/pit`) without needing manual intervention or full page reload.
- Blank rows that previously had persisted results are safely cleaned up/deleted from `public.results` on blur.
- Added auto-save on blur/change for class names and class scoring modes (`display_mode`).
- Added a live auto-save visual indicator (`⚡ Saved pass for [Driver]`) and saving row indicator in the dashboard header.
- Retained the existing `Save All` button and `Ctrl+S` shortcut as a safe manual backup.

### Database changes

- None. Direct row upsert and delete operations utilize existing RLS policies (`Race admins can update results`, `Race admins can insert results`, `Race admins can delete results`).

### Other relevant changes

- Verified all 19 unit tests pass (`npm test`).
- Verified clean production build (`npm run build`) with zero TypeScript errors across all 27 routes.
- Branch: `fix/results-auto-save-on-blur`.
